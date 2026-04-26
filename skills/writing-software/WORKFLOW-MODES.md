# Workflow Modes

Read this before large or ambiguous engineering work. It enforces the right behavior for the situation.

## New Change in Existing Code

- Start from caller behavior and current seams, not a preferred design.
- Preserve existing guarantees unless intentionally retired.
- Slice vertically: one user-visible or contract-visible path at a time.
- Verify with focused checks before broad gates.
- For a new feature in an existing complex codebase, use the complex-codebase safety posture first, then apply this vertical slicing.

## New Codebase or Greenfield Area

- Name the domain terms first.
- Choose the first deep modules and public interfaces.
- Build a thin tracer bullet: production-shaped, end-to-end, minimal behavior.
- A tracer bullet should use the real entrypoint, real integration boundary, minimal persistence/state when relevant, and one verification command.
- Use the tracer to learn integration, workflow, and verification shape before locking architecture.
- For more detail, read `TRACER-BULLETS.md`.

Source: tracer bullets come from Hunt and Thomas, *The Pragmatic Programmer*.

## Existing Complex Codebase

- Treat unknown code as load-bearing until proven otherwise.
- If ownership, callers, entrypoints, or verification commands are unknown, zoom out first: map modules, callers, entrypoints, ownership, and verification.
- Find seams for characterization tests or safe observation before refactoring.
- Prefer wrap/sprout/extract moves over rewrites.
- Improve navigability and verification as part of the change.

## Enforcement

- State the mode before planning.
- Load the matching reference when the mode creates risk.
- Stop research-only tasks at findings; implementation tasks continue through verification.
