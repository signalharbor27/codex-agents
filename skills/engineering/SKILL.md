---
name: engineering
description: "Use when implementing, refactoring, planning, or researching an understood software change. Excludes unknown-cause failures, test design as the main task, and review or audit work."
---

# Engineering

## Overview

Build the smallest production-complete change that delivers the requested outcome. The main agent owns the plan, shared contracts, integration, and completion claim. Delegated implementers use this skill with relevant domain guidance and return their slice and focused proof to the parent for independent review and integration.

## When to Use

- Understood bug fixes, migrations, and implementation plans
- Read-only research or design for a known software objective
- Greenfield work whose next useful behavior can be sliced vertically

## When Not to Use

- Unknown cause or failing boundary: use `debugging`.
- Tests, TDD, coverage, or proof design as the primary deliverable: use `test-design`.
- Review, audit, branch, or handoff as the actual task: use the matching skill.
- Rust, Effect, or data-system domain pressure: add `writing-rust`, `effect-ts`, or `designing-data-intensive-systems` only as a modifier.

## Minimal Workflow

1. Inspect the real entrypoint, current owner, callers, contracts, and existing proof before proposing a shape. Done when you can name the owner, callers, and existing proof of each boundary you expect to change.
2. Frame the requested outcome in observable terms: success evidence, behavior that must remain unchanged, permitted side effects, and the condition that ends the task. Separate that outcome from your interpretation and any experiment proposed to reduce uncertainty. Done when all four are stated in checkable terms.
3. Grill gate, every change: before dependent planning or implementation, list the plausible interpretations and user-owned choices that change the deliverable, acceptance criteria, or costly commitments. Settle discoverable facts and routine choices yourself. When any user-owned choice or missing authority remains, even one, read [the frontier procedure](../grill-me/references/frontier.md) and interview the user with it. Continue unaffected authorized work, retain engineering ownership, and resume dependent work after answers under existing authority. Done when evidence or the user has settled every interpretation that dependent work relies on.
4. Shape gate, every change: classify the change. A one-way or cross-boundary change gets the [architect contract](references/feature-shape.md#draft-the-contract-with-architects) before implementation, even when its shape looks settled; when the contract hinges on a fact inspection cannot settle, prototype it first under feature-shape's prototype rules. Done when the change is classified and any required contract exists.
5. Start substantial work with a production-shaped tracer bullet: one retained path through the required boundaries to observable behavior and proof. Design the remaining slices for parallel implementation from the outset, with explicit dependencies, shared contracts, ownership, and acceptance criteria. Dispatch independent slices as their prerequisites settle; keep coupled work sequential. Continue until the requested outcome is complete. A small change may need only one slice.
6. Before the first edit, plan, or delegation brief, check every Reference Routing trigger against the task and read each reference whose trigger applies. Write the result as one line in the conversation before that first edit, plan, or brief: `refs: <reference names>` for the pressures actually present, or `refs: none (<reason>)`. Follow it with `gates: grill=<questions asked | settled: reason>; shape=<architects | prototype, architects | local: reason>`. Re-check when scope grows into a new trigger, and name the applicable reference paths in every delegated brief.
7. Keep an internal scope estimate of the boundaries likely to change. Revise it as inspection reveals necessary work and report material scope changes, so the reported scope matches the boundaries the diff changes. Routine file choices need no advance approval or narrated file list.
8. Prefer the existing owner and direct code. Add a boundary only when it hides real complexity, protects a stable contract, or has more than one real implementation; otherwise keep it inline.
9. Implement the smallest complete slice. Add a hook, defensive branch, fallback, compatibility path, or duplicate representation only when a current caller, applicable failure mode, threat, rollout constraint, or stored-data contract requires it. Leave unrelated cleanup alone; standards cleanup in touched files belongs to review, not to implementers.
10. Choose the cheapest trustworthy proof through an observable seam. Cover the changed behavior and required surrounding checks. Add persistent tests only when they provide meaningful protection beyond existing evidence. After checks pass, broaden or repeat them only for new edits, failures, changed relevant state, or unresolved risks; otherwise reuse the passing result after confirming the tested code and relevant state are unchanged. Verification gate, every change: also run the project's verification recipe for the changed behavior. When the project has none or none covers that behavior, create or extend one with `project-verification` before handoff. Append `verify=<recipe: result | recipe added: result | blocked: reason>` to the gates line at handoff. Done when the gate passed or its blocker is reported.
11. Close only affected contracts and operational artifacts: callers, types, migrations, generated outputs, config, docs, observability, or rollback notes. Done when every affected artifact matches the change.
12. Before the main agent's implementation handoff or an intended commit, apply `review-and-simplify-changes` and finish its review/fix loop on the combined intended diff; its review record follows the commit. The parent owns this gate for delegated slices. Bound conclusions by the evidence: a completed experiment or slice supports only what it tested. Done when evidence supports the entire requested outcome and every changed boundary is accounted for.

## Reference Routing

- Read [references/feature-shape.md](references/feature-shape.md) for greenfield work, a new integration, or planning multiple slices and their parallel implementation. The shape gate reads its architect contract section.
- Read [references/boundary-design.md](references/boundary-design.md) when callers, ownership, trust boundaries, invariant-bearing types, module/API shape, or a proposed abstraction is consequential.
- Read [references/typescript-contracts.md](references/typescript-contracts.md) when TypeScript schema ownership, inference, semantic IDs, assertions, or exhaustiveness affect the contract; follow repository and `effect-ts` conventions.
- Read [../codebase-investigation/references/historical-evidence.md](../codebase-investigation/references/historical-evidence.md) when a change depends on why existing behavior was introduced or retained.
- Read [references/legacy-change.md](references/legacy-change.md) when behavior is poorly understood, under-tested, tightly coupled, migration-sensitive, or requires repeated mechanical edits.
- Read [references/state-and-effects.md](references/state-and-effects.md) for money, durable state, external effects, webhooks, jobs, retries, concurrency, or recovery.
- Read [references/compatibility-and-delivery.md](references/compatibility-and-delivery.md) for public contracts, SDK/schema changes, mixed-version deploys, migrations, rollout, or rollback.
- Read [references/security.md](references/security.md) for auth, permissions, secrets, command guards, attacker-controlled input, abuse, replay, or sensitive data.
- Read [references/performance-and-capacity.md](references/performance-and-capacity.md) for hot paths, latency comparisons or research, latency/throughput targets, resource limits, or capacity work.
- Read [references/proof.md](references/proof.md) only when the trustworthy proof is not obvious, the change has material failure modes, or you start parallel, long-running, or resource-heavy scratch runs.
- Read [references/external-skills.md](references/external-skills.md) when a pressure it lists applies, to find the installed external principle or workflow skill to read by path.
- Read [references/durable-plan.md](references/durable-plan.md) only after the user requests or authorizes an in-repo plan that must survive sessions or agents, including discovery work whose route is not yet execution-ready.

## Failure modes

- Horizontal scaffolding before one real path works
- Broad architecture preflights for pressures that are absent
- New layers, factories, adapters, or fallback paths justified only by possible future use
- Expanding the diff without a reason tied to the requested outcome
- Unit-green but contract-, persistence-, migration-, or runtime-incomplete work
- Completion claims based on stale, unexamined, or partial evidence
- Skipping a gate, or its `gates:` entry, because the change looks small, routine, or already shaped
- Skipping a matching reference because inspection, a spike, prior knowledge, or confidence seemed sufficient, or editing before the `refs:` line
