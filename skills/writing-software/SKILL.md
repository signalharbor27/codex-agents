---
name: writing-software
description: Shape software changes with minimal scope, clear module boundaries, and explicit tradeoffs. Use when implementing or refactoring code where change shape, interfaces, naming, or complexity are the main decisions. Not for test-strategy, Rust-specific, or storage-architecture questions.
---

# Writing Software

## Overview

Use this as the default software-engineering skill when no narrower skill dominates.
It should keep changes small, reversible, and easy to reason about.

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

1. Inspect the current code, callers, and local conventions.
2. State the real problem and the risk boundary.
3. Choose the smallest reversible change that improves the problem.
4. Name at least one rejected alternative when the choice is non-trivial.
5. Define what must be verified before claiming the shape is sound.

## Reference Routing

- Read [COMPLEXITY.md](COMPLEXITY.md) for deep modules, change amplification, and information hiding.
- Read [CONSTRUCTION.md](CONSTRUCTION.md) for naming, function shape, and comment discipline.
- Read [DEFENSIVE.md](DEFENSIVE.md) for validation, assertions, and recoverability.
- Read [SMELLS.md](SMELLS.md) to classify the refactor pressure.
- Read [REFACTORINGS.md](REFACTORINGS.md) for concrete behavior-preserving moves.
- Read [PLANNING-LARGE-CHANGES.md](PLANNING-LARGE-CHANGES.md) for vertical-slice planning.
- Read [REFACTOR-PLANNING.md](REFACTOR-PLANNING.md) for scoped refactor plans.
- Read [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md) for API and module shape decisions.
- Read [TYPESCRIPT-ADVANCED.md](TYPESCRIPT-ADVANCED.md) when advanced type design is central to the change.
- Read [CHALLENGE-MODE.md](CHALLENGE-MODE.md) when the plan still has unresolved tradeoffs.

## Failure Modes

- Broad cleanup that does not solve the real coupling problem
- More abstraction without more leverage
- Plans that script every tiny action instead of making key decisions explicit
- Interface changes that optimize internals while making callers harder to reason about
