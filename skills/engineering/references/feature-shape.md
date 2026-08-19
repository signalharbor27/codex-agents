# Feature shape

Load this for greenfield work, a new integration, or a feature too large for one obvious slice.

A vertical slice is the smallest retained path from the real entrypoint, through required domain, state, and effect boundaries, to an observable user or contract result and its trustworthy proof. It is an execution and contract-discovery unit, not a mandatory permanent package layout.

## Decide between a prototype and a tracer bullet

- Use a throwaway prototype only to answer one uncertainty that inspection or prose cannot settle. Mark it disposable and delete or absorb it before completion.
- Use a tracer bullet for the first production path. It stays in the system and establishes the real integration and proof shape.

## Shape the slice

- Start at the real entrypoint.
- Cross the real integration boundary.
- Include minimal real state or persistence when the feature depends on it.
- Produce one observable user or contract outcome.
- Verify it through the real seam.
- Defer optional variants, generalized configuration, and broad polish until the slice exposes a real need.

For a larger feature, order slices by risk and learning, not by technical layer. Each slice should be useful or should retire a named uncertainty while keeping the system green.

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
