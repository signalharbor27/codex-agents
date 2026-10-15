# Postgres and Timescale rules

- Treat hypertables, compression, retention, and continuous aggregates as choices, not defaults.
- Validate migrations with row-count checks and application behavior checks, and plan the rollback.
- Base Postgres table design on actual access patterns rather than generic normalization rules.
