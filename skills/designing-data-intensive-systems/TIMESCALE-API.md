# TimescaleDB API reference

## Check the extension version

```sql
SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';
```

The columnstore APIs below were introduced in TimescaleDB 2.18. Check the installed release's documentation before changing SQL. Earlier versions use the compression APIs; an API migration can change statement kind, arguments, and result columns.

Keep applied migration files immutable. Put changes in a new migration, preserve the repository's local migration protections, and verify application behavior and rollback before rollout.

## Settings

For `ALTER TABLE`, the columnstore names corresponding to the older compression settings are:

- `timescaledb.compress`: `timescaledb.enable_columnstore`
- `timescaledb.compress_segmentby`: `timescaledb.segmentby`
- `timescaledb.compress_orderby`: `timescaledb.orderby`

Choose segmentation and ordering from filters, data distribution, and measured query performance. Changing settings does not rewrite chunks already in the columnstore; inspect chunk settings when evaluating a change.

## Procedures and functions

The policy and conversion replacements are procedures, called with `CALL`:

- `add_compression_policy(...)`: `CALL add_columnstore_policy(...)`. The age argument is named `after`, or use `created_before` for chunk creation age; these arguments are mutually exclusive.
- `remove_compression_policy(...)`: `CALL remove_columnstore_policy(...)`.
- `compress_chunk(...)`: `CALL convert_to_columnstore(...)`.
- `decompress_chunk(...)`: `CALL convert_to_rowstore(...)`.

Example for an approved migration where a seven-day conversion age fits the write and late-arrival workload:

```sql
CALL add_columnstore_policy('public.metrics', after => INTERVAL '7 days');
```

Statistics remain functions used with `SELECT`:

- `hypertable_compression_stats(...)`: `hypertable_columnstore_stats(...)`.
- `chunk_compression_stats(...)`: `chunk_columnstore_stats(...)`.

Their output still uses names such as `before_compression_total_bytes` and `after_compression_total_bytes`. Do not rename result fields by analogy with function names.

## Settings views

Use these views under `timescaledb_information`:

- `hypertable_columnstore_settings` for hypertable settings; replaces `hypertable_compression_settings`.
- `chunk_columnstore_settings` for settings of converted chunks; replaces `chunk_compression_settings`.

The older `compression_settings` view has a different per-column shape. Migrate its queries to the appropriate hypertable or chunk settings view; there is no documented `columnstore_settings` view.

## Official references

- [ALTER TABLE settings](https://docs.tigerdata.com/api/latest/hypercore/alter_table/)
- [Add policy](https://docs.tigerdata.com/api/latest/hypercore/add_columnstore_policy/) and [remove policy](https://docs.tigerdata.com/api/latest/hypercore/remove_columnstore_policy/)
- [Convert to columnstore](https://docs.tigerdata.com/api/latest/hypercore/convert_to_columnstore/) and [rowstore](https://docs.tigerdata.com/api/latest/hypercore/convert_to_rowstore/)
- [Hypertable settings](https://docs.tigerdata.com/api/latest/hypercore/hypertable_columnstore_settings/) and [chunk settings](https://docs.tigerdata.com/api/latest/hypercore/chunk_columnstore_settings/)
- [Hypertable statistics](https://docs.tigerdata.com/api/latest/hypercore/hypertable_columnstore_stats/) and [chunk statistics](https://docs.tigerdata.com/api/latest/hypercore/chunk_columnstore_stats/)
