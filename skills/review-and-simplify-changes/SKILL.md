---
name: review-and-simplify-changes
description: "Use when implementation is ready for handoff or commit, or when reviewing commits, PRs, branches, WIP diffs, or subsequent fixes. Excludes unscoped architecture audits and standalone feedback triage."
---

# Review and simplify changes

## Overview

Independent subagents review every change, small ones included, against the coding standards and the change's Intent. Review runs in bounded rounds: one full review, one fix wave, then a verifier that reruns the evidence. A finding blocks only with evidence; everything else is a lead or an audit item, listed once. Pre-existing problems in touched files are listed, never fixed here. The main agent sizes the review to the risk, judges findings, owns fixes and integration, and records the completed review; its own inspection cannot satisfy review coverage.

## When to Use

- The gate before an implementation handoff or intended commit: review the full intended change, then each subsequent fix
- A request to review or simplify an explicitly scoped commit, PR, branch, or work-in-progress diff

## When Not to Use

- Broken behavior with an unknown cause: use `debugging` first.
- Architecture plans without implementation: use `improve-codebase-architecture`.
- Test strategy as the main question: use `test-design`.
- Triaging review comments someone else wrote: use `receiving-code-review`.

## Minimal Workflow

1. Pin the review to a commit, PR, branch, fixed point, or WIP diff. Done when the base and the reviewed head or WIP diff are named.
   - For WIP, inspect `git status --short` before choosing the diff. For a branch, resolve the comparison ref and its upstream, use the upstream when it is ahead, and pin the merge base; for one commit or explicit snapshots, use those endpoints. Follow-up passes use the progressive loop below.
   - If the requested comparison cannot be produced locally and no exact remote base and head are available, stop without a review; unrelated branches, PRs, or GitHub comparisons are no substitute.
   - If a fixed-point diff is empty but unstaged changes exist, report the mismatch and include the unstaged diff only when user intent clearly points at WIP; otherwise ask one narrow scope question.
2. Gather Standards and Intent. Standards are [references/coding-standards.md](references/coding-standards.md), a repo-root `CODING_STANDARDS.md` when present (the repo rule wins on conflict), and repo `AGENTS.md`, docs, and package-script conventions. Intent comes from the prompt, spec, plan, task notes, issue, or commit message; the diff is evidence of touched behavior, not of intent. If Intent is unavailable, say so and derive no requirements from the diff. Done when every Standards source is located and Intent is digested or reported unavailable.
3. State the scope, permitted side effects, and validation target.
4. Choose a review lane (below), then read [references/delegated-review.md](references/delegated-review.md) and brief the reviewers. Every brief names both Standards paths, the pinned scope, the Intent digest, and the assigned coverage topics.
5. Reviewers inspect every changed path and its affected callers, tests, config, and contracts for correctness, security, performance, and maintainability, and return cited findings in two reports: defects, and Standards/Intent. They account for each material requirement as implemented, partial, missing, contradicted, incorrect, or unrequested.
6. Collect results and account for each requirement and checklist topic as covered or not material. Delegate any uncovered material topic, including coverage lost when a reviewer fails; a quick main-agent check cannot close it.
7. Apply fixes within the user's existing authorization (see the rounds below). Keep cleanup behavior-preserving and verify intentional behavior changes against the requested outcome. Routine dependencies may be added within the authorized outcome; ask about material scope, architecture, cost, or external effects. Report findings outside the touched files and their direct tests without changing them. A standalone review is read-only. Do not stage, commit, or push unless authorized. Done when a standalone review returns findings, coverage, and proof gaps, or any other review's rounds close.

## Review lanes

Select the minimum useful reviewer set for the lane, sized to separable risk rather than to the eight topics. Every lane keeps independent subagent review, and each substantive reviewer covers Standards, Intent, and simplification for its scope as well as correctness.

