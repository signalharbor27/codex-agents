# Feature Shape

Load this for greenfield work, a new integration, or a feature too large for one obvious slice.

## Decide Prototype or Tracer Bullet

- Use a throwaway prototype only to answer one uncertainty that inspection or prose cannot settle. Mark it disposable and delete or absorb it before completion.
- Use a tracer bullet for the first production path. It stays in the system and establishes the real integration and proof shape.

## Shape the Slice

- Start at the real entrypoint.
- Cross the real integration boundary.
- Include minimal real state or persistence when the feature depends on it.
- Produce one observable user or contract outcome.
- Verify it through the real seam.
- Defer optional variants, generalized configuration, and broad polish until the slice exposes a real need.

For a larger feature, order slices by risk and learning, not by technical layer. Each slice should be useful or should retire a named uncertainty while keeping the system green.

## Agent Guardrails

- Do not create repositories, services, interfaces, DTO layers, or factories merely to prepare for later slices.
- Do not treat mocked horizontal scaffolding as a completed milestone.
- Record only decisions that constrain the next slice; avoid architecture inventories and speculative extension points.
- If the first slice cannot be stated as an observable path, the requirement is still too broad.

## Source Basis

- Andrew Hunt and David Thomas, *The Pragmatic Programmer*: tracer bullets, prototypes, reversibility, and good-enough scope.
- Steve Freeman and Nat Pryce, *Growing Object-Oriented Software, Guided by Tests*: walking skeletons and end-to-end feedback.
- Jez Humble and David Farley, *Continuous Delivery*: small, releasable increments and fast feedback.
