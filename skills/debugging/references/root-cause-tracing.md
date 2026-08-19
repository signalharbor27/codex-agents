# Root-cause tracing

Load this when a bad value or state must be followed through several callers or components.

1. Start at the first observed invalid state, not the final crash handler.
2. Identify the caller or prior transition that supplied it.
3. Add a temporary tagged probe or assertion at that boundary.
4. Reproduce once and move one step earlier.
5. Continue until the original invalid transition, missing invariant, or external input is found.
6. Explain why valid cases do not take the same path.

For stateful systems, trace both data and time: who owned the previous state, which transition was legal, and which concurrent or retried actor could write it.

Fix at the earliest boundary that has enough information and authority to enforce the invariant. Add downstream defense only when it independently protects a trust boundary or improves diagnosis; duplicated validation everywhere obscures ownership.

Temporary probes must be searchable, narrowly scoped, non-secret, and removed before completion.

Source basis: Andreas Zeller, *Why Programs Fail*, and David Agans, *Debugging*, especially scientific hypothesis testing and tracing causes instead of symptoms.
