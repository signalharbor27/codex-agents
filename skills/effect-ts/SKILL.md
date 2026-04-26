---
name: effect-ts
description: Build and review Effect code with consistent service, error, layer, and runtime boundaries. Use when working in code that imports from `effect`, including wrappers, streams, caching, and UI integration. Not for generic TypeScript questions outside Effect.
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
4. For implementation, hand back to `writing-software` when generic change shape matters, `testing-software` for proof choice, and `verification-before-completion` before claiming done.

## Reference Routing

- Read [references/CRITICAL_RULES.md](references/CRITICAL_RULES.md) for non-negotiable anti-patterns.
- Read [references/NEXT_JS.md](references/NEXT_JS.md) for UI integration.
- Read [references/STREAMS.md](references/STREAMS.md) for queues, hubs, channels, and streams.
- Read [references/TESTING.md](references/TESTING.md) for deterministic Effect testing.
- Read [references/OPTION_NULL.md](references/OPTION_NULL.md) for `Option` and `null` interop.
- Read [references/EFFECT_ATOM.md](references/EFFECT_ATOM.md) for effect-atom patterns.
- Read [references/BEST_PRACTICES](references/BEST_PRACTICES) when the question is Effect-specific service, schema, layer, or observability style.
- Read [CLIENT_WRAPPERS.md](CLIENT_WRAPPERS.md) when wrapping third-party SDKs.

## Failure Modes

- Mixing incompatible service or error conventions in one codebase
- Letting wrapper code leak the raw client and bypass Effect boundaries
- Treating Effect as a reason to over-engineer otherwise simple modules
