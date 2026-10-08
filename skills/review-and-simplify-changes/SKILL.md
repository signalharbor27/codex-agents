---
name: review-and-simplify-changes
description: "Use when implementation is ready for handoff or commit, or when reviewing commits, PRs, branches, WIP diffs, or subsequent fixes. Excludes unscoped architecture audits and standalone feedback triage."
---

# Review and simplify changes

Independent subagents review every pass, including small changes and follow-up fixes, against the coding standards and the change's Intent. Standards cover every touched file, so pre-existing debt there is in scope. Clear standards fixes are applied by a `refiner`, not left as comments; touched debt too large for the change becomes an audit item. The main agent sizes the review to the risk, judges findings, owns fixes and integration, and records the completed review; its own inspection cannot satisfy review coverage.

## When to Use

- Reviewing the full intended change before implementation handoff or an intended commit, then reviewing subsequent fixes
- Reviewing or simplifying an explicitly scoped commit, PR, branch, or work-in-progress diff
- Checking changed code against Standards and the change's Intent from the prompt, spec, plan, task notes, issue, or commit message

## When Not to Use

- Use `debugging` first when behavior is broken and cause is unknown
- Use `improve-codebase-architecture` for architecture plans without implementation
- Use `test-design` when the main question is test strategy

## Minimal Workflow

1. Pin the review to a commit, PR, branch, fixed point, or WIP diff.
   - For WIP, inspect `git status --short` before choosing the diff. For a branch, resolve the comparison ref and its upstream, use the upstream when it is ahead, and pin the merge base; for one commit or explicit snapshots, use those endpoints. Follow-up passes use the progressive loop below.
   - If the requested comparison cannot be produced locally and no exact remote base and head are available, stop without a review rather than substituting unrelated branches, PRs, or GitHub comparisons.
   - If a fixed-point diff is empty but unstaged changes exist, report the mismatch and include the unstaged diff only when user intent clearly points at WIP; otherwise ask one narrow scope question.
