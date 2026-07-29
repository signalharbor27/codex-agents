---
name: test-design
description: "Use when tests are primary: explicit TDD, proof-layer selection, coverage, assertions, doubles, or characterization, contract, property, state-machine, and browser tests. Not for unknown causes or routine implementation proof."
---

# Test Design

## Overview

Design the smallest set of tests that can falsify the important behavior.
Routine implementation proof stays inside `engineering`; use this skill when test shape itself is the deliverable or dominant uncertainty.

## When to Use

- Explicit TDD or test-first feature work
- Selecting unit, integration, contract, property, state-machine, or end-to-end proof
- Designing assertions, fixtures, or real/fake/mock boundaries
- Adding focused tests for known behavior or legacy characterization

## When Not to Use

- Use `debugging` first when the failure or failing boundary is unknown
- Use `engineering` when test choice is routine support for an understood change
- Use `improve-test-suite` for a repo- or subsystem-wide test-suite audit

## Minimal Workflow

1. State the behavior, risk, and observable public or stable seam.
2. Inspect existing coverage, repository commands, incident history, and the real dependency boundary before adding tests.
3. Choose the cheapest layer that can fail for the target behavior. Prefer focused contract or integration proof over broad E2E and internal mock choreography.
4. Derive expected results from an independent oracle: specification example, literal worked result, invariant, trusted fixture, property, or independent implementation.
5. Keep the boundary under test real. Fake slow or uncontrollable collaborators; mock only a understood external protocol, never the behavior being trusted.
6. Select only relevant cases: happy path, boundary partitions, invalid input, state transition, duplicate/retry, partial failure, permission denial, concurrency, or recovery.
7. For TDD, complete one vertical red-green-refactor slice at a time and observe the expected failure before production edits.
8. Run the focused tests and relevant surrounding gate. Remove redundant coverage and state what the suite still does not prove.

## Reference Routing

- Read [references/test-selection.md](references/test-selection.md) when the proof layer, doubles, oracle, or case matrix is consequential.
- Read [references/tdd.md](references/tdd.md) only for explicit TDD or a behavior change where a cheap trustworthy failing test is the chosen development loop.
- Read [references/browser-e2e.md](references/browser-e2e.md) for browser flows, selectors, visual evidence, or Playwright-style end-to-end work.
- Read [engineering/references/legacy-change.md](../engineering/references/legacy-change.md) for characterization seams in poorly understood code.

## Failure Modes

- More tests without more trust
- Assertions coupled to private helpers, call order, or internal data shape
- Expected values copied from production logic
- Mocking away the boundary that fails in production
- Broad E2E flows for behavior a cheaper seam can prove
- Screenshot commands, typechecks, or coverage percentages treated as behavior proof
- Test suites that grow while obsolete or subsumed tests remain
