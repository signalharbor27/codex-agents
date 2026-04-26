---
name: designing-data-intensive-systems
description: Choose storage and distributed-system shapes from workload, consistency, and failure pressures. Use when data volume, retention, partitioning, replication, streaming, or recovery tradeoffs drive the design. Not for ordinary module-level implementation questions.
---

# Designing Data-Intensive Systems

## Overview

Use this skill when workload shape and operational guarantees drive the decision.
Keep the entrypoint focused on pressure; push detailed tactics into references.

## When to Use

- Choosing between database, log, cache, queue, search, or analytical roles
- Deciding consistency, partitioning, replication, or recovery tradeoffs
- Evaluating batch vs stream vs CDC shapes
- Planning Postgres or Timescale changes that depend on actual workload

## When Not to Use

- Use `writing-software` for ordinary implementation and refactoring questions
- Use `writing-software/INTERFACE-DESIGN.md` for module-local architecture debates
- Do not jump to Postgres or Timescale specifics before workload shape is clear

## Minimal Workflow

1. State the workload and correctness pressure.
2. Name the system roles involved.
3. Compare 2-3 viable shapes, including a simpler option.
4. State what should be benchmarked or tested next.
5. For implementation, hand back to `writing-software` when generic change shape matters, `testing-software` for proof choice, and `verification-before-completion` before claiming done.

## Reference Routing

- Read [FOUNDATIONS.md](FOUNDATIONS.md) for reliability, maintainability, and evolvability framing.
- Read [PARTITIONING.md](PARTITIONING.md), [REPLICATION.md](REPLICATION.md), [TRANSACTIONS.md](TRANSACTIONS.md), [STREAM.md](STREAM.md), [BATCH.md](BATCH.md), and [DISTRIBUTED.md](DISTRIBUTED.md) based on the active pressure.
- Read [POSTGRES_TIMESCALE.md](POSTGRES_TIMESCALE.md) when the question moves from architecture into Postgres or Timescale specifics.

## Failure Modes

- Recommending a data store by habit instead of workload
- Treating caches, indexes, and sources of truth as interchangeable
- Jumping into Timescale migration advice before proving the workload fits
