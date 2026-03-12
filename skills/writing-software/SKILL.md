---
name: writing-software
description: Shape software changes with minimal scope, clear module boundaries, and explicit tradeoffs. Use when implementing or refactoring code where change shape, interfaces, naming, or complexity are the main decisions. Not for test-strategy, Rust-specific, or storage-architecture questions.
---

# Writing Software

## Overview

Use this as the default software-engineering skill when no narrower skill dominates.
It should keep changes small, reversible, and easy to reason about, with research and short planning made explicit for non-trivial work.
Use a more exploratory path for greenfield work and a more conservative path for brownfield work.

## When to Use

- Designing or reshaping a code change before editing
- Starting a new subsystem, service, workflow, or greenfield project
- Refactoring complexity, duplication, or interface problems
- Deciding naming, validation, or compatibility boundaries
- Planning a larger change into small vertical slices
- Stress-testing a plan with challenge mode

## When Not to Use

- Use `testing-software` for test selection or suite design
- Use `systematic-debugging` for root-cause investigation
- Use `writing-rust` for Rust-specific API or ownership decisions
- Use `designing-with-patterns` for pattern-vs-no-pattern debates
- Use `designing-data-intensive-systems` for workload, storage, or consistency questions

## Minimal Workflow

1. Read directly mentioned files first, then inspect the current code, callers, and local conventions.
2. State the real problem and the risk boundary.
3. Pick the path explicitly:
   - Greenfield: prototype early when the uncertainty is workflow, UX, integration shape, or developer experience.
   - Brownfield: inspect existing seams, invariants, callers, and migrations before proposing change.
4. For non-trivial work, write a short explicit plan before editing: current-state findings, durable decisions, vertical slices, and verification.
5. Grill every real plan before execution: challenge assumptions, dependency order, verification gaps, and rejected alternatives. Scale the intensity to the task size and risk.
6. For large, multi-session, or multi-agent work, create or update a local exec-plan file in the target repo, typically under `docs/exec-plans/active/`, instead of relying on chat alone.
7. For large unclear work, separate research of current reality from design choice and implementation planning.
8. Decide subagent fit: what stays on the main thread, what can be delegated, which tracks are parallel, and how they will integrate.
9. When replacing an existing script, check, or code path, preserve current guarantees unless you intentionally remove one and justify it.
10. Choose the smallest reversible change that improves the problem.
11. If the task includes commits or a branch workflow, group work into logical commits along slice boundaries instead of one large mixed commit.
12. Name at least one rejected alternative when the choice is non-trivial.
13. Define what must be verified before claiming the shape is sound.

## Reference Routing

- Read [COMPLEXITY.md](COMPLEXITY.md) for deep modules, change amplification, and information hiding.
- Read [CONSTRUCTION.md](CONSTRUCTION.md) for naming, function shape, and comment discipline.
- Read [DEFENSIVE.md](DEFENSIVE.md) for validation, assertions, and recoverability.
- Read [SMELLS.md](SMELLS.md) to classify the refactor pressure.
- Read [REFACTORINGS.md](REFACTORINGS.md) for concrete behavior-preserving moves.
- Read [PLANNING-LARGE-CHANGES.md](PLANNING-LARGE-CHANGES.md) for vertical-slice planning.
- Read [EXEC-PLAN-FILES.md](EXEC-PLAN-FILES.md) when the work needs a durable in-repo plan across sessions or agents.
- Read [PARALLELIZATION.md](PARALLELIZATION.md) when a plan may benefit from subagents or split execution.
- Read [PRACTICES.md](PRACTICES.md) for tracer bullets, prototypes, reversibility, and early product-shape learning.
- Read [REFACTOR-PLANNING.md](REFACTOR-PLANNING.md) for scoped refactor plans.
- Read [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md) for API and module shape decisions.
- Read [TYPESCRIPT-ADVANCED.md](TYPESCRIPT-ADVANCED.md) when advanced type design is central to the change.
- Read [CHALLENGE-MODE.md](CHALLENGE-MODE.md) to grill the plan before execution; use a light pass for small plans and a hard pass for risky ones.

## Failure Modes

- Skipping directly mentioned inputs and planning from an incomplete picture
- Using greenfield prototype-first behavior on brownfield invariants that require migration discipline
- Skipping a short plan on non-trivial work and discovering the shape mid-edit
- Executing an ungrilled plan with hidden assumption, dependency, or verification gaps
- Letting a large plan live only in chat so it drifts across compactions or handoffs
- Delegating tightly serial work or failing to delegate obviously independent work
- Batching unrelated slice work into one opaque commit when the task is being committed incrementally
- Replacing existing behavior while silently weakening an enforced invariant
- Broad cleanup that does not solve the real coupling problem
- More abstraction without more leverage
- Plans that script every tiny action instead of making key decisions explicit
- Shallow modules and noisy interfaces where a deeper module boundary would simplify the change
- Interface changes that optimize internals while making callers harder to reason about
