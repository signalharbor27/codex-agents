Read this when the hard part is designing a module or API surface.

Start from callers, not internals:
- list the current or likely callers
- write 2-3 usage examples before choosing the implementation shape
- name what callers should not need to know

Compare materially different designs:
- a no-pattern or inline baseline
- one simplified interface optimized for the common case
- one flexibility-oriented interface only if future variation is real
- one existing-code-compatible option when migration pressure matters

Use pattern vocabulary only after pressure is proven:
- construction pressure: factory or builder only if setup/product-family variation is real
- interface mismatch: adapter, facade, or wrapper only if it hides real external or subsystem complexity
- behavior variation: strategy, command, or state only if conditionals/policies are recurring
- composition before inheritance unless substitutability is stable and useful

Judge them on:
- method count and parameter complexity
- what the interface hides internally
- ease of correct use
- misuse risk
- compatibility with existing callers
- whether deleting the module would spread complexity across callers
- whether the interface stays stable if internals radically change

Prefer deep modules:
- small interface, meaningful behavior hidden behind it
- domain names over technical layer names
- errors and invariants documented at the seam
- no pass-through wrappers unless they isolate a real external dependency, policy, or test seam
