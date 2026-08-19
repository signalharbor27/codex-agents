---
name: designing-data-intensive-systems
description: "Use when workload and failure pressure make data/storage architecture central: time series, retention, partitioning, replication, streams, consistency, recovery, or Postgres/Timescale. Acts as an engineering or review modifier."
---

# Designing data-intensive systems

## Overview

Use this skill when workload shape and operational guarantees determine the design. Keep the entry point at that decision level; load a reference only for the pressure the task actually presents.

## When to Use

- Choose among database, log, cache, queue, search, and analytical roles.
- Decide tradeoffs in consistency, partitioning, replication, or recovery.
- Compare batch, stream, and CDC designs.
- Plan Postgres or Timescale changes based on the actual workload.

## When Not to Use

- Keep `engineering` as the primary skill for ordinary implementation and refactoring.
- Use `engineering/references/boundary-design.md` for architecture questions confined to a module.
- Establish the workload shape before considering Postgres or Timescale details.

## Minimal Workflow

1. Describe the workload with concrete read, write, volume, latency, retention, ordering, and failure requirements where they apply.
2. Name each system role: source of truth, derived view, cache, queue or log, index, analytical store, and recovery path.
3. Compare two or three viable designs, including the simplest one, against the stated workload and correctness requirements.
4. Identify the benchmark, failure test, migration proof, or operational observation that would decide the remaining uncertainty.
5. During implementation, apply these workload constraints within the primary `engineering` loop and stop only when that loop's fresh verification criterion is met.

## Reference Routing

- Read [FOUNDATIONS.md](FOUNDATIONS.md) to frame reliability, maintainability, and evolvability.
- Choose [PARTITIONING.md](PARTITIONING.md), [REPLICATION.md](REPLICATION.md), [TRANSACTIONS.md](TRANSACTIONS.md), [STREAM.md](STREAM.md), [BATCH.md](BATCH.md), or [DISTRIBUTED.md](DISTRIBUTED.md) according to the current design pressure.
- Read [POSTGRES_TIMESCALE.md](POSTGRES_TIMESCALE.md) once the question moves from architecture to Postgres or Timescale details.

## Failure modes

- Recommending a data store from habit rather than workload evidence.
- Treating caches, indexes, and sources of truth as interchangeable.
- Advising a Timescale migration before showing that the workload fits.
