---
name: systematic-debugging
description: Find the root cause of bugs, test failures, and unexpected behavior before changing code. Use when the failure mode is not yet understood or guess-and-check has started to creep in. Not for deciding long-term test strategy.
---

# Systematic Debugging

## Overview

Use this skill to understand a failure before proposing a fix.
The goal is evidence, not activity.

## When to Use

- Bug reports, test failures, and unexpected behavior
- Flaky, intermittent, or environment-sensitive failures
- Multi-component issues where the failing boundary is unclear
- Situations where several speculative fixes have already been tried

## When Not to Use

- Use `testing-software` when the failure is understood and the question is test shape
- Use `writing-software` when the issue is design/refactor pressure rather than a live failure
- Do not turn ordinary debugging into an architecture review unless evidence actually points there

## Minimal Workflow

1. Reproduce and read the actual failure carefully.
2. Gather evidence at the relevant boundary or call path.
3. Check recent relevant changes when a regression is plausible.
4. Compare working and broken cases.
5. Form one concrete hypothesis and test it minimally.
6. Implement only after the failure mode is understood.

## Reference Routing

- Read [root-cause-tracing.md](root-cause-tracing.md) for tracing bad values backward.
- Read [condition-based-waiting.md](condition-based-waiting.md) when time or async ordering is involved.
- Read [defense-in-depth.md](defense-in-depth.md) when validation needs to be added after the source issue is found.

## Failure Modes

- Proposing fixes before identifying the failing boundary
- Ignoring recent change history when the breakage may be a regression
- Bundling several speculative changes into one test
- Treating repeated bad hypotheses as proof of an architectural flaw
- Turning mitigation work into a rewrite without evidence
