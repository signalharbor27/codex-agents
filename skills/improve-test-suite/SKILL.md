---
name: improve-test-suite
description: Critically review a repo or subsystem test suite, remove bad or redundant coverage, and produce a phased improvement plan. Use when you want to simplify testing, strengthen boundary-focused proof, and align tests with behavior-first TDD principles.
---

# Improve Test Suite

## Overview

Use this skill for repo-level or subsystem-level test review when the main job is to diagnose weak, redundant, brittle, or low-signal tests and produce a practical plan to improve them.
It should bias toward fewer, more trustworthy tests tied to real behavior through public interfaces.

## When to Use

- Reviewing a repo or subsystem test suite for brittleness, redundancy, or low signal
- Planning test cleanup before or alongside broader architecture work
- Auditing whether tests align with behavior-first, public-interface, vertical-slice TDD principles
- Identifying which tests to remove, which seams need better proof, and which new tests would add real trust

## When Not to Use

- Root-cause debugging when the failure mode is not yet understood
- Ordinary feature implementation with a local test choice question better handled by `testing-software`
- Pure code-architecture review where testing is secondary
- One-off flaky test investigation that does not need suite-level review

## Minimal Workflow

1. Inspect the current test surface first: suite shape, layers, speed, mocks, and directly mentioned pain points.
2. Identify the highest-cost test problems: brittle internals, duplicate coverage, mock theater, slow low-signal flows, and missing seam-level proof.
3. Preserve tests that protect real behavior, contracts, and incidents unless there is evidence they are redundant or misleading.
4. Compare the current suite against a simpler shape: boundary-focused tests, public interfaces, and cheap trustworthy signals.
5. Classify findings as pre-existing test debt, regression from the current change, preventable by `software-engineering-flow`, preventable by `writing-software`, preventable by `testing-software`, or repo-doc/memory candidate.
6. For large repos, split evidence gathering by subsystem or test layer and use subagents for bounded independent review tracks.
7. For repo-wide, multi-layer, or multi-session reviews, write the phased plan to a local file in the target repo, typically under `docs/exec-plans/active/`, instead of leaving it only in chat.
8. Produce a phased plan covering what to remove, what to keep, what to rewrite, and what new tests would materially increase trust.
9. Grill the phased plan before finalizing it: challenge weak assumptions, removal risk, missing seams, and verification gaps.
10. Call out at least one rejected alternative when the tradeoff is non-trivial, especially when removing broad suites or end-to-end coverage.

## Reference Routing

- Read [TEST_SUITE_REVIEW.md](TEST_SUITE_REVIEW.md) for the review rubric, bad-vs-good test patterns, and output shape.
- Read [../writing-software/EXEC-PLAN-FILES.md](../writing-software/EXEC-PLAN-FILES.md) when the review needs a durable plan file.

## Failure Modes

- Treating the task like “add more tests” instead of improving trust
- Deleting incident-proven regression tests because they look ugly
- Preserving mock-heavy implementation tests that break on harmless refactors
- Recommending broad end-to-end expansion when seam-level tests would be cheaper and stronger
- Producing a list of complaints instead of a phased cleanup plan
