# State and Effects

Load this for money, durable state, external effects, webhooks, jobs, retries, concurrency, or recovery.

## Model the Operation

Before editing, write the shortest useful state/effect map:

1. durable intent and its owner;
2. external or irreversible effect;
3. local state transition;
4. acknowledgement or user-visible result;
5. retry, reconciliation, and manual repair.

Name the stable identity or idempotency key, valid state transitions, and the postcondition that means complete. An accepted request or queued job is not proof of completion.

## Close Failure Windows

Consider only applicable windows:

- duplicate delivery, replay, or concurrent claims;
- timeout with unknown remote outcome;
- external success followed by local failure;
- local advance followed by external failure;
- worker crash or stale in-progress state;
- out-of-order events or mixed versions;
- missed webhook/event and later reconciliation.

Prefer database constraints, compare-and-swap transitions, leases, or provider idempotency over process-local checks. Bound retries and make terminal failure observable.

## Agent Guardrails

- Do not add queues, sagas, outboxes, or state machines when one transaction or synchronous call is sufficient.
- Do not claim exactly-once delivery; design idempotent effects and at-least-once handling where applicable.
- Do not hide partial failure behind generic success responses.
- Add logs/metrics only for states operators must distinguish or recover.

## Source Basis

- Martin Kleppmann, *Designing Data-Intensive Applications*: consistency, concurrency, idempotence, and failure reasoning.
- Michael Nygard, *Release It!*: stability patterns and production failure modes.
- Google, *Site Reliability Engineering*: observable service behavior, bounded retries, and recovery.
- Gregor Hohpe and Bobby Woolf, *Enterprise Integration Patterns*: message identity, idempotent receivers, and durable integration flows.
