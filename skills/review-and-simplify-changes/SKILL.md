---
name: review-and-simplify-changes
description: "Use when the user asks to review, simplify, clean up, refactor, deduplicate, de-slop, remove dead code, improve code quality, or run a repo-wide cleanup. Covers scoped diffs and broad codebase cleanup with parallel agents."
---

# Review and Simplify Changes

## Overview

Use this to improve code quality without speculative churn. Choose the smallest mode that matches the request.

## When to Use

- Reviewing or simplifying a git diff, explicit files, or recent changes
- Cleaning up a whole repo or subsystem for duplication, weak types, dead code, cycles, fallbacks, comments, or code quality
- Applying high-confidence, behavior-preserving cleanup and then validating it

## When Not to Use

- Use `systematic-debugging` first when behavior is broken and cause is unknown
- Use `improve-codebase-architecture` for architecture plans without implementation
- Use `testing-software` when the main question is test strategy

## Minimal Workflow

1. Load `software-engineering-flow`, then this skill. Load narrower skills as needed: `writing-software`, `testing-software`, `effect-ts`, `writing-rust`, and `verification-before-completion`.
2. Select mode:
   - `scoped-review`: diff or named files, review-only unless user asks fixes
   - `scoped-fix`: diff or named files, apply high-confidence safe fixes
   - `repo-cleanup`: explicit broad cleanup/codebase-quality request
3. Read repo-local `AGENTS.md`, docs, package scripts, and conventions before judging.
4. State scope, mode, allowed side effects, validation target, and whether subagents will edit or only research.
5. Implement only findings with clear evidence and low behavior risk. Do not stage, commit, push, or add new dependencies unless explicitly asked.

## Fresh Review Agents

Every review pass must use brand-new subagents so current-thread bias does not shape findings. This is a hard rule for this skill.

- Give each subagent only the review scope, repo instructions, relevant skill requirements, and its role.
- Keep review subagents read-only. They must not edit, stage, commit, push, or mutate state.
- Ask for concise structured findings: file/symbol, category, issue, recommended fix, confidence, and evidence.
- If subagents are unavailable, stop and say the required review method is blocked.
- The main agent owns synthesis, judgment, edits, validation, and completion claims.

## Scoped Review

For diff or explicit-file review, launch four fresh read-only subagents:

- reuse/deduplication
- quality/types/boundaries
- efficiency/hot paths
- clarity/standards/comments

Return findings as: file/symbol, category, issue, fix, confidence. In fix mode, the main agent applies only high-confidence behavior-preserving fixes.

## Repo Cleanup

For explicit broad cleanup, launch eight fresh parallel track agents. Default them to read-only research. Use worker subagents only after ownership can be made disjoint; otherwise integrate locally. Tell workers they are not alone in the codebase, must not revert others' work, and must list changed files.

1. **DRY/deduplication**: consolidate duplication only when it reduces complexity; reject shallow abstractions.
2. **Shared types/contracts**: find duplicate or drifting type definitions; consolidate only where ownership is genuinely shared.
3. **Unused code**: use existing tools such as `knip`, compiler/linter output, exports, imports, and repo search; remove only when references are disproven.
4. **Circular dependencies**: use `madge` or import graph checks; untangle with the smallest boundary move.
5. **Weak types**: replace `any`, `unknown`, casts, and language equivalents only after researching real payloads, callers, and package types.
6. **Error handling**: remove try/catch/fallbacks that hide errors; keep boundary handling for unknown input, external systems, cleanup, retries, or user-safe errors.
7. **Legacy/fallback paths**: remove only after proving no live caller, config, migration, or rollout dependency remains.
8. **AI slop/comments/stubs**: remove stubs, stale migration notes, and filler comments; keep concise intent comments.

Each track must produce:

- evidence gathered, including commands/tools used
- critical assessment of current code
- candidate fixes, or implemented fixes only for explicitly assigned worker tracks
- remaining medium/low-confidence recommendations
- validation needed for its changes

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

## Validation

Run the smallest trustworthy validation for touched scope: focused tests, typecheck/compile, lint/format, and dead-code or cycle tool reruns when those tracks changed code.

If validation is too broad, unavailable, or skipped by instruction, say exactly why.

## Failure Modes

- Rewrite-by-cleanup; deleting dynamic use after one search; merging different domain types; removing boundary defense; fake precise types; overlapping edits; recs without safe fixes.
