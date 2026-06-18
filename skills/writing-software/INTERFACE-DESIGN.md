Read this when the hard part is designing a module or API surface.

Start from callers, not internals:
- list the current or likely callers
- write 2-3 usage examples before choosing the implementation shape
- name what callers should not need to know
- for material interfaces, treat those examples as required pre-edit evidence, not polish

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
- what review would flag as noisy, shallow, or caller-hostile

Prefer deep modules:
- small interface, meaningful behavior hidden behind it
- domain names over technical layer names
- errors and invariants documented at the seam
- no pass-through wrappers unless they isolate a real external dependency, policy, or test seam

Use the vocabulary consistently:
- module: anything with an interface and implementation, from a function to a subsystem
- interface: everything callers must know, including invariants, ordering, errors, config, and performance, not just the type signature
- seam: where behavior can vary without editing the caller; place it deliberately
- adapter: an implementation plugged into a seam, usually for production, tests, or an external system
- depth: leverage at the interface; more behavior behind less caller knowledge

Classify dependencies before adding or deepening a seam:
- in-process: pure/local logic; deepen directly and test through the new interface
- local-substitutable: filesystem, local DB, clock, or queue with a real local stand-in; test with the stand-in, not a generic mock
- remote-owned: internal service across HTTP/RPC/queue; define a port only when production and test adapters both matter
- true external: third-party service; inject a narrow port and mock or fake that external edge only

One adapter means a hypothetical seam. Two adapters, usually production plus test or provider variant, can make it real.
The interface is the test surface: once a deeper module is tested through its interface, delete or demote old shallow internal tests instead of layering redundant coverage.

Blocking gate for high-risk work:
- no new application service, provider wrapper, manager, facade, or workflow object until you can say what callers should not know
- if deleting the proposed interface would not push meaningful complexity into callers, inline it or keep the existing seam
- if callers must understand provider quirks, storage layout, retry policy, or ordering rules, the module is too shallow
