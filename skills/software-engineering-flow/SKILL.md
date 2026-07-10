---
name: software-engineering-flow
description: "Use when starting software engineering. Routes understood regressions with cheap failing tests to testing-software; operational-risk implementation to writing-software plus testing-software; directly owns in-progress merge/rebase conflicts."
---

# Software Engineering Flow

## Overview

Use this as the first engineering router. Keep it short: pick the right narrower skill, then execute.
For GPT-5.6, keep prompts outcome-first: name the goal, success evidence, important constraints or approval boundaries, and stop condition; let the narrower skill choose routine steps.
Preserve required evidence and artifacts. Prefer a small task-specific structure over generic brevity rules or an always-on response template.

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
3. If no narrower skill fits, use `writing-software` as the default. Exception: this skill directly owns in-progress merge or rebase conflict resolution; do not add a generic narrower skill.
4. State the chosen skills and task mode. For non-trivial work, add one compact outcome frame: goal, success evidence, constraints/side effects, and output shape.
5. Before implementation or refactoring, classify risk. Operational risk includes money/credits, auth/security/privacy, external or live side effects, database schema or migrations, webhooks/events/queues/workers/schedulers, concurrency/idempotency, or generated public contracts. Module count changes planning depth, not risk by itself.
6. Operational-risk producer preflight is blocking:
   - load `writing-software` and `testing-software`
   - load relevant references for the risk, especially `INTERFACE-DESIGN.md`, `COMPLEXITY.md`, `API-COMPATIBILITY.md`, `PRODUCTION-READINESS.md`, `SECURITY-DESIGN.md`, and `DELIVERY.md`
   - state the intended deep module or application boundary, what callers should not know, durable state and side-effect sequence, idempotency/recovery shape, compatibility risk, and test matrix
   - do not edit until likely architecture/test-suite review findings are either resolved in the plan or explicitly accepted as debt
7. For lower-risk work, load `writing-software` when change shape is non-trivial and `testing-software` when behavior needs proof.
8. Before an implementation handoff, load `verification-before-completion` and run the exact command or observation required by the stop condition.
9. Before an intended commit, inspect the final diff and rerun relevant verification. Use `review-and-simplify-changes` when Q requests broad review or the agreed scope includes it; preserve that skill's Eight-Agent Invariant.

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
- In-progress merge or rebase conflict: inspect both intents, preserve both when compatible, run the smallest no-write checks after resolving, and do not abort, stage, commit, or continue without explicit user approval
- Branch isolation: `using-git-worktrees`
- Completed branch integration choice: `finishing-a-development-branch`
- PR description after code is in place: `describe-pr`
- Final proof before claiming done: `verification-before-completion`

## Failure Modes

- Loading every possible skill instead of the smallest useful set
- Inspecting files before choosing the engineering workflow
- Treating routine implementation as architecture review
- Treating high-risk implementation like routine implementation and discovering architecture or test-suite findings only after the code is written
- Treating producer standards as vibes instead of blocking pre-edit gates
- Letting skills override direct user instructions, safety, or repo-local `AGENTS.md`
- Stopping a bug task before root cause, fix, and fresh verification are complete or a real blocker is recorded
