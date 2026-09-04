---
name: improve-codebase-architecture
description: "Audit codebase or subsystem architecture for shallow modules, weak seams, agent navigability, domain drift, and test-shape pain. Use when you want a phased plan to deepen interfaces, simplify structure, and improve verification."
---

# Improve codebase architecture

## Overview

Diagnose structural problems in a codebase or subsystem, then turn the evidence into a practical improvement plan. The plan should simplify the code, support local reasoning, and make verification and handoff easier to bound.

## When to Use

- Architecture drift in a repository or subsystem
- Monorepo review across frontend, backend, shared-package, or CI seams
- Plans to simplify code, clean up boundaries, or improve test shape
- Checks against the current skill system and agent-friendly practices
- Decisions about what to preserve or refactor before broader modernization
- Maps of domain language, ownership boundaries, and decisions in an existing complex codebase

## When Not to Use

- Routine feature work or local refactoring
- Root-cause analysis of one failure path
- Narrow pattern questions owned by `engineering/references/boundary-design.md`
- Storage or distributed-systems review driven mainly by workload shape

## Minimal Workflow

1. Pin the review boundary, then inspect its runtime entrypoints, owners, seams, build and test shape, and named problems. For a post-code gate, limit findings to the original diff and its direct effects; list broader or pre-existing issues separately.
2. Map the business and domain terms in the code, conflicts among them, and existing documentation or decisions.
3. Find the architecture and testing problems with the highest cost. Do not inventory every possible cleanup.
4. Preserve existing guarantees and constraints unless there is evidence they are part of the problem.
5. Compare the current shape against simpler, deeper modules with clearer interfaces; use module/interface/seam/depth/leverage/locality vocabulary and the deletion test.
6. Treat a one-adapter seam as hypothetical unless it hides real external complexity, policy variation, or a second adapter such as tests.
7. Judge agent-friendliness by local reasoning and bounded evidence handoff. Trace real entrypoints through domain ownership, deep module interfaces, explicit side effects, and trustworthy proof seams. Treat the engineering references below as authoritative for these design concepts rather than repeating them here.
8. Classify findings as pre-existing debt, regression from the current change, preventable by `engineering`, preventable by `debugging`, preventable by `test-design`, or repo-doc candidate.
9. For large repos or monorepos, split evidence gathering by subsystem and use subagents for bounded independent review tracks such as frontend, backend, shared packages, or build and CI.
10. Write a dependency-ordered plan. Each phase must name its scope, expected payoff, prerequisites, preserved behavior, and verification.
11. Keep the review and plan in chat unless the user explicitly requests or has already authorized a durable target-repository plan file.
12. Offer to record terms in `CONTEXT.md` or tradeoffs in ADRs only when they will guide future work.
13. Pressure-test the draft before finalizing it. Handle a single unresolved approval inline; do not ask again for settled decisions. Load the dependency-frontier grilling reference only when the user asks for an interactive interview or several consequential, user-owned decisions depend on each other.
14. State what must remain unchanged, what should wait, and at least one rejected alternative when the tradeoff is non-trivial.

## Output contract

- Prioritized findings with file or subsystem evidence, impact, and confidence. When applicable, agent-friendly findings trace a real entrypoint through its owner, boundary, effects, and proof seam.
- A phased plan that gives each phase's scope, payoff, dependencies, and verification.
- Explicit lists of preserved behavior, deferred work, rejected alternatives, and open decisions.
- Completion requires evidence for every recommendation and no hidden consequential choice in the plan.

## Reference Routing

- Read [AGENT_FRIENDLY_REVIEW.md](AGENT_FRIENDLY_REVIEW.md) for the review rubric and planning heuristics.
- Read [../engineering/references/boundary-design.md](../engineering/references/boundary-design.md) when judging domain ownership, caller knowledge, or interface depth.
- Read [../engineering/references/state-and-effects.md](../engineering/references/state-and-effects.md) when important side effects, retries, recovery, or partial failure are present.
- Read [../engineering/references/proof.md](../engineering/references/proof.md) when the trustworthy proof seam is unclear or a recommendation changes verification shape.
- Read [../grill-me/references/frontier.md](../grill-me/references/frontier.md) only for an interactive interview over several interdependent consequential user-owned decisions; retain this skill as primary.
- Read [../engineering/references/durable-plan.md](../engineering/references/durable-plan.md) only after a durable target-repo plan file is explicitly authorized.

## Failure modes

- Turning a constrained review into a greenfield redesign
- Recommending broad pattern churn without a clear payoff
- Overlooking existing tests, invariants, or operational constraints
- Returning a vague wish list instead of a phased plan
- Favoring internal cleverness over navigability, seams, and verifiability
