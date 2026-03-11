Read this when the architecture question has narrowed into Postgres or Timescale specifics.

Rules:
- prove the workload before recommending Timescale
- do not assume hypertables, compression, retention, or continuous aggregates by default
- validate migrations with row-count checks, application-level behavior checks, and rollback planning
- keep Postgres table design tied to actual access patterns, not generic normalization dogma