2. Gather Standards and Intent. Standards are [references/coding-standards.md](references/coding-standards.md), a repo-root `CODING_STANDARDS.md` when present (the repo rule wins on conflict), and repo `AGENTS.md`, docs, and package-script conventions. Intent comes from the prompt, spec, plan, task notes, issue, or commit message; the diff is evidence of touched behavior, not of intent. If Intent is unavailable, say so instead of inventing requirements from the diff.
3. State the scope, permitted side effects, and validation target.
4. Choose a review lane (below), then read [references/delegated-review.md](references/delegated-review.md) and brief the reviewers. Every brief names both Standards paths, the pinned scope, the Intent digest, and the assigned coverage topics.
5. Reviewers inspect every changed path and its affected callers, tests, config, and contracts for correctness, security, performance, and maintainability, and return every actionable finding. They judge **Standards** and **Intent** separately and account for each material requirement as implemented, partial, missing, contradicted, incorrect, or unrequested. Standards scope, `origin`, and `fix` tags follow [coding standards' Classify each finding](references/coding-standards.md#classify-each-finding); every Standards finding carries both tags.
6. Collect results and account for each requirement and checklist topic as covered or not material. Delegate any uncovered material topic, including coverage lost when a reviewer fails; a quick main-agent check cannot close it.
7. Apply fixes within the user's existing authorization (see the loop). Keep cleanup behavior-preserving and verify intentional behavior changes against the requested outcome. Routine dependencies may be added within the authorized outcome; ask about material scope, architecture, cost, or external effects. Fix touched-file findings through the loop's routing; report findings outside the touched files and their direct tests without changing them. A standalone review is read-only and ends with findings, coverage, and proof gaps. Do not stage, commit, or push unless authorized.

## Review lanes

Select the minimum useful reviewer set for the lane, sized to separable risk rather than to the eight topics. Every lane keeps independent subagent review, and each substantive reviewer covers Standards, Intent, and simplification for its scope as well as correctness.

- **Default**: one `reviewer` covers correctness, simplification, and Standards/Intent for a coupled diff, plus one `design_reviewer` on the first full pass.
- **Separable**: one `reviewer` per genuinely independent subsystem or risk, in parallel, plus one `design_reviewer` on the first full pass; group coupled topics under one reviewer.
- **Mechanical delta**: one `fast_reviewer` (rule in the loop below).
- **One-way door or hot path**: any one-way trigger in [describe-pr's merge-danger reference](../describe-pr/references/merge-danger.md), or a hot path or realtime change. To the default or separable lane, add both `oracle` seats with a `judge` reconciling them, and require a blast-radius pass (delegated-review reference).
- **Large change**: the diff adds a module or subsystem, or changes more than about 500 non-generated source lines. Add to the default or separable lane one `design_reviewer` running `improve-codebase-architecture` and one `reviewer` running `improve-test-suite`, in parallel, each scoped to the touched subsystems. Their supported findings take the same tags and routing as Standards findings; record the audited subsystems in the PR body when a PR exists, otherwise in the handoff.
- **Research or prototype** with no production path: one `reviewer`; skip `design_reviewer` and architecture or test-suite audits.

Delta and fix passes use `reviewer` only; `design_reviewer` runs on the first full pass. Reviewers independently classify the change's Merge danger (door and blast radius) against that reference. When they or the PR footer disagree, the more severe value of each wins (one-way over two-way; for blast radius, localized < service < customers < data), and that classification is recorded with `--door` and `--blast-radius`. Launch each role as its brief describes; the `oracle`, `judge`, and blast-radius steps are in the delegated-review reference.

## Progressive review loop

1. First pass: snapshot the completed changes, then have independent subagents review the entire intended diff, including relevant staged, unstaged, and untracked source. Record in task context the base and reviewed head or reproducible WIP snapshot (including untracked files; `HEAD` alone cannot identify WIP), reviewer assignments, covered paths and topics, findings, and validation.
2. Judge every finding against repository evidence. A finding raised independently by two model families is strong signal; a lone finding still stands or falls on its evidence, and a reproducible defect from one reviewer outweighs unsupported agreement from others. Track each as open, fixed awaiting review, verified fixed, rejected with evidence, deferred by explicit user decision, or listed as a touched-origin audit item (terminal under the standards' audit-item rule), and explain rejections.
3. Route accepted findings:
   - First apply the standards' touched-origin caps, retagging the findings they exclude as `fix: audit`.
   - `fix: clear` Standards findings of either origin go to one `refiner` with the pinned snapshot, the findings verbatim, both Standards paths, and the focused checks to run, including when the same pass has defects or judgement fixes. It edits only the touched files and their direct tests, keeps incident and contract tests, confirms existing tests still pass, then returns changed files and residual judgement calls, which take the `fix: judgement` route. Serialize it with other writers on those files. Neither the main agent nor an `implementer` applies clear fixes unless a `refiner` launch fails; the main agent then applies them and names that failure in the handoff.
   - `fix: judgement` findings stay with the main agent, which decides each one: fix it when evidence and authority settle the choice, reject it with evidence, or ask Q with a plain `Needs Q:` line. A pass that returns only judgement findings continues the existing review: pin the delta since the reviewed snapshot, send any resulting edit to a non-author `reviewer` as in step 4, and close the pass when no judgement finding remains open.
   - `fix: audit` findings follow the standards' audit-item rule; give each listed **audit item** its evidence and proposed scope. New-origin `fix: audit` findings go to the main agent or an `implementer`, or to Q with a plain `Needs Q:` line when they exceed authority, and stay open until fixed or deferred by Q.
   - Defects and Intent gaps go to the main agent or an `implementer`, as for any fix.
4. When all writers finish, run affected checks, and send every edit since the last reviewed snapshot (refiner edits, fixes, tests, integration edits) to a read-only reviewer that did not write them. It traces affected callers and contracts, verifies accepted fixes, looks for regressions, and carries unresolved findings forward. Keep unchanged earlier scope closed unless new evidence or a disproved assumption invalidates its coverage; explain any reopening.
5. A mechanical delta (formatting, a lint or type fix, a rename, a comment, or a test-assertion tweak, with no behavior change) whose affected checks pass needs one `fast_reviewer` pass confirming it is mechanical and complete; any other delta gets the full delta review. An unchanged reviewed snapshot needs a comparison, not another review. For parallel slices, review the combined diff and cross-slice wiring. If the previous snapshot or coverage is missing, recover it or review the full intended diff.
6. Repeat until no actionable finding is open and required checks pass; listed touched-origin audit items are not open (see the standards' audit-item rule). Only Q may accept a deferral; a pass limit or time budget does not complete a review.
7. Record completion. When the diff changes user-visible copy (UI text, docs, error messages, marketing or PR copy), run the `humanizer` skill on the changed copy and send any edits through step 4. The loop closes before the intended commit. When a commit is authorized, commit the reviewed snapshot unchanged; when touched-origin refiner edits would obscure the cause of a behavior change, put them in a separate commit within the same PR; if any byte changed after the reviewers read it, run a delta review (step 4) first. Then run from the reviewed checkout `bash <this skill's dir>/scripts/record-review.sh <base-ref> --reviewed <rev> --reviewers <role,...> --open-findings <n> [--door one-way|two-way --blast-radius localized|service|customers|data] [--copy-humanized]`, where `<rev>` is that commit's full commit or tree sha (40 or 64 hex); the script rejects refs such as `HEAD` and short shas. `<n>` counts open findings; listed touched-origin audit items are terminal and do not count. It writes the review record for `HEAD^{tree}`, which the PR gate checks; any later commit needs a delta review and a new record. Standalone read-only reviews skip this step.

## Scope and read-only reviews

- Pin base, head, dirty state, relevant untracked source, and ignored generated dirs with `git status --short`, `git log <base>..HEAD --oneline`, and diff/stat commands before delegating. Compare base vs HEAD before claiming a new dead-code path, fallback removal, cycle, or contract drift.
- During a read-only review, use validators with a no-write mode; skip those that write caches, snapshots, or generated artifacts. Afterwards rerun `git status --short` and disclose skipped validators and unexpected worktree changes.

## Eight-topic coverage checklist

Account for each topic as covered or not material; one reviewer may cover several.

1. **DRY/deduplication**: consolidate only when it reduces complexity; reject shallow abstractions.
2. **Shared types/contracts**: find duplicate or drifting types; consolidate only genuinely shared ownership. Where runtime gates split raw payload variants from domain objects, exported contracts must keep that split.
3. **Unused code**: use `knip`, compiler or linter output, and repo search; remove only when references are disproven.
4. **Circular dependencies**: use `madge` or import-graph checks at file level and across directory or module boundaries, especially new base-vs-HEAD cross-boundary edges; a zero file-SCC count does not clear a boundary cycle.
5. **Weak types**: replace `any`, `unknown`, and casts only after researching real payloads, callers, and package types; `unknown` may be correct at an untrusted boundary until parsing narrows it.
6. **Error handling**: remove try/catch and fallbacks that hide errors; keep boundary handling for unknown input, external systems, cleanup, retries, or user-safe errors.
7. **Legacy/fallback paths**: remove only after proving no live caller, config, migration, or rollout dependency remains.
8. **Comments, stubs, and test lies**: the "Comments and stubs" and "Test lies" sections of `coding-standards.md`.

## Reference routing

Load only references the pinned scope needs:

- `engineering/references/boundary-design.md` for interface depth, information hiding, or deleting an abstraction; `feature-shape.md` when slices leave production behavior incomplete; `legacy-change.md` when a refactor needs characterization seams
- `engineering/references/compatibility-and-delivery.md`, `security.md`, or `state-and-effects.md` when those risks appear; `proof.md` when proof depends on consequential fixtures, clocks, or concurrency
- `improve-codebase-architecture/AGENT_FRIENDLY_REVIEW.md` when navigation, domain ownership, or verification friction needs a broader trace
- [URL-ATTRIBUTION-REVIEW.md](URL-ATTRIBUTION-REVIEW.md) only for URL, link, campaign attribution, analytics, or CTA-helper changes

## Findings and prevention

Architecture and cleanup findings need evidence that the move improves a principle from these references; correctness, contract, Standards, and Intent findings stand on their own evidence. Classify important findings as pre-existing debt, regression, preventable by `engineering`, `debugging`, or `test-design`, or a standards candidate; propose the smallest skill, check, or `CODING_STANDARDS.md` update rather than expanding this skill, and edit those only when asked.

## Validation

Run the smallest trustworthy validation for the touched scope: focused tests, typecheck, lint/format, and dead-code or cycle reruns when those tracks changed code. Reuse evidence when the tested code and state are unchanged; say exactly why any validation was skipped.

## Failure modes

- Rewrite-by-cleanup; reviewer count set by the checklist instead of risk; comments left where a clear fix was possible; diff impressions mistaken for requirement traceability; deleting dynamic use after one search; merging different domain types; removing boundary defense; fake precise types; overlapping writers; recording a review before the reviewed state is committed.
