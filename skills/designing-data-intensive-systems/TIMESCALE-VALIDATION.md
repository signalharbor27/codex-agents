# Queries for validating a Timescale migration

These examples target a single-node TimescaleDB 2.18+ hypertable, `public.metrics`, with `time`, `entity_id`, and `value` columns. Substitute the real schema and columns. Confirm the installed extension version and API signatures first. Integer time dimensions need their integer range fields and workload-specific time units.

Record the workload, baseline latency, storage, ingestion rate, and acceptable regression limits before evaluating changes. For a migration, reconcile row counts over the same snapshot or bounded watermark, check application results, and verify the rollback plan. Storage and query plans alone do not prove data preservation.

## Analyze chunks

Chunk metadata has ranges and compression status. Use size functions for bytes and columnstore statistics for recorded conversion savings:

```sql
SELECT
    c.chunk_schema,
    c.chunk_name,
    c.range_start,
    c.range_end,
    c.is_compressed,
    pg_size_pretty(d.total_bytes) AS current_size,
    pg_size_pretty(s.after_compression_total_bytes) AS recorded_columnstore_size,
    ROUND(100 * (1 - s.after_compression_total_bytes::numeric /
        NULLIF(s.before_compression_total_bytes, 0)), 1) AS recorded_savings_pct
FROM timescaledb_information.chunks AS c
LEFT JOIN chunks_detailed_size('public.metrics') AS d
    USING (chunk_schema, chunk_name)
LEFT JOIN chunk_columnstore_stats('public.metrics') AS s
    USING (chunk_schema, chunk_name)
WHERE c.hypertable_schema = 'public' AND c.hypertable_name = 'metrics'
ORDER BY c.range_start DESC;
```

Columnstore statistics record sizes at conversion and can be stale after later writes. Unconverted chunks have null conversion sizes; zero-byte baselines have no savings percentage. Use current size measurements for current disk use.

Compare chunks with similar duration, data volume, and conversion state. Set conversion age from the write and late-arrival window. A 2x size range or 90% compression saving can be a local target, but neither is a universal pass criterion.

## Test query performance

`EXPLAIN ANALYZE` executes the query. Run representative reads within the authorized validation environment, with comparable data and cache conditions.

### Time range: inspect chunk exclusion

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*), AVG(value) FROM public.metrics
WHERE time >= NOW() - INTERVAL '1 day';
```

### Entity and time: inspect segmentation

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM public.metrics
WHERE entity_id = 'X' AND time >= NOW() - INTERVAL '1 week';
```

### Aggregation: inspect columnstore access

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT DATE_TRUNC('hour', time), entity_id, COUNT(*), AVG(value)
FROM public.metrics WHERE time >= NOW() - INTERVAL '1 month'
GROUP BY 1, 2;
```

Compare elapsed time, buffers, scanned chunks, and row estimates with the baseline. Plan node names vary by version and storage path. Chunk exclusion is useful when predicates exclude ranges; a sequential scan can be appropriate for a small chunk or a broad aggregation. Investigate unexpected work against the query's selectivity and latency target.

## Measure storage

```sql
SELECT pg_size_pretty(total_bytes) AS current_total
FROM hypertable_detailed_size('public.metrics');

SELECT
    total_chunks,
    number_compressed_chunks,
    pg_size_pretty(before_compression_total_bytes) AS recorded_before,
    pg_size_pretty(after_compression_total_bytes) AS recorded_after,
    ROUND(100 * (1 - after_compression_total_bytes::numeric /
        NULLIF(before_compression_total_bytes, 0)), 1) AS recorded_savings_pct
FROM hypertable_columnstore_stats('public.metrics');
```

The first query measures current disk use. The second reports recorded conversion statistics, so its before/after sizes are not the current total for the whole hypertable.

## Diagnose problems

### Poor chunk exclusion

Check that time predicates constrain the partition column and that the requested range can exclude chunks. Inspect casts, functions, and parameter behavior in the actual plan.

### Poor compression

Measure rows per candidate segment within representative chunk boundaries:

```sql
SELECT entity_id, COUNT(*) AS rows_per_segment
FROM public.metrics
WHERE time >= TIMESTAMPTZ '2026-01-01 00:00:00+00'
  AND time < TIMESTAMPTZ '2026-01-02 00:00:00+00'
GROUP BY entity_id ORDER BY rows_per_segment;
```

Replace these illustrative bounds with an actual chunk range. Sparse segments can reduce compression, while useful segment filters can improve queries. Compare compression and latency together; fewer than 20 rows per segment is not a universal rejection rule.

### Poor insert performance

Inspect indexes on the hypertable's chunks:

```sql
SELECT i.schemaname, i.relname, i.indexrelname, i.idx_scan
FROM pg_stat_user_indexes AS i
JOIN timescaledb_information.chunks AS c
    ON c.chunk_schema = i.schemaname AND c.chunk_name = i.relname
WHERE c.hypertable_schema = 'public' AND c.hypertable_name = 'metrics'
ORDER BY i.idx_scan;
```

Low `idx_scan` is a lead for investigation. Check the observation window, statistics resets, constraints, and infrequent queries before recommending removal.

## Monitor the system

This read-only query counts chunks and their compression status. Size collection is separate because it can be expensive across many chunks.

```sql
SELECT
    h.hypertable_schema,
    h.hypertable_name,
    COUNT(c.chunk_name) AS total_chunks,
    COUNT(c.chunk_name) FILTER (WHERE c.is_compressed) AS compressed_chunks
FROM timescaledb_information.hypertables AS h
LEFT JOIN timescaledb_information.chunks AS c
    ON h.hypertable_schema = c.hypertable_schema
    AND h.hypertable_name = c.hypertable_name
GROUP BY h.hypertable_schema, h.hypertable_name;
```

## Official references

- [Chunk metadata](https://docs.tigerdata.com/api/latest/informational-views/chunks/)
- [Current chunk sizes](https://docs.tigerdata.com/api/latest/hypertable/chunks_detailed_size/) and [hypertable sizes](https://docs.tigerdata.com/api/latest/hypertable/hypertable_detailed_size/)
- [Chunk conversion statistics](https://docs.tigerdata.com/api/latest/hypercore/chunk_columnstore_stats/) and [hypertable conversion statistics](https://docs.tigerdata.com/api/latest/hypercore/hypertable_columnstore_stats/)
- [Postgres index statistics](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-ALL-INDEXES-VIEW)
