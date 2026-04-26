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
- How is readiness different from liveness?
- What log/metric proves the path works in production?
