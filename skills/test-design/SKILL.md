---
name: test-design
description: "Use when tests are the main deliverable or uncertainty, including explicit TDD, proof-layer selection, coverage, assertions, and doubles. Excludes unknown-cause failures and routine implementation proof."
---

# Test design

## Overview

Design the smallest test set that can falsify the important behavior.

## When to Use

- Test-first feature work
- Selecting unit, integration, contract, property, state-machine, or end-to-end proof
- Designing assertions, fixtures, or real/fake/mock boundaries
- Adding focused tests for known behavior or legacy characterization

## When Not to Use

- Unknown failure or failing boundary: use `debugging` first.
- Test choice as routine support for an understood change: use `engineering`.
- A repo- or subsystem-wide test-suite audit: use `improve-test-suite`.

## Minimal Workflow

1. State the behavior claim, the failure risk, and the public or stable seam that can falsify it.
2. Inspect existing coverage, repository commands, incident history, and the real dependency boundary before adding tests. Done when you know which existing tests already cover the claim.
3. Choose the cheapest layer that can fail for the target behavior. Prefer focused contract or integration proof over broad E2E and internal mock choreography.
4. Apply the [proof guidance](../engineering/references/proof.md) to keep the boundary under test real, choose doubles, ground setup and expected results, and establish how the test rejects a plausible broken implementation for material behavior. Mock only an understood external protocol, never the behavior being trusted.
5. Select only relevant cases: happy path, boundary partitions, invalid input, state transition, duplicate/retry, partial failure, permission denial, concurrency, or recovery.
6. For TDD, complete one vertical red-green-refactor slice at a time and observe the expected failure before production edits. Continue through the requested behavior; the first green slice does not end a larger task.
7. Run the focused tests and relevant surrounding gate. Done when the target claim can fail for the right reason, coverage added or replaced by this task has no needless duplication, and material proof gaps are stated. Reuse earlier results only after confirming the tested code and relevant state are unchanged.

## Reference Routing

- Read [references/test-selection.md](references/test-selection.md) when the proof layer, doubles, oracle, or case matrix is consequential.
- Read [references/tdd.md](references/tdd.md) only for explicit TDD or a behavior change where a cheap trustworthy failing test is the chosen development loop.
- Read [references/browser-e2e.md](references/browser-e2e.md) for browser flows, selectors, visual evidence, or Playwright-style end-to-end work.
- Read [../review-and-simplify-changes/references/coding-standards.md](../review-and-simplify-changes/references/coding-standards.md) when checking whether existing or new tests could pass while the behavior is broken; its test-lie catalog owns those flags.
- Read [engineering/references/legacy-change.md](../engineering/references/legacy-change.md) for characterization seams in poorly understood code.
- Read the installed `principle-test-behavior-not-implementation` skill when writing, changing, or keeping a test, and `benchmark-checklist` for measured numbers; see [the external skills map](../engineering/references/external-skills.md#testing-and-proof).

## Failure modes

- More tests without more trust
- Tests that lie: tautological, structure-sensitive, can't-fail, or private-path
- Broad E2E flows for behavior a cheaper seam can prove
- Screenshot commands, typechecks, or coverage percentages treated as behavior proof
- Test suites that grow while obsolete or subsumed tests remain
