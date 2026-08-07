---
name: engineering
description: "Use when implementing, refactoring, planning, or researching an understood software change. Owns inspection through fresh verification. Not for unknown-cause failures, test design as the main task, or review/audit work."
---

# Engineering

## Overview

Build the smallest production-complete change that satisfies the requested outcome.
This skill owns inspection, implementation, proof, and the completion claim; do not stack separate planning, testing, or verification producer skills onto it.

## When to Use

- Features, understood bug fixes, refactors, migrations, and implementation plans
- Read-only research or design for a known software objective
- Greenfield work whose next useful behavior can be sliced vertically

## When Not to Use

- Use `debugging` when the cause or failing boundary is unknown
- Use `test-design` when tests, TDD, coverage, or proof design are the primary deliverable
- Use the matching review, audit, branch, or handoff skill when that is the actual task
- Add `writing-rust`, `effect-ts`, or `designing-data-intensive-systems` only as a modifier when its domain pressure is present

## Minimal Workflow

1. Inspect the real entrypoint, current owner, callers, contracts, and existing proof before proposing a shape.
2. Frame the outcome, evidence of success, behavior that must remain unchanged, allowed side effects, and stop condition.
3. Keep one consequential approval inline. If several consequential user-owned decisions depend on one another and block a safe slice, load the dependency-frontier grilling reference below; retain engineering ownership and resume only after the user confirms shared understanding.
4. Choose one production-complete vertical slice. For a small local change, this may be the whole change; do not manufacture phases.
5. Name only pressures present in the task. Load only the matching reference below before editing; routine changes need no reference.
6. Set a change budget: expected files or boundaries and why each must move. Rejustify the plan before widening it.
7. Prefer the existing owner and direct code. Add a boundary only when it hides real complexity, protects a stable contract, or has more than one real implementation; otherwise keep it inline.
8. Implement the smallest complete slice without speculative hooks, duplicate representations, compatibility fallbacks, or unrelated cleanup.
9. Choose the cheapest trustworthy proof through an observable seam. Cover the failure mode or changed behavior, then run the relevant surrounding checks.
10. Close only affected contracts and operational artifacts: callers, types, migrations, generated outputs, config, docs, observability, or rollback notes.
11. Inspect the final diff for scope growth, shallow wrappers, redundant tests, and silent behavior changes. Run fresh verification and stop when the evidence supports the requested outcome.

## Reference Routing

- Read [../grill-me/references/frontier.md](../grill-me/references/frontier.md) when inspection reveals several interdependent consequential user-owned decisions that block the next safe slice.
- Read [references/feature-shape.md](references/feature-shape.md) for greenfield work, a new integration, or a feature too large for one obvious slice.
- Read [references/boundary-design.md](references/boundary-design.md) when callers, ownership, module/API shape, or a proposed abstraction is consequential.
- Read [references/legacy-change.md](references/legacy-change.md) when behavior is poorly understood, under-tested, tightly coupled, or migration-sensitive.
- Read [references/state-and-effects.md](references/state-and-effects.md) for money, durable state, external effects, webhooks, jobs, retries, concurrency, or recovery.
- Read [references/compatibility-and-delivery.md](references/compatibility-and-delivery.md) for public contracts, SDK/schema changes, mixed-version deploys, migrations, rollout, or rollback.
- Read [references/security.md](references/security.md) for auth, permissions, secrets, attacker-controlled input, abuse, replay, or sensitive data.
- Read [references/performance-and-capacity.md](references/performance-and-capacity.md) for hot paths, latency/throughput targets, resource limits, or capacity work.
- Read [references/proof.md](references/proof.md) only when the trustworthy proof is not obvious or the change has material failure modes.
- Read [references/durable-plan.md](references/durable-plan.md) only after the user requests or authorizes an in-repo plan that must survive sessions or agents, including discovery work whose route is not yet execution-ready.

## Failure Modes

- Horizontal scaffolding before one real path works
- Broad architecture preflights for pressures that are absent
- New layers, factories, adapters, or fallback paths justified only by possible future use
- Expanding the diff without revisiting the change budget
- Unit-green but contract-, persistence-, migration-, or runtime-incomplete work
- Completion claims based on stale, delegated, or partial evidence
