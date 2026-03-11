---
name: testing-software
description: Choose the cheapest trustworthy test strategy for the risk in front of you. Use when deciding what to test, what to keep real versus fake, or why a suite is flaky, slow, or low-signal. Not for root-cause debugging before the failure mode is understood.
---

# Testing Software

## Overview

Use this skill to choose reliable tests with the least cost.
Tests should verify behavior through public interfaces and externally visible contracts.

## When to Use

- Choosing unit, integration, end-to-end, or exploratory coverage
- Deciding what must stay real, what can be faked, and what should be mocked
- Writing acceptance criteria or concrete assertions
- Evaluating whether a suite is over-mocked, brittle, or too expensive
- Using TDD deliberately for a slice of behavior

## When Not to Use

- Use `systematic-debugging` first when you do not understand the failure
- Use `writing-software` when the main question is change shape, not test shape
- Do not default to TDD when the task is configuration churn, mechanical migration, or pure wiring with better proof available

## Minimal Workflow

1. State the behavior or risk being covered.
2. Choose the cheapest test that gives trustworthy signal.
3. Decide what stays real, fake, or mocked.
4. Define the observable signal before writing the test.
5. Name the gaps that the chosen test will not prove.

## Reference Routing

- Read [UNIT.md](UNIT.md) for unit-of-work boundaries and mock/fake rules.
- Read [INTEGRATION.md](INTEGRATION.md) for contract, persistence, and seam coverage.
- Read [EXPLORATORY.md](EXPLORATORY.md) when requirements are unclear and discovery comes first.
- Read [TEST-DESIGN.md](TEST-DESIGN.md) for partitions, state transitions, and combinatorics.
- Read [AGILE.md](AGILE.md) for team-level testing balance.
- Read [TDD.md](TDD.md) when the user explicitly wants TDD or test-first development.

## Failure Modes

- Jumping to end-to-end tests because the real risk was never stated
- Mocking away the boundary that fails in production
- Using TDD as a ritual instead of a tool for a specific behavior slice
- Tests that prove implementation trivia but miss user-visible regressions
