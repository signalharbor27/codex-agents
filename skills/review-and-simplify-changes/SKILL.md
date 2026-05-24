---
name: review-and-simplify-changes
description: "Review and simplify committed, PR, branch, or WIP changes with eight fresh read-only review tracks every time. Use when the user asks to review, clean up, de-slop, deduplicate, remove dead code, or improve code quality after changes are made."
---

# Review and Simplify Changes

## Overview

Use this after a commit, PR, branch, or WIP diff to improve code quality without speculative churn.
Every run uses the same eight fresh read-only review tracks; do not select a smaller review mode.

## When to Use

- Reviewing or simplifying changes after a commit, PR, branch, or work-in-progress diff
- Checking changed code against documented standards and an originating issue, PRD, or spec
- Finding duplication, weak types, dead code, cycles, fallbacks, comments, or code quality issues introduced or exposed by the change
- Applying high-confidence, behavior-preserving cleanup when the user asks for fixes, then validating it

## When Not to Use

- Use `systematic-debugging` first when behavior is broken and cause is unknown
- Use `improve-codebase-architecture` for architecture plans without implementation
- Use `testing-software` when the main question is test strategy

## Minimal Workflow

1. Load `software-engineering-flow`, then this skill. Load narrower skills as needed: `writing-software`, `testing-software`, `effect-ts`, `writing-rust`, and `verification-before-completion`.
2. Pin the review scope: commit, PR, branch, fixed point, or WIP diff. Prefer `git diff <fixed-point>...HEAD` and `git log <fixed-point>..HEAD --oneline` when a fixed point is provided; otherwise choose the safest obvious comparison or ask only when it materially changes the review.
3. Read repo-local `AGENTS.md`, docs, package scripts, conventions, and any originating issue, PRD, spec, or commit references before judging.
4. State scope, allowed side effects, validation target, and that all subagents are read-only.
5. Launch all eight review tracks every time. The main agent owns synthesis, judgment, edits, validation, and completion claims.
6. Implement only findings with clear evidence and low behavior risk when the user asked for fixes. Do not stage, commit, push, or add new dependencies unless explicitly asked.

## Fresh Review Agents

Every review pass must use brand-new subagents so current-thread bias does not shape findings. This is a hard rule for this skill.

- Give each subagent only the review scope, repo instructions, relevant skill requirements, and its role.
- Keep review subagents read-only. They must not edit, stage, commit, push, or mutate state.
- Ask for concise structured findings: file/symbol, category, issue, recommended fix, confidence, and evidence.
- If subagents are unavailable, stop and say the required review method is blocked.
- The main agent owns synthesis, judgment, edits, validation, and completion claims.

## Eight Review Tracks

Launch all eight fresh parallel track agents for every review. Tell them they are not alone in the codebase, must stay read-only, must not revert others' work, and should inspect the diff plus relevant callers, tests, standards, and spec context. A track may report "no finding".

1. **DRY/deduplication**: consolidate duplication only when it reduces complexity; reject shallow abstractions.
2. **Shared types/contracts**: find duplicate or drifting type definitions; consolidate only where ownership is genuinely shared.
3. **Unused code**: use existing tools such as `knip`, compiler/linter output, exports, imports, and repo search; remove only when references are disproven.
4. **Circular dependencies**: use `madge` or import graph checks; untangle with the smallest boundary move.
5. **Weak types**: replace `any`, `unknown`, casts, and language equivalents only after researching real payloads, callers, and package types.
6. **Error handling**: remove try/catch/fallbacks that hide errors; keep boundary handling for unknown input, external systems, cleanup, retries, or user-safe errors.
7. **Legacy/fallback paths**: remove only after proving no live caller, config, migration, or rollout dependency remains.
8. **AI slop/comments/stubs**: remove stubs, stale migration notes, and filler comments; keep concise intent comments.

Each track must produce file/symbol, category, issue, recommended fix, confidence, evidence gathered, and validation needed. Keep standards and spec findings on their own axis in synthesis; if no spec exists, say that instead of inventing requirements.

## Reference Routing

During aggregation, check whether the right skills were used:

- `writing-software/COMPLEXITY.md` for deep modules, change amplification, cognitive load, and information hiding
- `writing-software/INTERFACE-DESIGN.md` for caller-first interfaces, misuse risk, and deletion-test pressure
- `writing-software/WORKFLOW-MODES.md` for new change vs new codebase vs complex existing codebase
- `writing-software/LEGACY-CODE.md` for characterization seams and dependency-breaking
- `improve-codebase-architecture/AGENT_FRIENDLY_REVIEW.md` for seam quality, agent navigability, domain fit, and verification pain
- `writing-software/API-COMPATIBILITY.md`, `SECURITY-DESIGN.md`, `PRODUCTION-READINESS.md`, or `DELIVERY.md` when those risks appear
- `testing-software` for proof shape, especially behavior-preserving refactors

If a needed skill was missing, call that out in the final summary. If the skill guidance itself caused misrouting, ambiguity, or unsafe behavior, propose the smallest update to that skill.

## Architecture Alignment

Each review must judge changes against the active SWE principles, not generic cleanup taste:

- Deep modules / information hiding: `writing-software/COMPLEXITY.md`
- Caller-first interfaces / deletion test: `writing-software/INTERFACE-DESIGN.md`
- Safe brownfield seams: `writing-software/LEGACY-CODE.md` and `WORKFLOW-MODES.md`
- Navigability, domain language, seam quality, verification pain: `improve-codebase-architecture`
- Behavior-focused public-interface tests: `testing-software`

Flag a finding only when it improves one of those principles with evidence. Do not recommend DRY, type consolidation, patterns, or cleanup unless the linked skill would support the move.

## Upstream Prevention

Before finalizing, classify important findings as pre-existing debt, regression from current changes, preventable by `software-engineering-flow`, preventable by `writing-software`, preventable by `testing-software`, repo-doc candidate, or memory candidate.
If a producer skill should have prevented a repeated or high-cost issue, propose the smallest skill/reference update instead of expanding this review skill.
Do not auto-edit memory, repo docs, or skills unless the user asked for that mutation.

## Validation

Run the smallest trustworthy validation for touched scope: focused tests, typecheck/compile, lint/format, and dead-code or cycle tool reruns when those tracks changed code.

If validation is too broad, unavailable, or skipped by instruction, say exactly why.

## Failure Modes

- Rewrite-by-cleanup; deleting dynamic use after one search; merging different domain types; removing boundary defense; fake precise types; overlapping edits; recs without safe fixes.
