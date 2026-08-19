# Boundary design

Load this when callers, ownership, trust boundaries, invariant-bearing types, module/API shape, or a proposed abstraction is consequential.

## Start from callers

Write two or three real usage examples and identify what callers should not need to know. Include invariants, ordering, errors, configuration, and performance expectations. An interface is more than its type signature.

Prefer the existing owner and compare every proposed abstraction with direct code. Add or deepen a module only when it:

- hides meaningful policy, provider quirks, storage layout, or coordination;
- makes the common path substantially easier to use correctly;
- protects a stable contract from volatile internals; or
- supports at least two real implementations, commonly production plus a materially different test or provider adapter.

One pass-through wrapper, one implementation, or possible future variation is not enough.

## Keep modules deep

- Small interface, substantial hidden behavior.
- Domain names and ownership over technical layer names.
- Complexity pulled behind the boundary rather than repeated at callers.
- No parallel types or mapping layers unless they enforce a real trust, lifecycle, or compatibility boundary.
- Composition over inheritance unless substitutability is stable and useful.

Use the deletion test: if removing the module would not spread meaningful complexity or policy into callers, inline it or keep the existing seam.

## Design trusted, owned contracts

- Keep the normal use-case flow locally legible. Reject invalid or terminal conditions through the repository's established failure channel, but do not hide required authorization, error, recovery, or compatibility semantics merely to make the happy path shorter.
- At an untrusted HTTP, event, database, IPC, or configuration boundary, parse or narrow once into a trusted representation when doing so removes repeated validation or materially prevents invalid states. Preserve raw or unknown data at ingress until that proof exists.
- Keep invariant enforcement with the type or module that owns the state. Prefer asking the owner to perform an invariant-preserving domain operation over exposing mutable internals, but do not create ceremonial one-line methods around simple data.
- Model materially different legal states and transitions directly when the language and repository conventions can express them without disproportionate ceremony. Use runtime guards where types cannot carry the proof.
- Separate deterministic policy from I/O coordination only when the boundary exposes a real invariant, recovery decision, volatile integration, or trustworthy proof seam. Functional cores and ports/adapters are possible shapes, not required layers.

## Compare consequential alternatives

When two or more materially plausible shapes remain, sketch two or three real caller examples for each. Compare the number of concepts and states, caller knowledge, hidden complexity, misuse risk, migration cost, and fit with the existing domain model. Do not manufacture alternatives for ceremony; recommend the simplest shape that satisfies the real contracts and hides more complexity than it introduces.

## Agent guardrails

- Patterns are responses to observed pressure, never goals.
- DRY applies to duplicated knowledge, not merely similar syntax.
- Prefer three clear lines over a helper used once.
- Do not widen a public interface to simplify one implementation.
- Avoid configuration that merely moves decisions from code to callers.
- Balance locality with information hiding: keep use-case intent near its entrypoint and hide volatile protocol, storage, and coordination mechanics behind the owner that can explain them.

## Source basis

- John Ousterhout, *A Philosophy of Software Design*: deep modules, information hiding, change amplification, and pulling complexity downward.
- David Parnas, “On the Criteria To Be Used in Decomposing Systems into Modules”: hiding design decisions likely to change.
- Fred Brooks, *The Mythical Man-Month*: conceptual integrity and one coherent model across a system.
- Edsger Dijkstra, “The Humble Programmer”: keeping software within human intellectual control by reducing avoidable complexity.
- Martin Fowler, *Refactoring*: small behavior-preserving improvements and evidence-based abstraction.
- Eric Evans, *Domain-Driven Design*: explicit domain language and ownership boundaries.
- Alexis King, “Parse, Don't Validate”: boundary parsing that returns a value carrying the established fact.
- Scott Wlaschin, “Making Illegal States Unrepresentable” and *Domain Modeling Made Functional*: modeling legal domain states and transitions explicitly.
- Bertrand Meyer, *Object-Oriented Software Construction* and Design by Contract: owner-enforced preconditions, postconditions, and invariants.
- Gary Bernhardt, “Boundaries” and “Functional Core, Imperative Shell”: value boundaries and conditional separation of deterministic decisions from effects.
- Alistair Cockburn, “Hexagonal Architecture”: isolating application behavior from volatile external mechanisms without prescribing layer count.
- Martin Fowler, “Replace Nested Conditional with Guard Clauses,” “YAGNI,” “Tell, Don't Ask,” and “Beck Design Rules”: flat normal flow, evidence before speculative capability, behavior ownership with context-sensitive exceptions, and fewer classes and methods after correctness and intention.
- Casey Muratori, “Semantic Compression”: make code usable before making it reusable, then extract when real examples expose shared semantics.
- Carson Gross, “Locality of Behaviour”: keep behavior discoverable near its expression while balancing locality against information hiding and duplicated knowledge.
- Sandi Metz, “The Wrong Abstraction”: duplication can cost less than an abstraction built before the common shape is known.
