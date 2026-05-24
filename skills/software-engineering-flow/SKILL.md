---
name: software-engineering-flow
description: "Use when starting software-engineering work: coding, debugging, reviews, refactors, architecture, tests, CI, or branches. Routes to the right narrower engineering skill before planning or edits. Not for marketing, docs-only prose, finance, or simple shell lookups."
---

# Software Engineering Flow

## Overview

Use this as the first engineering router. Keep it short: pick the right narrower skill, then execute.
For GPT-5.5, keep prompts outcome-first: name the goal, success evidence, constraints, and stop condition, then let the narrower skill choose the efficient path.

## When to Use

- Software-engineering planning, research, edits, reviews, debugging, or verification
- New features, new codebases, existing complex codebases, refactors, CI, tests, and deploy-readiness work
- Any task where code, architecture, runtime behavior, or verification is the main subject

## When Not to Use

- Marketing, SEO, finance, docs-only prose, or simple shell lookups
- Non-engineering work where another domain skill is the real router

## Minimal Workflow

1. Load this skill before inspecting, planning, editing, or verifying.
2. Choose and load any narrower skill whose trigger fits.
3. If no narrower skill fits, use `writing-software` as the default.
4. First line: chosen skill names and task mode. For non-trivial work, add one compact outcome frame: goal, success evidence, constraints/side effects, and output shape.
5. For implementation or refactor work, ensure the producer gates are covered: `writing-software` for architecture/change shape and `testing-software` for proof shape when behavior risk exists.
6. Keep the task mode explicit: new change, new codebase, existing complex codebase, bug, review, or verification.
7. Before handoff, know the exact verification command or observation and the stop condition.

## Reference Routing

- Unknown bug, failing test, incident, unexpected behavior: `systematic-debugging`
- Known failure with cheap explicit TDD path: `testing-software`
- Bug flow: root cause first when unknown -> `testing-software` when proof shape matters -> `writing-software` only for non-trivial change shape -> `verification-before-completion` before handoff. Ask Q only for missing repro/expected behavior, destructive/live actions, or scope changes.
- Test strategy, flaky tests, coverage shape: `testing-software`
- Implementation/refactor/change shape: `writing-software`
- Skill creation, skill editing, or routing drift: `writing-skills`
- New codebase, existing complex codebase, or long-running change: `writing-software`, then read its `WORKFLOW-MODES.md`
- New feature in an existing complex codebase: use existing-complex-codebase safety posture, then new-change vertical slicing.
- Pattern vs no-pattern or interface-shape debate: `writing-software`, then `INTERFACE-DESIGN.md`
- Plan/design pressure-test or explicit "grill me": `grill-me`
- Storage, distributed systems, consistency, retention, recovery: `designing-data-intensive-systems`
- Rust ownership, traits, async, errors, unsafe: `writing-rust`
- Effect code: `effect-ts`
- Review feedback: `receiving-code-review`
- Post-commit, PR, branch, or WIP quality/simplification review: `review-and-simplify-changes`
- Codebase/test-suite audit: `improve-codebase-architecture` or `improve-test-suite`
- Branch isolation: `using-git-worktrees`
- Completed branch integration choice: `finishing-a-development-branch`
- PR description after code is in place: `describe-pr`
- Final proof before claiming done: `verification-before-completion`

## Failure Modes

- Loading every possible skill instead of the smallest useful set
- Inspecting files before choosing the engineering workflow
- Treating routine implementation as architecture review
- Letting skills override direct user instructions, safety, or repo-local `AGENTS.md`
- Stopping a bug task before root cause, fix, and fresh verification are complete or a real blocker is recorded
