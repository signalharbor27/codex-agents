---
name: improve-codebase-architecture
description: "Use when auditing repository or subsystem architecture for weak boundaries, domain drift, or navigation and verification friction. Excludes routine implementation and review of a bounded diff."
---

# Improve codebase architecture

## Overview

Find the costliest structural problems in a codebase or subsystem and turn the evidence into an improvement plan that simplifies the code, supports local reasoning, and bounds verification and handoff.

## When to Use

- Monorepo review across frontend, backend, shared-package, or CI seams
- Plans to simplify code, clean up boundaries, or improve test shape
- Checks against the current skill system and agent-friendly practices
- Decisions about what to preserve or refactor before broader modernization
- Maps of domain language, ownership boundaries, and decisions in an existing complex codebase
- Architecture checks that `review-and-simplify-changes` assigns for the subsystems a diff touches

## When Not to Use

- Local refactoring: use `engineering`.
- Root-cause analysis of one failure path: use `debugging`.
- Narrow pattern questions that `boundary-design.md` owns: use `engineering`.
- Storage or distributed-systems review driven mainly by workload shape: use `designing-data-intensive-systems`.

## Minimal Workflow

1. Pin the review boundary and read-only authority. Inspect runtime entrypoints, owners, seams, build and test shape, domain terms, existing decisions, and named problems. For a post-code review, the boundary is the subsystems the diff touches, pre-existing issues included; tag findings clear, judgement, or audit per `coding-standards.md`, and list issues outside those subsystems separately.
2. For standalone audits, keep small or tightly coupled scope local and delegate material independent questions to read-only subagents. Within `review-and-simplify-changes`, independent reviewers perform the assigned checks and return findings without further delegation. The main agent owns synthesis, prioritization, decisions, and the final plan.
3. Find the highest-cost structural problems using the judgment rules below; skip an exhaustive inventory of every possible cleanup. Support each finding with a trace from a real entrypoint through ownership, interfaces, effects, and proof where relevant. Done when every finding carries its trace.
4. Classify supported findings as pre-existing debt, current regression, preventable by `engineering`, `debugging`, or `test-design`, preventable at review by a coding standard or deterministic check, or a repo-doc candidate. Write a dependency-ordered plan sized to them. Use phases only when dependencies or rollout need them. If no finding is supported, report no actionable findings and any coverage limits.
5. Pressure-test material choices. Handle one unresolved approval inline and leave settled decisions closed. Keep the plan in chat unless a durable target-repository file is already or explicitly authorized. Done when the output contract below holds.

## Judgment rules

- Preserve existing guarantees and constraints unless evidence shows they are part of the problem.
- Compare simpler, deeper modules with clearer interfaces. Use module/interface/seam/depth/leverage/locality vocabulary from the engineering references below and the diff-level flags (deletion test, hypothetical seam) from the coding standards.
- Judge agent-friendliness by local reasoning and bounded evidence handoff, with domain ownership, explicit effects, and trustworthy proof seams.
- Recommend terms in `CONTEXT.md` or tradeoffs in ADRs only when they will guide future work; write them only within existing or explicit authority.

## Output contract

- Prioritized findings with file or subsystem evidence, impact, and confidence. When applicable, agent-friendly findings trace a real entrypoint through its owner, boundary, effects, and proof seam.
- For supported changes, an actionable plan with scope, payoff, dependencies, preserved behavior, and verification.
- Material deferred work, alternatives, or open decisions. Explain real tradeoffs; omit empty sections.
- Done when every recommendation has evidence and the plan hides no consequential choice.

## Reference Routing

- Read [AGENT_FRIENDLY_REVIEW.md](AGENT_FRIENDLY_REVIEW.md) when navigation, local reasoning, delegation, or proof friction needs a structured review.
- Read [../review-and-simplify-changes/references/coding-standards.md](../review-and-simplify-changes/references/coding-standards.md) when tagging findings for a post-code review (its "Classify each finding" section), judging module depth, seams, tests, or comments, or when a finding was preventable at review and needs a proposed standard or check; it owns the diff-level rules.
- Read [../engineering/references/boundary-design.md](../engineering/references/boundary-design.md) when judging domain ownership, caller knowledge, or interface depth.
- Read [../engineering/references/state-and-effects.md](../engineering/references/state-and-effects.md) when important side effects, retries, recovery, or partial failure are present.
- Read [../engineering/references/proof.md](../engineering/references/proof.md) when the trustworthy proof seam is unclear or a recommendation changes verification shape.
- Read [../grill-me/references/frontier.md](../grill-me/references/frontier.md) only for an interactive interview or several interdependent consequential user-owned choices; retain this skill as primary.
- Read [../engineering/references/durable-plan.md](../engineering/references/durable-plan.md) only after a durable target-repo plan file is explicitly authorized.

## Failure modes

- Turning a constrained review into a greenfield redesign
- Recommending broad pattern churn without a clear payoff
- Overlooking existing tests, invariants, or operational constraints
- Returning a vague wish list or forcing phases onto a small recommendation
- Favoring internal cleverness over navigability, seams, and verifiability
