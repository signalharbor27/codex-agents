# Boundary Design

Load this when callers, ownership, module/API shape, or a proposed abstraction is consequential.

## Start From Callers

Write two or three real usage examples and name what callers should not need to know. Include invariants, ordering, errors, configuration, and performance expectations—the interface is more than its type signature.

Prefer the existing owner and compare every proposed abstraction with direct code. Add or deepen a module only when it:

- hides meaningful policy, provider quirks, storage layout, or coordination;
- makes the common path substantially easier to use correctly;
- protects a stable contract from volatile internals; or
- supports at least two real implementations, commonly production plus a materially different test or provider adapter.

One pass-through wrapper, one implementation, or possible future variation is not enough.

## Keep Modules Deep

- Small interface, substantial hidden behavior.
- Domain names and ownership over technical layer names.
- Complexity pulled behind the boundary rather than repeated at callers.
- No parallel types or mapping layers unless they enforce a real trust, lifecycle, or compatibility boundary.
- Composition over inheritance unless substitutability is stable and useful.

Use the deletion test: if removing the module would not spread meaningful complexity or policy into callers, inline it or keep the existing seam.

## Agent Guardrails

- Patterns are responses to observed pressure, never goals.
- DRY applies to duplicated knowledge, not merely similar syntax.
- Prefer three clear lines over a helper used once.
- Do not widen a public interface to simplify one implementation.
- Avoid configuration that merely moves decisions from code to callers.

## Source Basis

- John Ousterhout, *A Philosophy of Software Design*: deep modules, information hiding, change amplification, and pulling complexity downward.
- David Parnas, “On the Criteria To Be Used in Decomposing Systems into Modules”: hiding design decisions likely to change.
- Martin Fowler, *Refactoring*: small behavior-preserving improvements and evidence-based abstraction.
- Eric Evans, *Domain-Driven Design*: explicit domain language and ownership boundaries.
