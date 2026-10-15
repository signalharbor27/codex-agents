# State and effects

## Model the operation

Before editing, write the shortest useful state/effect map:

1. durable intent and its owner;
2. external or irreversible effect;
3. local state transition;
4. acknowledgement or user-visible result;
5. retry, reconciliation, and manual repair.

Name the stable identity or idempotency key, valid state transitions, and the postcondition that means complete. An accepted request or queued job is not proof of completion.

## Shared-state ownership

Before adding synchronization, ask whether concurrent actors publish independent facts that can have separate owners. Separate those writes when readers can safely combine them. Keep one atomic owner or transaction where correctness depends on a cross-field invariant or a consistent snapshot; separate files or records alone do not establish independence.

## Close failure windows

Consider only applicable windows:

- duplicate delivery, replay, or concurrent claims;
- timeout with unknown remote outcome;
- external success followed by local failure;
- local advance followed by external failure;
- worker crash or stale in-progress state;
- out-of-order events or mixed versions;
- missed webhook/event and later reconciliation.

Prefer database constraints, compare-and-swap transitions, leases, or provider idempotency over process-local checks. Bound retries and make terminal failure observable.

## Agent guardrails

- Use one transaction or synchronous call when it is sufficient; add queues, sagas, outboxes, or state machines only when it is not.
- Design idempotent effects and at-least-once handling where applicable; never claim exactly-once delivery.
- Report partial failure explicitly instead of behind a generic success response.
- Add logs/metrics only for states operators must distinguish or recover.

## Provenance

- Martin Kleppmann, *Designing Data-Intensive Applications*: consistency, concurrency, idempotence, and failure reasoning.
- Michael Nygard, *Release It!*: stability patterns and production failure modes.
- Google, *Site Reliability Engineering*: observable service behavior, bounded retries, and recovery.
- Gregor Hohpe and Bobby Woolf, *Enterprise Integration Patterns*: message identity, idempotent receivers, and durable integration flows.
