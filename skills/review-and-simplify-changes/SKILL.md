---
name: review-and-simplify-changes
description: "Use when reviewing or simplifying a commit, PR, branch, or WIP diff after implementation. Adapts reviewer count to material independent tracks; not for unscoped codebase redesign."
---

# Review and simplify changes

## Overview

Use this skill after a commit, PR, branch, or WIP diff to improve code quality without speculative churn.

## When to Use

- Reviewing or simplifying changes after a commit, PR, branch, or work-in-progress diff
- Checking changed code against repo Standards and change Intent from the prompt, explicit spec, plan, task notes, issue, or commit message
- Finding duplication, weak types, dead code, cycles, fallbacks, comments, or code quality issues introduced or exposed by the change
- Applying high-confidence, behavior-preserving cleanup when the user asks for fixes, then validating it

## When Not to Use

- Use `debugging` first when behavior is broken and cause is unknown
- Use `improve-codebase-architecture` for architecture plans without implementation
- Use `test-design` when the main question is test strategy

## Minimal Workflow

1. Use this as the primary skill. Load `effect-ts` or `writing-rust` only when that domain is present, and load the pressure references below only when the diff supplies evidence for them.
2. Pin the review to a commit, PR, branch, fixed point, or WIP diff.
   - For WIP, inspect `git status --short` before choosing the diff.
   - With a fixed point, prefer `git diff <fixed-point>...HEAD` and `git log <fixed-point>..HEAD --oneline`.
   - On a follow-up pass, inspect changes since the previous review, verify accepted fixes, and look for regressions caused by those fixes. Keep unchanged earlier scope closed.
   - If the requested comparison cannot be produced locally and no exact remote base and head are available, stop without a review rather than substituting unrelated branches, PRs, or GitHub comparisons.
   - If a fixed-point diff is empty but unstaged changes exist, report the mismatch and include the unstaged diff only when user intent clearly points at WIP; otherwise ask one narrow scope question.
3. Read repo-local `AGENTS.md`, docs, package scripts, conventions, and change Intent sources: prompt, explicit spec, plan, task notes, issue, or commit message. Use the diff as evidence of touched behavior, not as proof of intent.
4. State the scope, permitted side effects, validation target, and reviewer shape. Use one integrated reviewer for a small or tightly coupled diff. Use bounded independent reviewers when separate context improves the evidence.
5. Before cleanup tracks, judge two axes separately: **Standards** (repo rules, skill guidance, local conventions) and **Intent** (what the change was trying to accomplish). Account for each material Intent requirement as implemented, partial, missing, contradicted, incorrect, or unrequested scope; give tracks a concise digest or source pointers rather than making each rediscover a large spec. Keep those findings separate from cleanup taste.
6. Select material topics from the Eight-Topic Coverage Checklist, then apply Adaptive Reviewer Selection below. Account for every topic as covered or not material to the pinned scope; do not turn the checklist into a required agent count.
7. Implement only findings within the original task scope with clear evidence and low behavior risk when the user asked for fixes. Report pre-existing or out-of-scope findings without changing them. Do not stage, commit, push, or add new dependencies unless explicitly asked.
8. Finish only after accounting for every material topic, deduplicating findings, judging them against Standards and Intent, validating requested fixes, and stating skipped validation or residual risk.

## Adaptive Reviewer Selection

Choose reviewer count from the pinned diff's material, separable review work. The eight topics below are a coverage checklist, not an assignment quota.

- Keep a small or tightly coupled diff with the main agent as one integrated reviewer, covering all material topics together so related evidence stays in one context. Use an independent reviewer only when a separate pass would materially improve confidence.
- Use the minimum useful bounded set of independent subagents when distinct subsystems, contracts, or risk areas benefit from separate context. A reviewer may cover one or more related topics; split work only where independence improves evidence or reduces context interference.
- Discover active subagent capacity before dispatch. Start independent reviewers together when slots are available; otherwise run bounded waves. If subagents are unavailable, review locally when the scope remains tractable and disclose the missing independent pass; stop blocked when trustworthy coverage would require it.
- Give each reviewer the same pinned scope and Standards/Intent digest plus its material focus. Keep reviewers read-only: no edits, staging, commits, pushes, or state mutation.
- Tell independent Codex reviewers not to invoke this skill or any repo post-code review gate recursively.
- Require file/symbol, checklist topic, issue, recommended fix, confidence, evidence, and validation needed. A reviewer may report no finding.
- The main agent owns checklist accounting, synthesis, judgment, edits, validation, and completion claims.

## Read-only branch reviews

