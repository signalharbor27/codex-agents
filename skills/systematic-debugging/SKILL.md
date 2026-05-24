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
- QA reports or user-visible issues that need durable triage before implementation

## When Not to Use

- Use `testing-software` when the failure is understood and the question is test shape
- Use `writing-software` when the issue is design/refactor pressure rather than a live failure
- Do not turn ordinary debugging into an architecture review unless evidence actually points there

## Minimal Workflow

1. Build the fastest trustworthy pass/fail loop first: focused test, CLI/curl script, browser script, replayed trace, throwaway harness, fuzz/property loop, or bisection harness.
2. Reproduce and read the actual failure carefully. If no loop can be built, say what was tried and ask for the missing artifact, access, or permission before hypothesizing.
3. Sharpen the loop until it is specific, deterministic enough, and cheap enough to guide changes; for flakes, raise the reproduction rate with repetition, stress, seeds, or timing probes.
4. Gather evidence at the relevant boundary or call path.
5. Check relevant domain/decision docs and recent changes when a regression is plausible.
6. Compare working and broken cases.
7. Form one concrete hypothesis and test it minimally.
8. State the root cause in terms of behavior and contract, not just the line that crashed.
9. For user-reported issues, capture expected behavior, actual behavior, and reproduction in durable language that survives refactors.
10. Implement only after the failure mode is understood.
11. When a fix plan is needed, make it a sequence of behavior-first test/fix slices through public interfaces.

## Reference Routing

- Read [root-cause-tracing.md](root-cause-tracing.md) for tracing bad values backward.
- Read [condition-based-waiting.md](condition-based-waiting.md) when time or async ordering is involved.
- Read [defense-in-depth.md](defense-in-depth.md) when validation needs to be added after the source issue is found.

## Failure Modes

- Staring at code or proposing fixes before a reproducible feedback loop exists
- Proposing fixes before identifying the failing boundary
- Ignoring recent change history when the breakage may be a regression
- Bundling several speculative changes into one test
- Treating repeated bad hypotheses as proof of an architectural flaw
- Turning mitigation work into a rewrite without evidence
- Leaving debug instrumentation or throwaway harnesses behind after verification
