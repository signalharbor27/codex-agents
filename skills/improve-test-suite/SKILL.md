---
name: improve-test-suite
description: "Audit a repo or subsystem test suite for brittle, over-mocked, flaky, redundant, slow, or low-signal tests. Use when you want a phased plan to remove bad coverage and add stronger behavior-focused seam tests."
---

# Improve Test Suite

## Overview

Use this skill for repo-level or subsystem-level test review when the main job is to diagnose weak, redundant, brittle, or low-signal tests and produce a practical plan to improve them.
It should bias toward fewer, more trustworthy tests tied to real behavior through public interfaces.
Hard preservation rule: keep tests that protect real incidents or contracts unless evidence proves them redundant or misleading.

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

1. Pin the repo or subsystem review scope, then inspect suite shape, layers, speed, mocks, and directly mentioned pain points.
2. Before recommending any removal, inventory incident and contract provenance.
3. Identify the highest-cost test problems: brittle internals, duplicate coverage, mock theater, slow low-signal flows, and missing seam-level proof.
4. Compare the current suite against a simpler shape: boundary-focused tests, public interfaces, and cheap trustworthy signals.
5. Classify findings as pre-existing test debt, regression from the current change, preventable by `software-engineering-flow`, preventable by `writing-software`, preventable by `testing-software`, or repo-doc/memory candidate.
6. For large repos, split evidence gathering by subsystem or test layer and use subagents for bounded independent review tracks.
7. Produce a phased plan covering what to remove, what to keep, what to rewrite, and what new tests would materially increase trust.
8. Keep the review and plan in chat by default. Create or update a target-repo plan file only when the user explicitly requests or has already authorized a durable artifact.
9. Pressure-test the draft internally before finalizing it. Use interactive `grill-me` only when the user requests that flow or a consequential unresolved choice requires approval.
10. Call out at least one rejected alternative when the tradeoff is non-trivial, especially when removing broad suites or end-to-end coverage.

## Output Contract

- Prioritized findings with test locations, behavior risk, evidence, and confidence
- A keep/remove/rewrite/add plan with dependencies and verification for each phase
- Explicit incident coverage to preserve, deferred work, rejected alternatives, and open decisions
- Done when each recommendation improves trust or cost with evidence and removal risk is addressed

## Reference Routing

- Read [TEST_SUITE_REVIEW.md](TEST_SUITE_REVIEW.md) for the review rubric and bad-vs-good test patterns.
- Read [../writing-software/EXEC-PLAN-FILES.md](../writing-software/EXEC-PLAN-FILES.md) only after a durable target-repo plan file is explicitly authorized.

## Failure Modes

- Treating the task like “add more tests” instead of improving trust
- Deleting incident-proven regression tests because they look ugly
- Preserving mock-heavy implementation tests that break on harmless refactors
- Recommending broad end-to-end expansion when seam-level tests would be cheaper and stronger
- Producing a list of complaints instead of a phased cleanup plan
