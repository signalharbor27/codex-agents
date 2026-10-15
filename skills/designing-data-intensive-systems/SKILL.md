---
name: designing-data-intensive-systems
description: "Use when workload or failure requirements drive storage, time-series, retention, partitioning, replication, stream-processing, consistency, recovery, or Postgres/Timescale decisions."
---

# Designing data-intensive systems

## Overview

Apply these domain constraints within the primary engineering or review skill. Start with the workload and operational guarantees; load references for the current decision.

## When to Use

- Choose among database, log, cache, queue, search, and analytical roles.
- Compare batch, stream, and CDC designs.

## When Not to Use

- Ordinary implementation and refactoring: use `engineering`, which stays the primary skill.
- Architecture questions confined to a module: use `engineering` and read [../engineering/references/boundary-design.md](../engineering/references/boundary-design.md).

## Minimal Workflow

1. Describe the workload with concrete read, write, volume, latency, retention, ordering, and failure requirements where they apply. Done when each requirement that bears on the decision has a value or is marked unknown.
2. Name each system role: source of truth, derived view, cache, queue or log, index, analytical store, and recovery path. Done when every component in the design has one named role.
3. For an unresolved design decision, compare two or three viable options, including the simplest one, against the workload and correctness requirements. Keep a settled design unless new evidence invalidates it. Done when the recommendation names the chosen option, the tradeoff that decided it, and the evidence for that tradeoff.
4. Identify the benchmark, failure test, migration proof, or operational observation that would decide the remaining uncertainty. Done when each open uncertainty has one deciding check.
5. During implementation, apply these workload constraints within the primary `engineering` loop. Done when its verified completion criterion is met. Reuse proof that still covers the current code and relevant state.

## Reference Routing

- Read [FOUNDATIONS.md](FOUNDATIONS.md) when the decision turns on data models, storage engines, encoding and schema evolution, or reliability, scalability, and maintainability tradeoffs.
- Read [PARTITIONING.md](PARTITIONING.md) when shard-key choice, hot-spot risk, secondary indexes, routing, or rebalancing dominate the design.
- Read [REPLICATION.md](REPLICATION.md) when failover, replica lag, read scaling, write topology, conflict resolution, or consistency between copies is central.
- Read [TRANSACTIONS.md](TRANSACTIONS.md) when isolation anomalies, ACID semantics, deadlocks, serializability, or distributed transactions are in question.
- Read [STREAM.md](STREAM.md) when event flow, CDC, event sourcing, low-latency processing, or exactly-once and replay claims drive the design.
- Read [BATCH.md](BATCH.md) when bounded recomputation, offline pipelines, large joins, or the relative simplicity of batch processing drive the design.
- Read [DISTRIBUTED.md](DISTRIBUTED.md) when partial failures, clocks, coordination, consensus, or CAP-style tradeoffs dominate.
- Read [POSTGRES_TIMESCALE.md](POSTGRES_TIMESCALE.md) once the question moves from architecture to Postgres or Timescale details.
- Read [TIMESCALE-API.md](TIMESCALE-API.md) when choosing Timescale API names or planning an upgrade; check the installed extension version first.
- Read [TIMESCALE-VALIDATION.md](TIMESCALE-VALIDATION.md) when validating a Timescale migration, storage policy, or query plan.
- Read [GLOSSARY.md](GLOSSARY.md) when an unfamiliar data-system term blocks the current decision.

## Failure modes

- Recommending a data store from habit rather than workload evidence.
- Treating caches, indexes, and sources of truth as interchangeable.
- Advising a Timescale migration before showing that the workload fits.