When the requested scope is a branch, PR, or findings-only review, make the read-only contract and any user-narrowed lane concrete before delegating reviewers:
- Pin base, head, dirty state, relevant untracked source, and ignored generated/artifact dirs with `git status --short`, `git log <base>..HEAD --oneline`, and the relevant diff/stat commands.
- Pass each reviewer the same pinned scope and require it to trace changed symbols through callers, tests, config, and public contracts before reporting a finding.
- Compare base vs HEAD before claiming a new dead-code path, fallback removal, cycle, contract drift, or other regression.
- Do not run validators that write caches, incremental build state, snapshots, or generated artifacts during a read-only review unless the repo provides a no-write mode; after allowed checks, rerun `git status --short`, then disclose skipped validators, evidence used, and any unexpected worktree changes.

## Eight-topic coverage checklist

Use these topics to select and account for material coverage. Each reviewer inspects the diff plus relevant callers, tests, Standards, and Intent context; one reviewer may cover multiple related topics, and a topic may be explicitly not material to the pinned scope.

1. **DRY/deduplication**: consolidate duplication only when it reduces complexity; reject shallow abstractions.
2. **Shared types/contracts**: find duplicate or drifting type definitions; consolidate only where ownership is genuinely shared. When runtime gates separate raw or external payload variants from domain objects, verify exported/static contracts preserve that split instead of advertising guarded variants as happy-path domain types.
3. **Unused code**: use existing tools such as `knip`, compiler/linter output, exports, imports, and repo search; remove only when references are disproven.
4. **Circular dependencies**: use `madge` or import graph checks; check file-level SCCs and coarser directory/module boundary graphs, especially new base-vs-HEAD cross-boundary edges. A zero file-SCC count does not clear a boundary-cycle finding. Untangle with the smallest boundary move.
5. **Weak types**: replace `any`, `unknown`, casts, and language equivalents only after researching real payloads, callers, and package types. For raw or external payloads, `unknown` or an untrusted boundary type may be correct until guards or schema parsing narrow it.
6. **Error handling**: remove try/catch/fallbacks that hide errors; keep boundary handling for unknown input, external systems, cleanup, retries, or user-safe errors.
7. **Legacy/fallback paths**: remove only after proving no live caller, config, migration, or rollout dependency remains.
8. **AI slop/comments/stubs**: remove stubs, stale migration notes, and filler comments; keep concise intent comments.

Keep Standards and Intent findings on separate axes in synthesis. If Intent is unavailable, say that instead of inventing requirements from the diff.

## Reference Routing

During aggregation, check whether the right skills were used:

- `engineering/references/boundary-design.md` for deep modules, change amplification, information hiding, caller-first interfaces, misuse risk, and deletion-test pressure
- `engineering/references/feature-shape.md` for tracer bullets and production-complete vertical slices
- `engineering/references/legacy-change.md` for characterization seams and dependency-breaking
- `improve-codebase-architecture/AGENT_FRIENDLY_REVIEW.md` for seam quality, agent navigability, domain fit, and verification pain
- `engineering/references/compatibility-and-delivery.md`, `security.md`, or `state-and-effects.md` when those risks appear
- `engineering/references/proof.md` for proof shape, especially behavior-preserving refactors
- [URL-ATTRIBUTION-REVIEW.md](URL-ATTRIBUTION-REVIEW.md) only for URL, link, campaign attribution, analytics, or CTA-helper changes

If a needed skill was missing, call that out in the final summary. If the skill guidance itself caused misrouting, ambiguity, or unsafe behavior, propose the smallest update to that skill.

## Architecture alignment

Each review must judge changes against the active SWE principles, not generic cleanup taste:

- Deep modules / information hiding: `engineering/references/boundary-design.md`
- Caller-first interfaces / deletion test / module-interface-depth-seam-adapter vocabulary: `engineering/references/boundary-design.md`
- Safe brownfield seams: `engineering/references/legacy-change.md`
- Navigability, domain language, seam quality, verification pain: `improve-codebase-architecture`
- Behavior-focused public-interface tests: `test-design`

Flag a finding only when it improves one of those principles with evidence. Do not recommend DRY, type consolidation, patterns, or cleanup unless the linked skill would support the move.

## Upstream prevention

Before finalizing, classify important findings as pre-existing debt, regression from current changes, preventable by `engineering`, preventable by `debugging`, preventable by `test-design`, repo-doc candidate, or memory candidate.
If a producer skill should have prevented a repeated or high-cost issue, propose the smallest skill/reference update instead of expanding this review skill.
Do not auto-edit memory, repo docs, or skills unless the user asked for that mutation.

## Validation

Run the smallest trustworthy validation for touched scope: focused tests, typecheck/compile, lint/format, and dead-code or cycle tool reruns when those tracks changed code.

If validation is too broad, unavailable, or skipped by instruction, say exactly why.

## Failure modes

- Rewrite-by-cleanup; treating the checklist as an agent quota; diff impressions mistaken for requirement traceability; deleting dynamic use after one search; merging different domain types; removing boundary defense; fake precise types; overlapping edits; recs without safe fixes.
