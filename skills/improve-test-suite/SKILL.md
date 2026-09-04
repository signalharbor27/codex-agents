---
name: improve-test-suite
description: "Audit a repo or subsystem test suite for brittle, over-mocked, flaky, redundant, slow, or low-signal tests. Use when you want a phased plan to remove bad coverage and add stronger behavior-focused seam tests."
---

# Improve test suite

## Overview

Diagnose weak, redundant, brittle, or low-signal tests across a repository or subsystem, then produce a practical improvement plan. Prefer a smaller suite that proves real behavior through public interfaces. Preserve tests tied to incidents or contracts unless evidence shows that another test covers the same risk more reliably.

## When to Use

- Reviewing a repo or subsystem test suite for brittleness, redundancy, or low signal
- Planning test cleanup before or alongside broader architecture work
- Auditing whether tests align with behavior-first, public-interface, vertical-slice TDD principles
- Identifying which tests to remove, which seams need better proof, and which new tests would add real trust

## When Not to Use

- Root-cause debugging when the failure mode is not yet understood
- Ordinary feature implementation with a local test choice question better handled by `engineering`
- Pure code-architecture review where testing is secondary
- One-off flaky test investigation that does not need suite-level review

## Minimal Workflow

1. Pin the repository or subsystem boundary. Inspect suite layers, runtime, reliability, doubles, and named pain points. For a post-code gate, limit findings to the original diff and its direct effects; list broader or pre-existing issues separately.
2. Before recommending any removal, inventory incident and contract provenance.
3. Find the highest-cost test problems: brittle internals, duplicate coverage, mock theater, slow low-signal flows, and missing seam-level proof.
4. Compare the current suite against a simpler shape: boundary-focused tests, public interfaces, and cheap trustworthy signals.
5. Classify findings as pre-existing test debt, regression from the current change, preventable by `engineering`, preventable by `debugging`, preventable by `test-design`, or repo-doc candidate.
6. For large repos, split evidence gathering by subsystem or test layer and use subagents for bounded independent review tracks.
7. Write a dependency-ordered plan that identifies what to keep, remove, rewrite, and add. Each change must name the behavior or cost it addresses and how to verify the new suite shape.
8. Keep the review and plan in chat unless the user explicitly requests or has already authorized a durable target-repository plan file.
9. Pressure-test the draft before finalizing it. Handle a single unresolved approval inline; do not ask again for settled decisions. Load the dependency-frontier grilling reference only when the user asks for an interactive interview or several consequential, user-owned decisions depend on each other.
10. State at least one rejected alternative when the tradeoff is non-trivial, especially when removing broad suites or end-to-end coverage.

## Output contract

- Prioritized findings with test locations, behavior risk, evidence, and confidence
- A keep/remove/rewrite/add plan with dependencies and verification for each phase
- Explicit incident coverage to preserve, deferred work, rejected alternatives, and open decisions
- Completion requires evidence that each recommendation improves trust or cost, with every removal risk addressed.

## Reference Routing

- Read [TEST_SUITE_REVIEW.md](TEST_SUITE_REVIEW.md) for the review rubric and bad-vs-good test patterns.
- Read [../grill-me/references/frontier.md](../grill-me/references/frontier.md) only for an interactive interview over several interdependent consequential user-owned decisions; retain this skill as primary.
- Read [../engineering/references/durable-plan.md](../engineering/references/durable-plan.md) only after a durable target-repo plan file is explicitly authorized.

## Failure modes

- Treating the task as "add more tests" instead of improving trust
- Deleting incident-proven regression tests because they look ugly
- Preserving mock-heavy implementation tests that break on harmless refactors
- Recommending broad end-to-end expansion when seam-level tests would be cheaper and stronger
- Returning complaints instead of a phased cleanup plan
