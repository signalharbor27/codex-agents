# Production Readiness

Read this when code crosses networks, queues, databases, schedulers, workers, or live user paths.

Source family: Michael Nygard, *Release It!*, plus SRE practices.

## Core Concepts

- Timeouts, retries, circuit breakers, bulkheads, backpressure
- Idempotency and replay safety
- Health checks and readiness semantics
- Observability: logs, metrics, traces, correlation IDs
- Graceful degradation and recovery paths

## Agentic Coding Use

- Prevents happy-path-only implementations.
- Makes live-smoke verification concrete instead of hand-wavy.
- Forces failure-mode thinking before shipping long-running workflows.

## Checklist

- What happens when the dependency is slow, down, or returns malformed data?
- Is retry safe and bounded?
- What durable intent exists before an external side effect starts?
- What idempotency key or natural key prevents duplicate work?
- What happens if the external side effect succeeds but local commit/logging/provisioning fails?
- What happens if local state advances but the external side effect fails or times out?
- Can two workers, webhooks, schedulers, or users process the same item at once? If yes, what claim, lease, lock, or compare-and-swap prevents damage?
- How is stale in-progress work detected and recovered?
- What reconciliation path repairs missed webhooks, dropped events, partial writes, or delayed provider state?
- What manual repair path exists when automation cannot safely continue?
- How is readiness different from liveness?
- What log/metric proves the path works in production?
- What log/metric/alert proves the path is stuck, retrying too much, or losing work?
