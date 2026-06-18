---
name: systematic-debugging
description: Find root cause before changing code. Use when the user says debug/diagnose, reports broken, throwing, failing, flaky, slow, or unexpected behavior, or when guess-and-check has started. Not for long-term test strategy.
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
2. Make the loop red-capable for this bug: it should fail on the current behavior, pass on a known-good case when possible, and be cheap enough to run after each hypothesis.
3. Reproduce, read the actual failure carefully, then minimize the input, route, fixture, timing, or data shape until irrelevant moving parts are gone.
4. If no loop can be built, say what was tried and ask for the missing artifact, access, or permission before hypothesizing.
5. Sharpen the loop until it is specific, deterministic enough, and cheap enough to guide changes; for flakes, raise the reproduction rate with repetition, stress, seeds, or timing probes.
6. Gather evidence at the relevant boundary or call path; use tagged debug logs, probes, or assertions that are easy to search and remove.
7. For performance regressions, capture a baseline and a repeated measurement before changing code.
8. Check relevant domain/decision docs and recent changes when a regression is plausible.
9. Compare working and broken cases.
10. When the cause is unclear, list 3-5 ranked falsifiable hypotheses, then test the highest-signal one with one variable changed.
11. State the root cause in terms of behavior and contract, not just the line that crashed.
12. For user-reported issues, capture expected behavior, actual behavior, and reproduction in durable language that survives refactors.
13. Implement only after the failure mode is understood.
14. When a fix plan is needed, make it a sequence of behavior-first test/fix slices through public interfaces and put the regression proof at the seam where the bug is observable.
15. Before completion, remove debug instrumentation and delete or clearly mark throwaway harnesses; include a short postmortem note when the bug points to a repeated blind spot in tests, docs, or skill guidance.

## Reference Routing

- Read [root-cause-tracing.md](root-cause-tracing.md) for tracing bad values backward.
- Read [condition-based-waiting.md](condition-based-waiting.md) when time or async ordering is involved.
- Read [defense-in-depth.md](defense-in-depth.md) when validation needs to be added after the source issue is found.

## Failure Modes

- Staring at code or proposing fixes before a reproducible feedback loop exists
- Treating a smoke command that never goes red as proof of this bug
- Proposing fixes before identifying the failing boundary
- Ignoring recent change history when the breakage may be a regression
- Bundling several speculative changes into one test
- Leaving tagged debug probes or measurement scripts behind
- Treating repeated bad hypotheses as proof of an architectural flaw
- Turning mitigation work into a rewrite without evidence
- Leaving debug instrumentation or throwaway harnesses behind after verification
