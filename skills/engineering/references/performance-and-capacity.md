# Performance and capacity

Load this for hot paths, latency comparisons or research, latency/throughput targets, resource limits, or capacity work.

## Latency comparisons

Before calculating, record the event IDs, source files or columns, start and end clock boundaries, units, sample window, formula, exclusions, and one worked row. Check that the samples measure the same interval and that their clocks are comparable. Match IDs when comparing the same events; report unmatched rows and sample sizes.

Keep ingress, persistence, server send, and customer receipt timestamps distinct. A persisted ingest metric establishes only its recorded boundary. Use the customer's retained receipt values when the question concerns their experience; inspect available retained data before proposing new instrumentation.

For example, an event received by a server at 12:00:00.120 and by a customer at 12:00:00.185 has 65 ms of server-to-customer latency if those clocks are comparable. A 20 ms ingest metric for that event measures a different interval. Subtracting a configured hold gives a counterfactual; label it separately from observed measurements. Keep millisecond differences visible when they affect the acceptance criterion.

## Measure before changing

1. State the user or system metric and acceptable budget.
2. Capture a repeatable baseline at representative input size and concurrency.
3. Locate the limiting resource or wait: CPU, allocation, lock, database, network, queue, or external dependency.
4. Change one cause.
5. Repeat the same measurement and check correctness.

Use profiles, query plans, tracing, counters, and load tests appropriate to the suspected boundary. Average latency alone is insufficient when tail latency, saturation, or queue growth matters.

## Sustained optimization

Before comparing small gains, check that the benchmark can detect a change large enough to matter to the stated budget. Compare a representative slow case with an easy control to show where the bottleneck appears. Keep workload definitions and measurement conditions fixed across candidates. Use a known perturbation where practical, and estimate run-to-run noise under the same workload and environment. If noise hides the target effect, improve the measurement before selecting a winner.

Across repeated attempts, keep a terse record of the bottleneck hypothesis, tested revision, workload, result, and reason for retaining or rejecting the change. Preserve rejected hypotheses with their evidence; revisit them only when new evidence or changed conditions justify it. Report inconclusive measurements as inconclusive.

## Decision rules

- Fix algorithms, query shape, round trips, and contention before micro-optimizing syntax.
- Bound work and memory with pagination, streaming, backpressure, admission control, or concurrency limits only where measurement shows need.
- Treat caches as state: define key, invalidation, consistency, size, and failure behavior.
- Include realistic data distributions and warm/cold behavior.
- Keep the simpler implementation unless the measured gain matters to the stated budget.

## Agent guardrails

Do not introduce caching, concurrency, batching, denormalization, or custom data structures from intuition alone. Do not benchmark a toy path that omits the real bottleneck. Record the command, dataset, environment, and before/after result.

## Source basis

- Brendan Gregg, *Systems Performance*: workload characterization, USE method, measurement, and profiling.
- Google, *Site Reliability Engineering*: service-level objectives, saturation, capacity, and load testing.
- Martin Kleppmann, *Designing Data-Intensive Applications*: storage/query tradeoffs and performance under scale.
