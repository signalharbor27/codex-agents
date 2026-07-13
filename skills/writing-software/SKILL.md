---
name: writing-software
description: "Shape implementation and refactor work with minimal scope and clear module boundaries. Use when building a feature, changing an interface, planning a prototype or decision map, or reducing complexity. Not for debugging or test strategy."
---

# Writing Software

## Overview

Use this as the default software-engineering skill when no narrower skill dominates.
Keep changes small and reversible. Scale planning and proof to actual behavior and operational risk.

## When to Use

- Designing or reshaping a code change before editing
- Starting a new subsystem, service, workflow, or greenfield project
- Refactoring complexity, duplication, or interface problems
- Deciding naming, validation, or compatibility boundaries
- Planning a larger change into small vertical slices
- Creating a durable implementation or refactor plan from a known requirement

## When Not to Use

- Use `testing-software` for test selection or suite design
- Use `systematic-debugging` for root-cause investigation
- Use `writing-rust` for Rust-specific API or ownership decisions
- Use `INTERFACE-DESIGN.md` for pattern-vs-no-pattern or module-shape debates
- Use `designing-data-intensive-systems` for workload, storage, or consistency questions

## Minimal Workflow

1. Read directly mentioned files, then inspect current code, callers, conventions, and relevant decision docs.
2. State the outcome, success evidence, constraints, allowed side effects, and risk boundary.
3. Choose the mode from `WORKFLOW-MODES.md`: new change, greenfield, brownfield, existing complex codebase, unfamiliar area, or refactor.
4. For a read-only decision map, separate facts, decisions, open questions, and research/prototype/discussion tracks; make no repo or branch changes and stop with the requested plan.
5. For routine work, make the smallest reversible change that preserves current guarantees; avoid extra planning artifacts.
6. For behavior or interface risk, inspect caller examples, define the observable contract, keep complexity behind a deep boundary, and choose proof with `testing-software`.
7. For operational risk—money, auth/privacy, external effects, schema/migrations, queues/workers, concurrency/idempotency, or public compatibility—map durable state, side-effect order, retries, duplicate handling, recovery, and the test matrix before editing.
8. For non-trivial work, write a short outcome-first plan using vertical slices. Create a durable repo plan only when the user requested one or approved it for genuinely multi-session work.
9. Resolve consequential interface choices with caller usage, hidden complexity, misuse risk, and a simpler alternative. Keep routine choices local.
10. Challenge assumptions internally. Use interactive `grill-me` only when the user requests it or one unresolved consequential choice requires their decision.
11. Delegate only bounded independent tracks; keep synthesis, overlapping edits, integration, and verification on the main thread.
12. Preserve existing scripts, checks, contracts, and invariants unless their removal is intentional and justified. Keep the touched surface at or above its architecture no-regression baseline.
13. Implementation stops only after focused proof passes, a blocker is recorded, or approval is required. Report residual risk and any validation gap.

## Reference Routing

- Read [COMPLEXITY.md](COMPLEXITY.md) for deep modules, change amplification, and information hiding.
- Read [CONSTRUCTION.md](CONSTRUCTION.md) for naming, function shape, and comment discipline.
- Read [DEFENSIVE.md](DEFENSIVE.md) for validation, assertions, and recoverability.
- Read [SMELLS.md](SMELLS.md) to classify the refactor pressure.
- Read [REFACTORINGS.md](REFACTORINGS.md) for concrete behavior-preserving moves.
- Read [PLANNING-LARGE-CHANGES.md](PLANNING-LARGE-CHANGES.md) for vertical-slice planning.
- Read [WORKFLOW-MODES.md](WORKFLOW-MODES.md) to choose behavior for new changes, new codebases, and existing complex codebases.
- Read [LEGACY-CODE.md](LEGACY-CODE.md) when safe change depends on seams, characterization tests, or dependency-breaking.
- Read [DOMAIN-MODELING.md](DOMAIN-MODELING.md) when terms, ownership, bounded contexts, or aggregates are unclear.
- Read [API-COMPATIBILITY.md](API-COMPATIBILITY.md) for public APIs, versioning, idempotency, pagination, and error contracts.
- Read [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md) when timeouts, retries, backpressure, health checks, or observability matter.
- Read [SECURITY-DESIGN.md](SECURITY-DESIGN.md) when trust boundaries, auth, secrets, or attacker paths matter.
- Read [DELIVERY.md](DELIVERY.md) for deploy gates, rollback, migrations, and small-batch delivery.
- Read [PLANNING-ARTIFACTS.md](PLANNING-ARTIFACTS.md) for source-grounded factual research or when work needs staged research/design/outline/plan artifacts instead of one short inline plan.
- Read [EXEC-PLAN-FILES.md](EXEC-PLAN-FILES.md) when the user requested or approved a durable in-repo plan across sessions or agents.
- Read [PARALLELIZATION.md](PARALLELIZATION.md) when a plan may benefit from subagents or split execution.
- Read [TRACER-BULLETS.md](TRACER-BULLETS.md) for greenfield or large-feature first slices.
- Read [PRACTICES.md](PRACTICES.md) for prototypes, reversibility, and broader engineering habits.
- Read [REFACTOR-PLANNING.md](REFACTOR-PLANNING.md) for scoped refactor plans.
- Read [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md) for API and module shape decisions.
- Read [TYPESCRIPT-ADVANCED.md](TYPESCRIPT-ADVANCED.md) when advanced type design is central to the change.
- Read [CHALLENGE-MODE.md](CHALLENGE-MODE.md) only for an explicitly requested interactive grill or a consequential unresolved decision that requires user input.

## Failure Modes

- Skipping directly mentioned inputs and planning from an incomplete picture
- Using greenfield prototype-first behavior on brownfield invariants that require migration discipline
- Skipping the outcome, risk, or proof frame on non-trivial work and discovering the shape mid-edit
- Turning routine work into an artifact pipeline or interactive interview
- Hiding unresolved consequential choices instead of surfacing the tradeoff
- Letting approved multi-session plans drift across compactions or handoffs
- Treating review of a long plan file as a substitute for reading the resulting code
- Delegating tightly serial work or failing to delegate obviously independent work
- Batching unrelated slice work into one opaque commit when the task is being committed incrementally
- Replacing existing behavior while silently weakening an enforced invariant
- Broad cleanup that does not solve the real coupling problem
- More abstraction without more leverage
- Plans that script every tiny action instead of making key decisions explicit
- Shallow modules and noisy interfaces where a deeper module boundary would simplify the change
- Interface changes that optimize internals while making callers harder to reason about
- Editing unfamiliar code before mapping ownership, callers, entrypoints, and proof
- Operational-risk changes that defer state, idempotency, compatibility, security, or test design until review time
