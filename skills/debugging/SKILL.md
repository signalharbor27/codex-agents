---
name: debugging
description: "Use when a software failure is unexplained, flaky, intermittent, environment-sensitive, or still guessed at. Owns diagnosis and, if authorized, the smallest fix through fresh proof. Not for understood changes or test design."
---

# Debugging

## Overview

Turn an unknown failure into a falsifiable cause before changing production code.
Diagnosis-only requests stop at evidence; fix requests continue through the smallest proven repair.

## When to Use

- Bug reports, incidents, failing tests, and unexpected behavior with an unknown cause
- Flaky, timing-sensitive, environment-specific, or multi-component failures
- Repeated speculative fixes or an unclear failing boundary

## When Not to Use

- Use `engineering` when the cause and required change are understood
- Use `test-design` when the main deliverable is a test strategy, suite, or explicit TDD workflow
- Do not widen one failure investigation into an architecture audit without evidence

## Minimal Workflow

1. Pin expected behavior, actual behavior, scope, mutation authority, and the evidence that would distinguish fixed from still broken.
2. Build the fastest red-capable loop: focused test, request/script, replay, trace, harness, repeated seed, or measurement. If access or an artifact prevents reproduction, report that blocker before guessing.
3. Reproduce and minimize the failing input, state, timing, environment, or call path. Compare a working case with the broken case.
4. Locate the failing boundary. Rank a small set of falsifiable hypotheses and test the highest-signal one with one variable changed.
5. Trace the cause backward until it explains both the failure and the working comparison. State the violated behavior or contract, not merely the crashing line.
6. If the request is diagnosis-only, stop with evidence, ruled-out hypotheses, and the next discriminating check.
7. If a fix is authorized, add or preserve a regression signal at the observable seam, make the smallest source-level repair, and avoid unrelated mitigation or redesign.
8. Run the red-capable loop, relevant surrounding checks, and any claim-matched runtime observation fresh. Remove probes and throwaway harnesses before completion.

## Reference Routing

- Read [references/root-cause-tracing.md](references/root-cause-tracing.md) when a bad value or state must be followed through several callers or components.
- Read [references/async-and-flakes.md](references/async-and-flakes.md) when timing, polling, concurrency, ordering, or intermittent reproduction dominates.
- After the cause is known, use the matching `engineering` pressure reference only if the repair genuinely involves that pressure.

## Failure modes

- Reading broadly or editing before a red-capable loop exists
- Treating a command that cannot fail for this bug as proof
- Testing several hypotheses with one speculative patch
- Stopping at correlation, a stack-frame symptom, or a guessed “race”
- Turning mitigation into a rewrite
- Leaving debug probes, stress loops, or temporary artifacts behind
