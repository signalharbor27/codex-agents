---
name: writing-software
description: Shape software changes with minimal scope, clear module boundaries, and explicit tradeoffs. Use when implementing or refactoring code where change shape, interfaces, naming, or complexity are the main decisions. Not for test-strategy, Rust-specific, or storage-architecture questions.
---

# Writing Software

## Overview

Use this as the default software-engineering skill when no narrower skill dominates.
It should keep changes small, reversible, and easy to reason about, with research and short planning made explicit for non-trivial work.

## When to Use

- Designing or reshaping a code change before editing
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
3. For non-trivial work, write a short explicit plan before editing: current-state findings, durable decisions, vertical slices, and verification.
4. For large, multi-session, or multi-agent work, create or update a local exec-plan file in `docs/exec-plans/active/` instead of relying on chat alone.
5. For large unclear work, separate research of current reality from design choice and implementation planning.
6. Decide subagent fit: what stays on the main thread, what can be delegated, which tracks are parallel, and how they will integrate.
7. When replacing an existing script, check, or code path, preserve current guarantees unless you intentionally remove one and justify it.
8. Choose the smallest reversible change that improves the problem.
9. Name at least one rejected alternative when the choice is non-trivial.
10. Define what must be verified before claiming the shape is sound.

## Reference Routing

- Read [COMPLEXITY.md](COMPLEXITY.md) for deep modules, change amplification, and information hiding.
- Read [CONSTRUCTION.md](CONSTRUCTION.md) for naming, function shape, and comment discipline.
- Read [DEFENSIVE.md](DEFENSIVE.md) for validation, assertions, and recoverability.
- Read [SMELLS.md](SMELLS.md) to classify the refactor pressure.
- Read [REFACTORINGS.md](REFACTORINGS.md) for concrete behavior-preserving moves.
- Read [PLANNING-LARGE-CHANGES.md](PLANNING-LARGE-CHANGES.md) for vertical-slice planning.
- Read [EXEC-PLAN-FILES.md](EXEC-PLAN-FILES.md) when the work needs a durable in-repo plan across sessions or agents.
- Read [PARALLELIZATION.md](PARALLELIZATION.md) when a plan may benefit from subagents or split execution.
- Read [REFACTOR-PLANNING.md](REFACTOR-PLANNING.md) for scoped refactor plans.
- Read [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md) for API and module shape decisions.
- Read [TYPESCRIPT-ADVANCED.md](TYPESCRIPT-ADVANCED.md) when advanced type design is central to the change.
- Read [CHALLENGE-MODE.md](CHALLENGE-MODE.md) when the plan still has unresolved tradeoffs.

## Failure Modes

- Skipping directly mentioned inputs and planning from an incomplete picture
- Skipping a short plan on non-trivial work and discovering the shape mid-edit
- Letting a large plan live only in chat so it drifts across compactions or handoffs
- Delegating tightly serial work or failing to delegate obviously independent work
- Replacing existing behavior while silently weakening an enforced invariant
- Broad cleanup that does not solve the real coupling problem
- More abstraction without more leverage
- Plans that script every tiny action instead of making key decisions explicit
- Shallow modules and noisy interfaces where a deeper module boundary would simplify the change
- Interface changes that optimize internals while making callers harder to reason about
