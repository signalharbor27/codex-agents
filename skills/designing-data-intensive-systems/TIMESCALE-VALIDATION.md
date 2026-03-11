# Migration Validation Queries

## Chunk Analysis
```sql
SELECT
    chunk_name,
    pg_size_pretty(total_bytes) as size,
    pg_size_pretty(compressed_total_bytes) as compressed,
    ROUND((total_bytes - compressed_total_bytes::numeric) / total_bytes * 100, 1) as compression_pct,
    range_start, range_end
FROM timescaledb_information.chunks
WHERE hypertable_name = 'your_table'
ORDER BY range_start DESC;
```

**Look for**: Consistent sizes (within 2x), compression >90%, recent chunks uncompressed.

## Query Performance Tests

### Time-Range (should show chunk exclusion)
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*), AVG(value) FROM your_table
WHERE timestamp >= NOW() - INTERVAL '1 day';
```

### Entity + Time (benefits from segment_by)
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM your_table
WHERE entity_id = 'X' AND timestamp >= NOW() - INTERVAL '1 week';
```

### Aggregation (benefits from columnstore)
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT DATE_TRUNC('hour', timestamp), entity_id, COUNT(*), AVG(value)
FROM your_table WHERE timestamp >= NOW() - INTERVAL '1 month'
GROUP BY 1, 2;
```

**Good signs**: "Chunks excluded during startup", "Custom Scan (ColumnarScan)", lower buffer reads.

**Bad signs**: "Seq Scan" on large chunks, no chunk exclusion.

## Storage Metrics
```sql
SELECT
    hypertable_name,
    pg_size_pretty(total_bytes) as total,
    pg_size_pretty(compressed_total_bytes) as compressed,
    ROUND(compressed_total_bytes::numeric / total_bytes * 100, 1) as compressed_pct,
    ROUND((uncompressed_total_bytes - compressed_total_bytes::numeric) / uncompressed_total_bytes * 100, 1) as ratio_pct
FROM timescaledb_information.hypertables
WHERE hypertable_name = 'your_table';
```

## Troubleshooting

### Poor Chunk Exclusion
Verify time predicates match partition column.

### Poor Compression
```sql
-- Check segment distribution
SELECT segment_by_col, COUNT(*) as rows
FROM _timescaledb_internal._hyper_X_Y_chunk  -- actual chunk name
GROUP BY 1 ORDER BY 2 DESC;
```

**<20 rows/segment** = poor segment_by choice.

### Poor Insert Performance
```sql
-- Find unused indexes
SELECT indexname, idx_scan FROM pg_stat_user_indexes
WHERE tablename LIKE '%your_table%' ORDER BY idx_scan;
```

Low `idx_scan` = candidate for dropping.

## Ongoing Monitoring
```sql
CREATE OR REPLACE VIEW hypertable_status AS
SELECT
    h.hypertable_name,
    COUNT(c.chunk_name) as total_chunks,
    COUNT(c.chunk_name) FILTER (WHERE c.compressed_total_bytes IS NOT NULL) as compressed_chunks,
    pg_size_pretty(SUM(c.total_bytes)) as total_size
FROM timescaledb_information.hypertables h
LEFT JOIN timescaledb_information.chunks c ON h.hypertable_name = c.hypertable_name
GROUP BY h.hypertable_name;
```
