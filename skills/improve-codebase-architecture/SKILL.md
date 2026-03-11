---
name: improve-codebase-architecture
description: Critically review a codebase for architecture drag, agent-hostile shape, and weak tests, then produce a phased improvement plan. Use when you want a repo or subsystem audit to simplify structure, strengthen seams, and align implementation with the active skills.
---

# Improve Codebase Architecture

## Overview

Use this skill for codebase-level or subsystem-level review when the main job is to diagnose structural problems and propose a practical improvement plan.
It should produce a critical, evidence-backed plan that makes the codebase simpler, easier for agents to navigate, and easier to verify.

## When to Use

- Reviewing a repo or subsystem for architecture drift
- Reviewing a monorepo across frontend, backend, shared packages, or CI seams
- Planning codebase simplification, boundary cleanup, or test-shape improvements
- Auditing whether a codebase aligns with the current skill system and agent-friendly practices
- Identifying what should be preserved versus refactored before larger modernization work

## When Not to Use

- Ordinary feature implementation or local refactors
- Root-cause debugging of one failure path
- Narrow pattern debates better handled by `designing-with-patterns`
- Storage or distributed-systems reviews driven mainly by workload shape

## Minimal Workflow

1. Inspect the current reality first: structure, major seams, build/test shape, and directly mentioned problem areas.
2. Identify the highest-cost architecture and testing issues, not every possible cleanup.
3. Preserve existing guarantees and constraints unless there is evidence they are part of the problem.
4. Compare the current shape against simpler, deeper module boundaries with clearer public interfaces.
5. For large repos or monorepos, split evidence gathering by subsystem and use subagents for bounded independent review tracks such as frontend, backend, shared packages, or build and CI.
6. For repo-wide, monorepo, or multi-session reviews, write the phased plan to a local file under `docs/exec-plans/active/` instead of leaving it only in chat.
7. Produce a phased plan with scope, expected payoff, dependencies, and verification for each phase.
8. Call out what should not change, what should be deferred, and at least one rejected alternative when the tradeoff is non-trivial.

## Reference Routing

- Read [AGENT_FRIENDLY_REVIEW.md](AGENT_FRIENDLY_REVIEW.md) for the review rubric, output shape, and planning heuristics.
- Read [../writing-software/EXEC-PLAN-FILES.md](../writing-software/EXEC-PLAN-FILES.md) when the review needs a durable plan file.

## Failure Modes

- Treating the task like a greenfield redesign instead of a constrained review
- Recommending broad pattern churn without clear payoff
- Ignoring existing tests, invariants, or operational constraints
- Producing a vague wish list instead of a phased plan
- Optimizing for internal cleverness instead of navigability, seams, and verifiability
