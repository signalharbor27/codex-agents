---
name: review-and-simplify-changes
description: Review and simplify committed, PR, branch, or WIP diffs. Use when asked to review since X, clean up changes, compare Standards vs Intent, or run broad read-only tracks; honor explicit single-track findings-only scope.
---

# Review and Simplify Changes

## Overview

Use this after a commit, PR, branch, or WIP diff to improve code quality without speculative churn.
Broad review runs use the same eight fresh read-only review tracks; do not select a smaller review mode yourself.
Exception: when the user explicitly names one track and asks for a read-only, findings-only, or single-track review, run only that requested track and state that the scope was user-narrowed.

## When to Use

- Reviewing or simplifying changes after a commit, PR, branch, or work-in-progress diff
- Checking changed code against repo Standards and change Intent from the prompt, explicit spec, plan, task notes, issue, or commit message
- Finding duplication, weak types, dead code, cycles, fallbacks, comments, or code quality issues introduced or exposed by the change
- Applying high-confidence, behavior-preserving cleanup when the user asks for fixes, then validating it

## When Not to Use

- Use `systematic-debugging` first when behavior is broken and cause is unknown
- Use `improve-codebase-architecture` for architecture plans without implementation
- Use `testing-software` when the main question is test strategy

## Minimal Workflow

1. Load `software-engineering-flow`, then this skill. Load narrower skills as needed: `writing-software`, `testing-software`, `effect-ts`, `writing-rust`, and `verification-before-completion`.
2. Pin the review scope: commit, PR, branch, fixed point, or WIP diff. If the user says WIP, always inspect `git status --short` before choosing the diff. Prefer `git diff <fixed-point>...HEAD` and `git log <fixed-point>..HEAD --oneline` when a fixed point is provided; otherwise choose the safest obvious comparison or ask only when it materially changes the review.
   - If a fixed-point diff is empty but unstaged changes exist, report the mismatch and include the unstaged diff only when user intent clearly points at WIP; otherwise ask one narrow scope question.
3. Read repo-local `AGENTS.md`, docs, package scripts, conventions, and change Intent sources: prompt, explicit spec, plan, task notes, issue, or commit message. Use the diff as evidence of touched behavior, not as proof of intent.
4. State scope, allowed side effects, validation target, and that all subagents are read-only.
5. Before cleanup tracks, judge two axes separately: **Standards** (repo rules, skill guidance, local conventions) and **Intent** (what the change was trying to accomplish). Keep those findings separate from cleanup taste.
6. Launch all eight review tracks for broad reviews. For the explicit single-track exception, launch only that track. The main agent owns synthesis, judgment, edits, validation, and completion claims.
7. Implement only findings with clear evidence and low behavior risk when the user asked for fixes. Do not stage, commit, push, or add new dependencies unless explicitly asked.

## Fresh Review Agents

Every review pass must use brand-new subagents for broad reviews so current-thread bias does not shape findings. This is a hard rule for broad reviews.

- Give each subagent only the review scope, repo instructions, relevant skill requirements, and its role.
- Keep review subagents read-only. They must not edit, stage, commit, push, or mutate state.
- Ask for concise structured findings: file/symbol, category, issue, recommended fix, confidence, and evidence.
- If subagents are unavailable for a broad review, stop and say the required review method is blocked.
- For an explicit single-track read-only review, use one fresh subagent when available; if not, perform that track locally, keep it read-only, and disclose that no fresh subagent was available.
- The main agent owns synthesis, judgment, edits, validation, and completion claims.

## Read-Only Branch Reviews

When the requested scope is a branch, PR, or findings-only review, make the read-only contract and any user-narrowed lane concrete before launching tracks:
- Pin base, head, dirty state, relevant untracked source, and ignored generated/artifact dirs with `git status --short`, `git log <base>..HEAD --oneline`, and the relevant diff/stat commands.
- Pass each track the same pinned scope and require it to trace changed symbols through callers, tests, config, and public contracts before reporting a finding.
- Compare base vs HEAD before claiming a new dead-code path, fallback removal, cycle, contract drift, or other regression.
- Do not run validators that write caches, incremental build state, snapshots, or generated artifacts during a read-only review unless the repo provides a no-write mode; after allowed checks, rerun `git status --short`, then disclose skipped validators, evidence used, and any unexpected worktree changes.

## Eight Review Tracks

Launch all eight fresh parallel track agents for every broad review. Tell them they are not alone in the codebase, must stay read-only, must not revert others' work, and should inspect the diff plus relevant callers, tests, Standards, and Intent context. A track may report "no finding".

1. **DRY/deduplication**: consolidate duplication only when it reduces complexity; reject shallow abstractions.
2. **Shared types/contracts**: find duplicate or drifting type definitions; consolidate only where ownership is genuinely shared.
3. **Unused code**: use existing tools such as `knip`, compiler/linter output, exports, imports, and repo search; remove only when references are disproven.
4. **Circular dependencies**: use `madge` or import graph checks; check file-level SCCs and coarser directory/module boundary graphs, especially new base-vs-HEAD cross-boundary edges. A zero file-SCC count does not clear a boundary-cycle finding. Untangle with the smallest boundary move.
5. **Weak types**: replace `any`, `unknown`, casts, and language equivalents only after researching real payloads, callers, and package types.
6. **Error handling**: remove try/catch/fallbacks that hide errors; keep boundary handling for unknown input, external systems, cleanup, retries, or user-safe errors.
7. **Legacy/fallback paths**: remove only after proving no live caller, config, migration, or rollout dependency remains.
8. **AI slop/comments/stubs**: remove stubs, stale migration notes, and filler comments; keep concise intent comments.

Each track must produce file/symbol, category, issue, recommended fix, confidence, evidence gathered, and validation needed. Keep Standards and Intent findings on their own axes in synthesis; if Intent is unavailable, say that instead of inventing requirements from the diff.

## Change-Specific Checks

When reviewing URL, link, campaign attribution, analytics, or CTA helper changes, check:

- One shared allowlist, predicate, or parser owns which URLs may be mutated; inline scripts and typed helpers must not drift.
- Non-HTTP schemes such as `mailto:` and `tel:`, protocol-relative URLs, relative URLs, malformed URLs, and hash-only links stay valid.
- Analytics canonicalization and attribution mutation agree on the same URL contract.
- Tests cover parity between DOM patchers, typed utilities, and public link helpers when more than one layer handles the same URL.

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
- Caller-first interfaces / deletion test / module-interface-depth-seam-adapter vocabulary: `writing-software/INTERFACE-DESIGN.md`
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