- **Default**: one `reviewer` covers correctness, simplification, and Standards/Intent for a coupled diff.
- **Separable**: one `reviewer` per genuinely independent subsystem or risk, in parallel; group coupled topics under one reviewer.
- **One-way door or hot path**: any one-way trigger in [describe-pr's merge-danger reference](../describe-pr/references/merge-danger.md), or a hot path or realtime change. To the default or separable lane, add one `design_reviewer`, both `oracle` seats with a `judge` reconciling them, and a blast-radius pass.
- **Large change**: the diff adds a module or subsystem, or changes more than about 500 non-generated source lines. Add one `design_reviewer` running `improve-codebase-architecture` and one `reviewer` running `improve-test-suite`, in parallel, each scoped to the touched subsystems, in round 1 only. Their findings take the standards' dispositions; record the audited subsystems in the PR body when a PR exists, otherwise in the handoff.
- **Research or prototype** with no production path: one `reviewer`; skip `design_reviewer` and architecture or test-suite audits.

Reviewers independently classify the change's Merge danger (door and blast radius) against that reference. When they or the PR footer disagree, the more severe value of each wins, using that reference's severity order, and that classification is recorded with `--door` and `--blast-radius`.

## Review rounds

A review has two rounds, then Q. Each finding gets an ID (`F1`, `F2`, ...) that later rounds cite; a finding that restates a listed ID is not new.

1. Round 1: snapshot the completed changes, then have independent subagents review the entire intended diff, including relevant staged, unstaged, and untracked source. Record in task context the base and reviewed head or reproducible WIP snapshot (including untracked files; `HEAD` alone cannot identify WIP), reviewer assignments, covered paths and topics, findings with IDs, and validation. For parallel slices, round 1 covers the combined diff and cross-slice wiring; an acceptance review a slice already had counts toward it.
2. Judge every finding against repository evidence and give it a disposition from the standards: blocker, fix once, lead, or audit item. A finding raised independently by two model families is strong signal; a lone finding still stands or falls on its evidence. Track each as open, fixed awaiting verification, verified fixed, rejected with evidence, deferred by Q, or listed (leads and audit items, terminal once listed), and explain rejections.
3. Fix wave: apply every blocker and fix-once finding in one batch, then run affected checks.
   - `fix: clear` findings go to one `refiner` with the pinned snapshot, the findings verbatim, both Standards paths, and the focused checks to run. It edits only the touched files and their direct tests and returns residual judgement calls. Only when a `refiner` launch fails does the main agent apply them, naming that failure in the handoff.
   - Defects, Intent gaps, and `fix: judgement` findings go to the main agent or one `implementer`. The main agent decides each judgement finding: fix it, reject it with evidence, or ask Q with a plain `Needs Q:` line.
   - Serialize writers on shared files. Leads and audit items get no edits.
4. Round 2: a `verifier` that wrote none of the fixes reruns the affected checks and each blocker's repro at the current snapshot, and confirms each fixed ID at its location. Add one non-author `reviewer` on the fix delta and its open IDs only when the verifier fails, or the wave added behavior, redesigned a boundary, or changed more than about 200 lines. A wording-only delta needs its checks, not a round. An unchanged reviewed snapshot needs a comparison. If the previous snapshot or coverage is missing, recover it or rerun round 1.
5. Close when no blocker or fix-once finding is open and required checks pass. After round 2, stop: an open blocker goes to Q as a `Needs Q:` line with its ID, evidence, and proposed fix, and only Q authorizes another round or a deferral.
6. Later fixes to a closed review (PR comments, CI failures) get round 2 alone: a verifier on the fix, plus the targeted reviewer under step 4's triggers. A rebase whose `git patch-id` matches the reviewed commits keeps the verdict; write a new record for the new tree.
7. Record completion. When the diff changes user-visible copy (UI text, docs, error messages, marketing or PR copy), run the `humanizer` skill on the changed copy before the verifier runs. When a commit is authorized, commit the reviewed snapshot unchanged; if any byte changed after round 2 read it, run step 4 on that delta first. Then run [scripts/record-review.sh](scripts/record-review.sh) from the reviewed checkout: `bash <this skill's dir>/scripts/record-review.sh <base-ref> --reviewed <rev> --reviewers <role,...> --open-findings <n> --rounds <n> --leads <n> [--door one-way|two-way --blast-radius localized|service|customers|data] [--copy-humanized]`, where `<rev>` is that commit's full commit or tree sha (40 or 64 hex); the script rejects refs such as `HEAD` and short shas. `--open-findings` counts open blockers and fix-once findings; listed leads and audit items do not count. It writes the review record for `HEAD^{tree}`, which the PR gate checks. Standalone read-only reviews skip this step.

## Scope and read-only reviews

- Pin base, head, dirty state, relevant untracked source, and ignored generated dirs with `git status --short`, `git log <base>..HEAD --oneline`, and diff/stat commands before delegating. Compare base vs HEAD before claiming a new dead-code path, fallback removal, cycle, or contract drift.
- During a read-only review, run only validators with a no-write mode; skip those that write caches, snapshots, or generated artifacts. Afterwards rerun `git status --short` and disclose skipped validators and unexpected worktree changes.

## Eight-topic coverage checklist

Account for each topic as covered or not material; one reviewer may cover several.

1. **DRY/deduplication**: consolidate only when it reduces complexity; reject shallow abstractions.
2. **Shared types/contracts**: find duplicate or drifting types; consolidate only genuinely shared ownership. Where runtime gates split raw payload variants from domain objects, exported contracts must keep that split.
3. **Unused code**: use `knip`, compiler or linter output, and repo search; remove only when references are disproven.
4. **Circular dependencies**: use `madge` or import-graph checks at file level and across directory or module boundaries, especially new base-vs-HEAD cross-boundary edges; a zero file-SCC count does not clear a boundary cycle.
5. **Weak types**: replace `any`, `unknown`, and casts only after researching real payloads, callers, and package types; `unknown` may be correct at an untrusted boundary until parsing narrows it.
6. **Error handling**: remove try/catch and fallbacks that hide errors; keep boundary handling for unknown input, external systems, cleanup, retries, or user-safe errors.
7. **Legacy/fallback paths**: remove only after proving no live caller, config, migration, or rollout dependency remains.
8. **Comments, stubs, and test lies**: the "Comments and stubs" and "Test lies" sections of the coding standards.

## Reference Routing

- Read [../engineering/references/boundary-design.md](../engineering/references/boundary-design.md) for interface depth, information hiding, or deleting an abstraction; [../engineering/references/feature-shape.md](../engineering/references/feature-shape.md) when slices leave production behavior incomplete; [../engineering/references/legacy-change.md](../engineering/references/legacy-change.md) when a refactor needs characterization seams.
- Read [../engineering/references/compatibility-and-delivery.md](../engineering/references/compatibility-and-delivery.md), [../engineering/references/security.md](../engineering/references/security.md), or [../engineering/references/state-and-effects.md](../engineering/references/state-and-effects.md) when those risks appear; [../engineering/references/proof.md](../engineering/references/proof.md) when proof depends on consequential fixtures, clocks, or concurrency.
- Read [../improve-codebase-architecture/AGENT_FRIENDLY_REVIEW.md](../improve-codebase-architecture/AGENT_FRIENDLY_REVIEW.md) when navigation, domain ownership, or verification friction needs a broader trace.
- Read [URL-ATTRIBUTION-REVIEW.md](URL-ATTRIBUTION-REVIEW.md) only when the reviewed diff changes URLs, links, campaign attribution, analytics canonicalization, or CTA helpers.

## Findings and prevention

Architecture and cleanup findings need evidence that the move improves a principle from these references; correctness, contract, Standards, and Intent findings stand on their own evidence. Classify important findings as pre-existing debt, regression, preventable by `engineering`, `debugging`, or `test-design`, or a standards candidate. A finding class that recurs across reviews becomes a deterministic check, shown failing on a real past instance; reviewers then skip what the check enforces. Propose the smallest skill, check, or `CODING_STANDARDS.md` update rather than expanding this skill, and edit those only when asked.

## Validation

Run the smallest trustworthy validation for the touched scope: focused tests, typecheck, lint/format, and dead-code or cycle reruns when those tracks changed code. Reuse evidence when the tested code and state are unchanged; say exactly why any validation was skipped.

## Failure modes

- Re-reviewing until a pass comes back clean; rediscovering a listed ID; blocking on a lead; rewrite-by-cleanup; reviewer count set by the checklist instead of risk; comments left where a clear fix was possible; diff impressions mistaken for requirement traceability; deleting dynamic use after one search; merging different domain types; removing boundary defense; fake precise types; overlapping writers; recording a review before the reviewed state is committed.
