Read this reference once an architecture question has narrowed to Postgres or Timescale details.

Follow these rules:
- Show that the workload fits before recommending Timescale.
- Treat hypertables, compression, retention, and continuous aggregates as choices, not defaults.
- Validate migrations with row-count checks and application behavior checks, and plan the rollback.
- Base Postgres table design on actual access patterns rather than generic normalization rules.
