---
name: improve-codebase-architecture
description: "Audit codebase or subsystem architecture for shallow modules, weak seams, agent navigability, domain drift, and test-shape pain. Use when you want a phased plan to deepen interfaces, simplify structure, and improve verification."
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
- Mapping domain language, ownership boundaries, and decisions in a complex existing codebase

## When Not to Use

- Ordinary feature implementation or local refactors
- Root-cause debugging of one failure path
- Narrow pattern debates better handled by `engineering/references/boundary-design.md`
- Storage or distributed-systems reviews driven mainly by workload shape

## Minimal Workflow

1. Inspect the current reality first: structure, major seams, build/test shape, and directly mentioned problem areas.
2. Map the business/domain terms the code uses, where they conflict, and which docs or decisions already exist.
3. Identify the highest-cost architecture and testing issues, not every possible cleanup.
4. Preserve existing guarantees and constraints unless there is evidence they are part of the problem.
5. Compare the current shape against simpler, deeper modules with clearer interfaces; use module/interface/seam/depth/leverage/locality vocabulary and the deletion test.
6. Treat a one-adapter seam as hypothetical unless it hides real external complexity, policy variation, or a second adapter such as tests.
7. Check agent-friendliness directly: entrypoints, local reasoning, verification commands, implicit side effects, and navigability.
8. Classify findings as pre-existing debt, regression from the current change, preventable by `engineering`, preventable by `debugging`, preventable by `test-design`, or repo-doc/memory candidate.
9. For large repos or monorepos, split evidence gathering by subsystem and use subagents for bounded independent review tracks such as frontend, backend, shared packages, or build and CI.
10. Produce a phased plan with scope, expected payoff, dependencies, and verification for each phase.
11. Keep the review and plan in chat by default. Create or update a target-repo plan file only when the user explicitly requests or has already authorized a durable artifact.
12. Offer to record durable terms in `CONTEXT.md` or durable tradeoffs in ADRs only when the decision will guide future work.
13. Pressure-test the draft internally before finalizing it. Use interactive `grill-me` only when the user requests that flow or a consequential unresolved choice requires approval.
14. Call out what should not change, what should be deferred, and at least one rejected alternative when the tradeoff is non-trivial.

## Output Contract

- Prioritized findings with file or subsystem evidence, impact, and confidence
- A phased plan whose phases each state scope, payoff, dependencies, and verification
- Explicit preserved behavior, deferred work, rejected alternatives, and open decisions
- Done when every recommendation traces to evidence and the plan has no hidden consequential choice

## Reference Routing

- Read [AGENT_FRIENDLY_REVIEW.md](AGENT_FRIENDLY_REVIEW.md) for the review rubric and planning heuristics.
- Read [../engineering/references/durable-plan.md](../engineering/references/durable-plan.md) only after a durable target-repo plan file is explicitly authorized.

## Failure Modes

- Treating the task like a greenfield redesign instead of a constrained review
- Recommending broad pattern churn without clear payoff
- Ignoring existing tests, invariants, or operational constraints
- Producing a vague wish list instead of a phased plan
- Optimizing for internal cleverness instead of navigability, seams, and verifiability
