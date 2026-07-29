# Performance and Capacity

Load this for hot paths, latency/throughput targets, resource limits, or capacity work.

## Measure Before Changing

1. State the user or system metric and acceptable budget.
2. Capture a repeatable baseline at representative input size and concurrency.
3. Locate the limiting resource or wait: CPU, allocation, lock, database, network, queue, or external dependency.
4. Change one cause.
5. Repeat the same measurement and check correctness.

Use profiles, query plans, tracing, counters, and load tests appropriate to the suspected boundary. Average latency alone is insufficient when tail latency, saturation, or queue growth matters.

## Decision Rules

- Fix algorithms, query shape, round trips, and contention before micro-optimizing syntax.
- Bound work and memory with pagination, streaming, backpressure, admission control, or concurrency limits only where measurement shows need.
- Treat caches as state: define key, invalidation, consistency, size, and failure behavior.
- Include realistic data distributions and warm/cold behavior.
- Keep the simpler implementation unless the measured gain matters to the stated budget.

## Agent Guardrails

Do not introduce caching, concurrency, batching, denormalization, or custom data structures from intuition alone. Do not benchmark a toy path that omits the real bottleneck. Record the command, dataset, environment, and before/after result.

## Source Basis

- Brendan Gregg, *Systems Performance*: workload characterization, USE method, measurement, and profiling.
- Google, *Site Reliability Engineering*: service-level objectives, saturation, capacity, and load testing.
- Martin Kleppmann, *Designing Data-Intensive Applications*: storage/query tradeoffs and performance under scale.
