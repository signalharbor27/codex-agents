---
name: effect-ts
description: "Build and review Effect code with consistent service, error, layer, and runtime boundaries. Use when working in code that imports from `effect`, including wrappers, streams, caching, and UI integration. Not for generic TypeScript questions outside Effect."
---

# Effect TS

## Overview

Use this as the single top-level router for Effect work.
Keep the entrypoint small and load only the references needed for the active task.

## When to Use

- Services, layers, and dependency wiring
- Typed error surfaces and runtime boundaries
- Streams, queues, concurrency, retries, and caching
- Effect wrappers around external SDKs
- Effect integration with React or Next-style UI code

## When Not to Use

- Use `writing-software` for generic module-shape questions
- Use `testing-software` for framework-agnostic test selection
- Do not route ordinary TypeScript utility work here unless Effect is central

## Minimal Workflow

1. State the active Effect boundary: service, runtime, wrapper, stream, or UI integration.
2. Keep interface shape and error strategy consistent with the rest of the system.
3. Load only the reference files needed for that boundary.
4. Verify version-sensitive APIs against the current official Effect documentation; treat local examples as patterns, not API authority.
5. For guidance or review, finish with the chosen boundary, compatibility assumptions, and verification needed.
6. For implementation, hand back to `writing-software` when generic change shape matters, `testing-software` for proof choice, and `verification-before-completion` before claiming done.

## Reference Routing

- Read [references/CRITICAL_RULES.md](references/CRITICAL_RULES.md) for core anti-patterns and boundary rules.
- Read [references/NEXT_JS.md](references/NEXT_JS.md) for UI integration.
- Read [references/STREAMS.md](references/STREAMS.md) for queues, hubs, channels, and streams.
- Read [references/TESTING.md](references/TESTING.md) for deterministic Effect testing.
- Read [references/OPTION_NULL.md](references/OPTION_NULL.md) for `Option` and `null` interop.
- Read [references/EFFECT_ATOM.md](references/EFFECT_ATOM.md) for effect-atom patterns.
- Read [references/BEST_PRACTICES/service-patterns.md](references/BEST_PRACTICES/service-patterns.md) for business services and method boundaries.
- Read [references/BEST_PRACTICES/error-patterns.md](references/BEST_PRACTICES/error-patterns.md) for typed errors and recovery semantics.
- Read [references/BEST_PRACTICES/layer-patterns.md](references/BEST_PRACTICES/layer-patterns.md) for dependency wiring, layer composition, and runtimes.
- Read [references/BEST_PRACTICES/schema-patterns.md](references/BEST_PRACTICES/schema-patterns.md) for schemas, decoding, and domain types.
- Read [references/BEST_PRACTICES/observability-patterns.md](references/BEST_PRACTICES/observability-patterns.md) for logging, tracing, metrics, and configuration.
- Read [references/BEST_PRACTICES/rpc-cluster-patterns.md](references/BEST_PRACTICES/rpc-cluster-patterns.md) for RPC, workflows, activities, and scheduled jobs.
- Read [references/BEST_PRACTICES/language-server.md](references/BEST_PRACTICES/language-server.md) for Effect language-server setup and diagnostics.
- Read [references/BEST_PRACTICES/effect-atom-patterns.md](references/BEST_PRACTICES/effect-atom-patterns.md) for advanced effect-atom caching, mutation, and resource patterns.
- Read [references/BEST_PRACTICES/anti-patterns.md](references/BEST_PRACTICES/anti-patterns.md) when reviewing Effect-specific misuse beyond the core rules.
- Read [CLIENT_WRAPPERS.md](CLIENT_WRAPPERS.md) when wrapping third-party SDKs.

## Failure Modes

- Mixing incompatible service or error conventions in one codebase
- Letting wrapper code leak the raw client and bypass Effect boundaries
- Treating Effect as a reason to over-engineer otherwise simple modules
