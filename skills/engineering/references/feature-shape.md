# Feature shape

Load this for greenfield work, a new integration, or planning multiple slices and their parallel implementation.

A vertical slice is the smallest retained path from the real entrypoint, through required domain, state, and effect boundaries, to an observable user or contract result and its trustworthy proof. It is an execution and contract-discovery unit, not a mandatory permanent package layout.

## Decide between a prototype and a tracer bullet

- Use a throwaway prototype only to answer one uncertainty that inspection or prose cannot settle. State the question and the limits of what its result can establish; mark it disposable and delete or absorb it before completion.
- Use a tracer bullet for the first production path within the settled scope. It stays in the system and establishes the real integration and proof shape. Its success proves that path; keep the remaining acceptance criteria open.

## Shape the slice

- Start at the real entrypoint.
- Cross the real integration boundary.
- Include minimal real state or persistence when the feature depends on it.
- Produce one observable user or contract outcome.
- Verify it through the real seam.
- Defer optional variants, generalized configuration, and broad polish until the slice exposes a real need.

For a larger feature, order slices by risk and learning, not by technical layer. Each slice should be useful or should retire a named uncertainty while keeping the system green.

## Design for parallel implementation

Apply engineering's scope check before dividing work into slices; worker assignments must preserve the settled outcome and acceptance criteria. Consider parallel execution while choosing slice boundaries. Separate implementation blockers from integration dependencies: an agreed interface can unblock parallel coding while end-to-end proof still waits for its implementation. Map those dependencies, identify which work unlocks the rest, and group slices that can proceed together. Refine later slices using what the tracer bullet reveals.

- Give each slice an observable outcome, real entrypoint, prerequisites, owned files or boundaries, shared contracts, acceptance criteria, and proof. Include relevant skill/reference pointers and material failure or rollout constraints in the worker's brief.
- Assign each shared schema, interface, migration, or domain invariant one owner. Settle contracts and necessary setup before dependent workers start. Coordinate contract changes with affected workers and update their acceptance criteria.
- Choose concurrent slices with non-overlapping writes and compatible shared assumptions. Serialize conflicting work; keep independent work moving. Do not split one tightly coupled behavior by frontend/backend/test layers or add abstractions just to occupy more agents.
- If workers race alternative implementations, declare the acceptance and selection criteria first and isolate their writes. Account for failed or lost attempts and reconcile late results before integration; dropout does not waive acceptance or review coverage.
- Dispatch ready slices together within available capacity. Start newly unblocked work without waiting for unrelated slices. Use the smallest agent set that reduces time to a verified integrated outcome.
- Use the `implementer` profile for agreed slices; it implements and runs focused proof. For substantial delegated slices, use fresh independent acceptance review grounded in the requirements and repository evidence. Follow `review-and-simplify-changes` to assign substantive review to `oracle`, defect review through the host's `review-agent` skill, and command evidence to `verifier`. Verification can overlap unrelated implementation when the tested files and dependencies are stable.
- The main agent integrates completed slices continuously and checks their callers, wiring, shared invariants, and failure paths. Keep integration-dependent acceptance open until the real wiring is verified. Apply `review-and-simplify-changes` to the combined intended diff, using earlier slice reviews as evidence while checking interactions and previously unreviewed integration changes. Finish its review/fix loop and required verification at a known revision or stable working state, including the real end-to-end behavior.

Keep this plan in chat unless a durable plan file is requested or already authorized. Small or inseparable changes can remain one slice with one implementer.

## Preserve conceptual integrity

- Prefer one coherent domain model, vocabulary, representation, and path through the system.
- Treat every concept, state, interaction, option, and extension point as a reasoning cost; add one only when the current slice needs it.
- Choose the simplest production-complete design whose behavior and failure modes can be explained from end to end.
- Do not erase necessary complexity such as authorization, retries, recovery, or compatibility. Keep it explicit, place it behind the right boundary, and prove it.

## Agent guardrails

- Do not create repositories, services, interfaces, DTO layers, or factories merely to prepare for later slices.
- Do not treat mocked horizontal scaffolding as a completed milestone.
- Do not duplicate shared domain policy across slices; deepen a common owner when repeated policy or invariants become real.
- Record only decisions that constrain the next slice; avoid architecture inventories and speculative extension points.
- If the first slice cannot be stated as an observable path, the requirement is still too broad.

## Source basis

- Andrew Hunt and David Thomas, *The Pragmatic Programmer*: tracer bullets, prototypes, reversibility, and good-enough scope.
- Jimmy Bogard, “Vertical Slice Architecture”: organizing change around a complete use case instead of mandatory technical-layer gates.
- Robert C. Martin, “Screaming Architecture”: top-level structure reveals domains and use cases rather than frameworks.
- Martin Fowler, “Transaction Script”: a direct procedural use-case flow can be the appropriate complete design for simple domain logic.
- Steve Freeman and Nat Pryce, *Growing Object-Oriented Software, Guided by Tests*: walking skeletons and end-to-end feedback.
- Jez Humble and David Farley, *Continuous Delivery*: small, releasable increments and fast feedback.
- Fred Brooks, *The Mythical Man-Month* and “No Silver Bullet”: conceptual integrity and essential versus accidental complexity.
- C. A. R. Hoare, “The Emperor's Old Clothes”: simplicity as a prerequisite for understandable, reliable design.
- Niklaus Wirth, “A Plea for Lean Software”: resisting feature accumulation, unnecessary size, and software bloat.
