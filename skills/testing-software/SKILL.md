---
name: testing-software
description: Choose the cheapest trustworthy test strategy for the risk in front of you. Use when deciding what to test, what to keep real versus fake, or why a suite is flaky, slow, or low-signal. Not for root-cause debugging before the failure mode is understood.
---

# Testing Software

## Overview

Use this skill to choose reliable tests with the least cost.
Tests should verify behavior through public interfaces and externally visible contracts. When a bug fix or behavior change has a cheap trustworthy failing test, bias toward TDD.
Producer standard: tests shaped by this skill should not create new `improve-test-suite` findings for brittleness, mock theater, redundancy, or low signal unless the tradeoff is explicit.

## When to Use

- Choosing unit, integration, end-to-end, or exploratory coverage
- Deciding what must stay real, what can be faked, and what should be mocked
- Writing acceptance criteria or concrete assertions
- Evaluating whether a suite is over-mocked, brittle, or too expensive
- Using TDD deliberately for a slice of behavior
- Designing characterization, contract, property, state-machine, or golden tests for risky behavior

## When Not to Use

- Use `systematic-debugging` first when you do not understand the failure
- Use `writing-software` when the main question is change shape, not test shape
- Do not default to TDD when the task is configuration churn, mechanical migration, or pure wiring with better proof available

## Minimal Workflow

1. State the behavior or risk being covered.
2. Read existing `CONTEXT.md`, `CONTEXT-MAP.md`, ADRs, or equivalent docs when domain language, ownership, or prior decisions affect the behavior under test.
3. Choose the cheapest trustworthy proof: characterization for legacy behavior, contract tests for seams, property or state-machine tests for broad input spaces, golden tests for stable snapshots, or exploratory checks for unclear requirements.
4. For bug fixes and user-visible behavior changes, prefer practical TDD when a failing test is cheap and trustworthy.
5. In TDD, use vertical slices: watch one behavior test fail for the right reason, make the smallest change that passes it, then repeat. Do not write all tests first and all implementation later.
6. Define the observable signal through the public interface before writing the test.
7. Decide what stays real, fake, or mocked, and do not mock the boundary you are trying to trust.
8. For high-risk work, write a risk-to-test matrix before coding:
   - behavior or failure mode
   - public seam that observes it
   - real dependency, fake, or fixture choice
   - happy path, duplicate/retry, partial failure, malformed input, auth/permission denied, stale state, concurrency/race, and recovery/reconciliation cases where relevant
9. Apply the test no-regression gate: prefer behavior specs that survive refactors, avoid internal call choreography, avoid duplicate higher-cost coverage, and keep feedback fast enough to trust.
10. For tooling, lint, or eval changes, add at least one negative or synthetic failure check when feasible; a clean-repo smoke test alone is not enough.
11. For UI changes, screenshots are evidence only when paired with an assertion, comparison, or explicit visual QA observation; a screenshot command alone is not a pass/fail test.
12. Keep E2E tests few and critical. Use stable selectors, avoid broad multi-purpose flows, and push logic coverage down to cheaper seam tests.
13. Name the gaps that the chosen test will not prove.

## Reference Routing

- Read [UNIT.md](UNIT.md) for unit-of-work boundaries and mock/fake rules.
- Read [INTEGRATION.md](INTEGRATION.md) for contract, persistence, and seam coverage.
- Read [EXPLORATORY.md](EXPLORATORY.md) when requirements are unclear and discovery comes first.
- Read [TEST-DESIGN.md](TEST-DESIGN.md) for partitions, state transitions, and combinatorics.
- Read [AGILE.md](AGILE.md) for team-level testing balance.
- Read [TDD.md](TDD.md) when a bug fix or behavior change is a good fit for test-first development.
- Read [references/PLAYWRIGHT.md](references/PLAYWRIGHT.md) when writing or reviewing Playwright/browser E2E tests, selectors, assertions, isolation, or parallelism.

## Failure Modes

- Jumping to end-to-end tests because the real risk was never stated
- Mocking away the boundary that fails in production
- Avoiding TDD even though a cheap failing test would make the change safer and clearer
- Using TDD as a ritual instead of a tool for a specific behavior slice
- Horizontal TDD: writing all tests first, then all implementation, before learning from each slice
- Tests that assert call choreography, private helpers, or internal data shape instead of observable behavior
- Tests that query around the interface to prove a side effect through the wrong seam
- Proving only the happy path when the change is supposed to catch bad states
- Tests that prove implementation trivia but miss user-visible regressions
- Screenshot-only checks or broad E2E flows used as a substitute for focused behavior, contract, persistence, or failure-mode proof
