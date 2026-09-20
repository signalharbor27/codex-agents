---
name: debugging
description: "Use when a software failure is unexplained, flaky, intermittent, environment-sensitive, or still guessed at. Excludes understood changes and test design as the main task."
---

# Debugging

## Overview

Turn an unknown failure into a falsifiable cause before changing production code.
Diagnosis-only requests stop at evidence. Fix requests, including failure reports during authorized implementation, continue through the smallest proven repair without another approval.

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
2. Build the fastest red-capable loop: focused test, request/script, replay, trace, harness, repeated seed, or measurement. If access or an artifact prevents reproduction, identify the gap and continue useful independent investigation; distinguish a supported cause from a hypothesis.
3. Reproduce and minimize the failing input, state, timing, environment, or call path. Compare a working case with the broken case.
4. Locate the failing boundary. Rank a small set of falsifiable hypotheses and test the highest-signal one with one variable changed.
5. Trace the cause backward until it explains both the failure and the working comparison. State the violated behavior or contract, not merely the crashing line.
6. If the request is diagnosis-only, stop with evidence, ruled-out hypotheses, and the next discriminating check.
7. If a fix is authorized, use the existing reproduction or add a regression signal at the observable seam. Add a persistent test when it gives durable protection beyond existing evidence. Make the smallest repair; avoid unrelated mitigation or redesign.
8. Run the reproduction, required surrounding checks, and runtime observations needed to prove the fix. Reuse unaffected proof after checking its inputs; repeat or broaden checks for new edits, failures, changed relevant state, or unresolved risks. Remove temporary probes and harnesses before completion, and resume any remaining authorized work.

## Reference Routing

- Read [references/root-cause-tracing.md](references/root-cause-tracing.md) when a bad value or state must be followed through several callers or components, or repeated failed fixes call for a premise reset.
- Read [references/async-and-flakes.md](references/async-and-flakes.md) when timing, polling, concurrency, ordering, or intermittent reproduction dominates.
- Read [../codebase-investigation/references/historical-evidence.md](../codebase-investigation/references/historical-evidence.md) when recorded intent or change history can distinguish causal hypotheses.
- After the cause is known, use the matching `engineering` pressure reference only if the repair genuinely involves that pressure.

## Failure modes

- Reading broadly or editing before a red-capable loop exists
- Treating a command that cannot fail for this bug as proof
- Testing several hypotheses with one speculative patch
- Stopping at correlation, a stack-frame symptom, or a guessed “race”
- Turning mitigation into a rewrite
- Leaving debug probes, stress loops, or temporary artifacts behind
