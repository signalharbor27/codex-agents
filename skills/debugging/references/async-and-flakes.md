# Async and flakes

Load this when timing, polling, concurrency, ordering, or intermittent reproduction dominates.

## Raise the signal

- Repeat with a recorded seed, input, environment, and concurrency.
- Capture timestamps and stable correlation IDs at the smallest relevant boundaries.
- Vary one pressure at a time: scheduling, latency, clock, worker count, resource limit, or dependency response.
- Compare distributions and failure rates, not one passing rerun.

## Wait for conditions

Replace arbitrary sleeps with polling or event synchronization on the actual postcondition. Use a bounded deadline, preserve the last observed state in the failure, and fail immediately on terminal error states.

An arbitrary delay is valid only when elapsed time itself is the behavior under test. Increasing timeouts without identifying the awaited condition is mitigation, not diagnosis.

## Concurrency

Identify the shared state, actors, legal transitions, and synchronization or ownership mechanism. Reproduce with a deterministic barrier or stress loop where practical. A “race condition” claim is incomplete until the conflicting operations and invalid interleaving are shown.

Source basis: Google testing guidance on flaky tests and synchronization, plus the scientific debugging method in Zeller’s *Why Programs Fail*.
