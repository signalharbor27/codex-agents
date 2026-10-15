---
name: effect-ts
description: "Use when Effect services, typed errors, layers, runtimes, wrappers, streams, caching, or UI integration constrain the design. Excludes TypeScript work where Effect is not central."
---

# Effect TS

## Overview

This is a modifier. `engineering` or the active review skill owns the loop; this skill adds Effect constraints at the boundary being changed.

## When to Use

- Effect already runs at the boundary being changed, or the task explicitly selects it
- Queues, concurrency, and retries in Effect code, beyond plain streams
- Wrapping a third-party SDK so callers never import the raw client
- React or Next.js App Router code that runs Effects or reads effect-atom state

## When Not to Use

- Module shape and implementation: use `engineering` as the primary skill, with this skill loaded beside it.
- Framework-agnostic test selection: use `test-design`.

## Minimal Workflow

1. Name the active Effect boundary: service, runtime, wrapper, stream, or UI integration. Done when the plan or review states it.
2. Inspect the repository's service, layer, error, runtime, and testing conventions at that boundary. Done when each convention is tied to a file that shows it, or recorded as absent.
3. Read the references whose Reference Routing trigger matches the current design pressure, and only those. Done when every present trigger's reference is read.
4. Treat local examples as patterns. Verify version-sensitive APIs against the installed version and current official Effect documentation. Done when every such API in the change or advice has been checked.
5. For guidance or review, state the chosen boundary, how it fits local conventions, any version assumptions, and the verification needed. Done when the answer carries all four.
6. During implementation, apply these constraints within the primary `engineering` loop and stop only when that loop's fresh-verification condition is met.

## Reference Routing

- Read [references/CRITICAL_RULES.md](references/CRITICAL_RULES.md) when writing or reviewing `Effect.gen` code, error handling inside it, or type assertions.
- Read [references/NEXT_JS.md](references/NEXT_JS.md) when Next.js App Router integration uses `@prb/effect-next` that is already present or explicitly selected. This reference does not authorize adding the package.
- Read [references/STREAMS.md](references/STREAMS.md) when the work uses queues, hubs, channels, or streams.
- Read [references/TESTING.md](references/TESTING.md) when Effect tests need deterministic time, fibers, or resource cleanup.
- Read [references/OPTION_NULL.md](references/OPTION_NULL.md) when values cross between `Option` and `null` or `undefined`.
- Read [references/EFFECT_ATOM.md](references/EFFECT_ATOM.md) when code uses effect-atom atoms, hooks, families, or atom runtimes.
- Read [references/BEST_PRACTICES/service-patterns.md](references/BEST_PRACTICES/service-patterns.md) when defining business services, their method boundaries, or the dependencies a service declares, or when choosing between `Context.Tag` and `Effect.Service`.
- Read [references/BEST_PRACTICES/error-patterns.md](references/BEST_PRACTICES/error-patterns.md) when designing typed errors or recovery semantics.
- Read [references/BEST_PRACTICES/layer-patterns.md](references/BEST_PRACTICES/layer-patterns.md) when wiring dependencies, composing layers, or building runtimes.
- Read [references/BEST_PRACTICES/schema-patterns.md](references/BEST_PRACTICES/schema-patterns.md) when defining schemas, decoding input, or modeling domain types.
- Read [references/BEST_PRACTICES/observability-patterns.md](references/BEST_PRACTICES/observability-patterns.md) when adding logging, tracing, metrics, or configuration.
- Read [references/BEST_PRACTICES/rpc-cluster-patterns.md](references/BEST_PRACTICES/rpc-cluster-patterns.md) when defining RPC, workflows, activities, or scheduled jobs.
- Read [references/BEST_PRACTICES/language-server.md](references/BEST_PRACTICES/language-server.md) when setting up the Effect language service or reading its diagnostics.
- Read [references/BEST_PRACTICES/effect-atom-patterns.md](references/BEST_PRACTICES/effect-atom-patterns.md) when effect-atom work needs caching, mutation, or resource patterns beyond the core API.
- Read [references/BEST_PRACTICES/anti-patterns.md](references/BEST_PRACTICES/anti-patterns.md) when reviewing Effect-specific misuse beyond the core rules.
- Read [CLIENT_WRAPPERS.md](CLIENT_WRAPPERS.md) when wrapping a third-party SDK.

## Failure modes

- Mixing incompatible service or error conventions in one codebase
- Letting wrapper code leak the raw client and bypass Effect boundaries
- Using Effect to justify unnecessary complexity in otherwise simple modules
