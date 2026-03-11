# Test Suite Review

Use this when the task is to review a test suite and produce a practical cleanup and improvement plan.

## Review Axes

- behavior fit: do tests prove observable behavior through public interfaces
- seam quality: do tests lock down the right contracts and boundaries
- redundancy: are multiple tests proving the same thing at higher cost
- brittleness: do tests fail on harmless refactors or internal renames
- realism: what stays real versus fake or mocked
- speed and signal: does the suite give fast trustworthy feedback
- TDD fit: where a cheap failing test would make future changes safer

## Good Tests

- exercise real code paths through public interfaces
- read like behavior specs
- survive internal refactors when behavior stays the same
- prove a real seam, contract, incident, or decision boundary
- make future bug-fix TDD easier by exposing a cheap trustworthy failing path

## Bad Tests

- mock internal collaborators and assert call choreography
- verify private methods or internal data shape
- bypass the interface to prove side effects through incidental implementation details
- duplicate broader coverage without adding new signal
- are so slow or flaky that teams stop trusting them
- break on harmless refactors even when behavior is unchanged

## What Good Output Looks Like

Keep it short and critical.

1. Current-state findings
2. Highest-cost test problems
3. Tests and suites to preserve
4. Tests to remove or demote
5. New tests worth adding
6. Phased plan
7. Verification approach

For each phase, include:

- goal
- scope
- dependencies
- verification
- expected payoff

## Good Review Questions

- Which tests would fail on a harmless internal refactor
- Which tests prove the same behavior at multiple layers with no extra signal
- Where are mocks hiding the real failure boundary
- Which missing seam-level tests would let us delete broad or brittle coverage
- Where would vertical-slice TDD make future bug fixes safer and cheaper

## Keep / Remove Heuristics

Keep tests that:

- protect user-visible behavior, incident regressions, or important contracts
- prove the seam where a real failure would matter
- stay stable across internal refactors

Remove, demote, or rewrite tests that:

- only prove internal call order or mock choreography
- inspect storage or internals instead of interface behavior
- duplicate broader trustworthy coverage without new signal
- add maintenance cost without protecting a meaningful risk

## Delegation Fit

For larger repos, delegate bounded review tracks by subsystem or test layer.

Good subagent tracks:

- frontend or backend test-surface audit
- integration and contract test review
- end-to-end suite signal and redundancy review
- mock and fixture inventory
- incident-regression audit

Keep main-thread ownership of synthesis, prioritization, and the final phased plan.

## Avoid

- “more tests = better” reasoning
- giant replacement plans with no seam-by-seam payoff
- deleting tests without mapping what risk they currently cover
- treating TDD as mandatory for config churn or mechanical work
