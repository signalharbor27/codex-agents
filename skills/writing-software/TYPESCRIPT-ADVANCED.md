Read this when the hard part is advanced TypeScript design rather than ordinary code shape.

Use it for:
- conditional or mapped types that materially change the public API
- type-level configuration or path inference
- reusable utility types that would otherwise create type noise

Do not use it for:
- ordinary interfaces and aliases
- type tricks that make the code harder to understand than the runtime logic

Rules:
- prefer the simplest type that preserves the contract
- treat type-level complexity as a cost, not a virtue
- do not substitute type cleverness for runtime validation or tests
