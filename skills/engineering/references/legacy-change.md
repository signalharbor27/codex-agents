# Legacy change

## Preserve before improving

1. Name the behavior that must remain unchanged.
2. Find the cheapest seam that observes it through a public or stable interface.
3. Add a focused characterization test when existing proof is not trustworthy.
4. Break only the dependency that blocks the next safe change.
5. Make one wrap, sprout, extract, or replace step and verify again.

Treat unfamiliar code as load-bearing until callers, stored data, operational use, and history show otherwise. Prefer a local migration path over a rewrite.

## Decision rules

- Characterize behavior that users, callers, or operators depend on, not every incidental detail.
- Preserve incident tests and odd compatibility behavior until their consumers are disproven.
- Add a seam only when it enables observation or replacement needed by this change.
- Keep cleanup separate from behavior changes when combining them would hide causality.
- If callers cannot migrate in one green slice, use an additive transition and remove the old path only after usage is gone.

## Repeated mechanical edits

Validate one representative edit and its proof before automating the repetition. Bound the transformation to explicit paths and syntax; check exclusions and ambiguous matches before writing. Use a dry run or inspect the proposed diff, then check rerun behavior so repeated execution does not duplicate or corrupt edits. Verify the complete transformed scope, including exceptional cases. Retain the helper only when it has continuing value.

## Agent guardrails

Evolve difficult code through the steps above instead of replacing it with plausible new code. Base inferred intent and any deletion of a "legacy" path on evidence from the relevant callers, runtime/config paths, stored data, or rollout state; names alone and a single repository search fall short.

## Provenance

- Michael Feathers, *Working Effectively with Legacy Code*: characterization tests, seams, sprout/wrap techniques, and dependency breaking.
- Martin Fowler, *Refactoring*: small behavior-preserving transformations.
- Chesterton's Fence: understand the protected purpose before removing an established structure.
