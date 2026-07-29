# Legacy Change

Load this when behavior is poorly understood, under-tested, tightly coupled, or migration-sensitive.

## Preserve Before Improving

1. Name the behavior that must remain unchanged.
2. Find the cheapest seam that observes it through a public or stable interface.
3. Add a focused characterization test when existing proof is not trustworthy.
4. Break only the dependency that blocks the next safe change.
5. Make one wrap, sprout, extract, or replace step and verify again.

Treat unfamiliar code as load-bearing until callers, stored data, operational use, and history show otherwise. Prefer a local migration path over a rewrite.

## Decision Rules

- Characterize valuable behavior, not every incidental detail.
- Preserve incident tests and odd compatibility behavior until their consumers are disproven.
- Add a seam only when it enables observation or replacement needed by this change.
- Keep cleanup separate from behavior changes when combining them would hide causality.
- If callers cannot migrate in one green slice, use an additive transition and remove the old path only after usage is gone.

## Agent Guardrails

Do not replace difficult code with plausible new code, infer intent from names alone, or delete “legacy” paths after a single repository search. Evidence must include the relevant callers, runtime/config paths, stored data, or rollout state.

## Source Basis

- Michael Feathers, *Working Effectively with Legacy Code*: characterization tests, seams, sprout/wrap techniques, and dependency breaking.
- Martin Fowler, *Refactoring*: small behavior-preserving transformations.
- Chesterton’s Fence: understand the protected purpose before removing an established structure.
