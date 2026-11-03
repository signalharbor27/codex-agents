---
name: improve-test-suite
description: "Use when auditing a repository or subsystem test suite for brittle, redundant, flaky, slow, or low-signal coverage. Excludes one failing test and a feature's local test design."
---

# Improve test suite

## Overview

Turn suite-level evidence into an improvement plan. Prefer a smaller suite that proves real behavior through public interfaces. Preserve tests tied to incidents or contracts unless evidence shows that another test covers the same risk more reliably.

## When to Use

- Planning test cleanup before or alongside broader architecture work
- Auditing whether tests align with behavior-first, public-interface, vertical-slice TDD principles
- Identifying which tests to remove, which seams need better proof, and which new tests would add real trust
- Test-suite checks that `review-and-simplify-changes` assigns for the subsystems a diff touches

## When Not to Use

- Root-cause debugging when the failure mode is not yet understood: use `debugging`.
- Ordinary feature implementation with a local test choice question: use `engineering`.
- Pure code-architecture review where testing is secondary: use `improve-codebase-architecture`.
- One-off flaky test investigation that does not need suite-level review: use `debugging`.

## Minimal Workflow

1. Pin the repository or subsystem boundary and read-only authority. Inspect suite layers, runtime, reliability, doubles, and named pain points. For a post-code review, the boundary is the subsystems the diff touches; tag findings per `coding-standards.md`, where pre-existing issues are audit items that never block, and list issues outside those subsystems separately.
2. For standalone audits, keep small or tightly coupled scope local and delegate material independent subsystem or test-layer questions to read-only subagents. Within `review-and-simplify-changes`, independent reviewers perform the assigned checks and return findings without further delegation. The main agent owns synthesis and decisions.
3. Find the highest-cost problems: brittle internals, duplicate coverage, mock theater, slow low-signal flows, and missing seam-level proof. Compare boundary-focused tests through public interfaces. Before recommending removal, inventory incident and contract provenance and address the risk each test covers. Done when every removal candidate has its covered risk named.
4. Classify findings as pre-existing test debt, current regression, preventable by `engineering`, `debugging`, or `test-design`, preventable at review by a coding standard or deterministic check, or a repo-doc candidate. Plan supported changes to keep, remove, rewrite, or add tests, naming the behavior or cost and verification for each. Use phases only when dependencies or rollout need them. If no finding is supported, report no actionable findings and any coverage limits.
5. Pressure-test material tradeoffs, especially removal of broad suites or end-to-end coverage. Handle one unresolved approval inline and leave settled decisions closed. Keep the plan in chat unless a durable target-repository file is already or explicitly authorized. Done when the output contract below holds.

## Output contract

- Prioritized findings with test locations, behavior risk, evidence, and confidence
- For supported changes, an actionable plan with dependencies and verification; keep/remove/rewrite/add categories only where useful
- Incident coverage to preserve and material deferred work, alternatives, or open decisions; omit empty sections
- Done when each recommendation has evidence that it improves trust or cost and every removal risk is addressed.

## Reference Routing

- Read [../engineering/references/proof.md](../engineering/references/proof.md) when assessing fixture realism, assertion strength, or whether passing tests can detect material defects.
- Read [../review-and-simplify-changes/references/coding-standards.md](../review-and-simplify-changes/references/coding-standards.md) when tagging findings for a post-code review (its "Classify each finding" section), judging whether a test lies, reviewing a diff's tests, or when a finding was preventable at review and needs a proposed standard or check; it owns the test-lie catalog.
- Read [TEST_SUITE_REVIEW.md](TEST_SUITE_REVIEW.md) when judging test quality, removal risk, or replacement coverage.
- Read [../grill-me/references/frontier.md](../grill-me/references/frontier.md) only for an interactive interview or several interdependent consequential user-owned choices; retain this skill as primary.
- Read [../engineering/references/durable-plan.md](../engineering/references/durable-plan.md) only after a durable target-repo plan file is explicitly authorized.

## Failure modes

- Treating the task as "add more tests" instead of improving trust
- Deleting incident-proven regression tests because they look ugly
- Preserving mock-heavy implementation tests that break on harmless refactors
- Recommending broad end-to-end expansion when seam-level tests would be cheaper and stronger
- Returning complaints without actionable changes or forcing phases onto a small recommendation
