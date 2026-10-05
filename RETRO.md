# Weekly retrospective, 2026-10-05

Window: `2026-09-28T00:00:00Z` inclusive to `2026-10-05T00:00:00Z` exclusive, seven complete UTC days. This excludes the partial day of this scheduled run.

Branch: `retro/2026-10-05-weekly`.
Workspace: `/srv/data/workspaces/codex-agents/retro-2026-10-05-weekly`.
Base: `2ff121d50214b2020dc63c544136f4add0995f70`.
Evidence: `/home/ubuntu/reports/retro-2026-10-05` (private; raw credentials omitted).

## Sources and method

The interrupted run read `skills/retro/SKILL.md` in full, its sources and analyst brief, `writing-for-agents`, session lessons, the installed `correct` skill, and the Worktrunk and review workflows. Six size-balanced read-only analysts read every one of 122 initial digests, 576,976 bytes, without overlap. Raw checks used digest line pointers, one file at a time. The parent verified the high-severity credential and measurement evidence against the original lines without printing credentials. `coverage.json` and `findings-1.md` through `findings-6.md` retain coverage and evidence summaries outside the repository.

Roots: `~/.claude/projects`, `~/.codex/sessions`. Initial extraction skipped 1,190 automated/subagent rollouts and 150 recognized delegated children. The saved corrected extraction contains 120 sessions, skips 1,203 automated rollouts and 152 delegated children, and adds no sessions. Two additional bare-role children were discovered among the 122 digests; their product work is excluded from human recurrence. Orchestration probes remain visible when their logs lack reliable automated provenance; they are excluded from mistake counts. A first successful result followed by a failed result is a genuine error, even when the digest excerpt obscures the latter.

Repositories: `tenz-app/TweetStream`, `signalharbor27/codex-agents`, `tenz-app/polysink`. Read all relevant in-window REST review, inline-comment and issue-comment records across 63 updated PR candidates: 112 inline comments, 101 reviews, 120 issue comments. Fifty merges: 49 TweetStream, one codex-agents, zero polysink. Screened older open and closed PRs as well. PR bodies and author responses are recorded evidence; an author saying "fixed" is not current execution proof. Two important dispositions were checked against merge source: #470's quote validation and #478's Discord gate are fixed. #476's currency aggregate remains in source. No production query, deployment, push, PR creation or merge was performed.

Scheduled acceptance: implement high/medium candidates with verified observations and owners in codex-agents. Other-repository owners, low-severity suggestions, unverified causes and already addressed problems remain proposals or exclusions. Prevention by prose is an inference, even when the underlying correction is verified.

## Environment and context budget

Inspected `instructions/global.md`, `instructions/response-style.md`, generated host instructions, role registry/briefs, Claude settings and hook owners, pre-commit, README check commands, the skill catalog and installed surfaces. Read destination files before editing or recommending changes. TweetStream and polysink root instructions, checks and CI locations were inventoried; there were no applicable deeper instructions for the reviewed web subsystems. The memory registry was used only to orient to historical routing; current routing was checked from source.

Always-loaded file word counts before this run:

- Codex global `AGENTS.md`: 2,075. `~/.codex/AGENTS.md` and `~/.agents/AGENTS.md` link to that same file; count it once. The codex-agents project copy has the same bytes.
- Claude global `claude/CLAUDE.md`: 1,830; `claude/output-styles/q.md`: 318.
- TweetStream project `AGENTS.md`: 1,656; polysink: 817.
- Codex memory summary file: 800. Memory index and session logs are on-demand, not additional always-loaded files.
- Conditional Codex role profiles: architect 281, explorer 151, fast_reviewer 198, judge 217, librarian 234, oracle 295, reviewer 184, verifier 165.
- Conditional Claude role files: architect 265, design_reviewer 173, implementer 161, oracle 279, refiner 202. These load for the selected child, not every parent turn.

All candidate load deltas below concern always-loaded instructions/catalog descriptions. Implemented changes add zero words there. Reference and review-only text is loaded only on its existing task boundary. No live install is changed by this branch.

## Ranked candidates

### 1. High: credentials copied into derived digests

Category: automated checks / information access. Four verified independent sessions. Evidence: `cf3955b7-cd7d-46c9-9968-898971cef519`, 2026-09-29 23:30:46.908 UTC, L253, "Updated J7 token: [REDACTED]"; `64b6f7ff-a8a0-4759-b5c3-1ee7d994eb37`, 2026-09-29 00:11:46.699 UTC, L2545, bare JWT replacement; `5b17f765-45a2-4d2f-bfc1-a6913d3d0c44`, 2026-09-30 10:44:15.597 UTC, L295, browser tab-separated session cookie; `ff662b83-f911-4517-bb53-991fb08acdab`, 2026-10-03 03:33:02.587 UTC, L42243, "use this api key [REDACTED]".

Owner: `skills/retro/scripts/extract.py`, `extract.test.ts`. Accepted. Shared sanitization before excerpt limits, including structured executor output and titles; private new output directories and report files. Original run digests were restricted and scrubbed; raw logs were preserved. Level: architecture at the derived-output boundary, backed by CLI regression tests. Types cannot distinguish secrets in arbitrary transcript text; linting callers cannot protect data values. The original extractor fails the synthetic observed-form fixture; the repaired extractor must pass. Load delta: 0. Implemented: `1ccde014c97ac67a5065ff5ac34ff180614612d7`, retained unchanged from the interrupted run. Its independent review and 655-test result remain recorded; the resumed combined suite passes 658 tests.

### 2. High: currency reconciliation missing from a USD loss total

Category: automated checks. One unresolved post-merge review, retained despite no recurrence. [TweetStream #476, 2026-10-04 02:01:43 UTC](https://github.com/tenz-app/TweetStream/pull/476#discussion_r4175767588): "Exclude non-USD disputes from the USD loss total." Verified at merge and current source: `apps/web/scripts/stripe-revenue-report.ts:1440` includes non-USD amounts in `currentLostDisputeAmount` although other cash movements exclude them.

Owner: TweetStream revenue report and its currency fixtures. Proposed for Q; outside authorized owner. Level: keep currency with amount through aggregation; then a literal mixed-currency example that fails the old report. Higher-level architecture is suitable here; another generic accounting rule would not repair this aggregate. Load delta: 0. Live customer/account impact unverified.

### 3. High: latency comparisons use the wrong evidence or endpoints

Category: navigation / measurement evidence. Two verified correction sessions, plus two independent retained-data discovery sessions. `01a10053-890f-7170-a73d-8d8a15dabfc0`, 2026-10-03 07:06:31.187 UTC L971, a counterfactual subtracts the normal hold from collector results; Q at L980 asks for competitor sheet values versus DB measurement, then L1026 insists on the customer's recorded values. `774176c5-ed87-4f07-b16e-6a4c11dd3de8`, 2026-09-30 08:03:14.518 UTC L149: "1ms matters for them this is bad framing." `cf3955b7` L178/L194: "the db has it just do a join"; `5a0f5883` L82/L183 asks to measure retained raw-audit data without a PR.

Owner: `skills/engineering/references/performance-and-capacity.md` and its routing line in `skills/engineering/SKILL.md`. Accepted. Define event IDs, source columns, clock endpoints, window, formula, exclusions and one worked row before comparing or extrapolating; distinguish persisted ingress from customer receipt. Level: on-demand guidance. This repository owns neither production timestamps nor the customer's sheet; types or a lint cannot establish semantic comparability, and a synthetic arithmetic test would not catch an agent choosing the wrong real column. Documentation effect remains unproven without live behavioral evaluation. Load delta: 0. Implemented: `1d17367c3317d5de856eb563215ab5471aff3199`.

### 4. Medium: harmless edits and disposable SQL blocked as production session changes

Category: automated checks. At least four verified sessions: `ec3d8049-9885-40fb-ac38-16b9035e61e5`, 2026-10-02 04:39:59.412 UTC L1973-L1974, PR Markdown edit; `1c8e959b-1cd7-4846-b1be-786dc2ea5c5a`, 2026-10-03 06:00:18.593 UTC L6105-L6106, migration source edit; `e78e7c98-eedd-4021-8ae0-5368012f1bfb`, 2026-10-02 03:08:17.303 UTC L1215-L1216, disposable Postgres; `d6861ae0` L2690-L2691, PR prose containing "set". Quote: "Session, role, or database SETs through the prod pooler leak to production traffic."

Owner: TweetStream `scripts/claude/guard-bash.ts` and tests. Proposed for Q. Level: distinguish executed SQL/target provenance from quoted source-edit payloads at the command parser. Keep protection for actual production SQL and Python SQL clients. Older plain UPDATE/SET LOCAL denials are already repaired; those are not additional live findings. Load delta: 0. Current runtime false positives not reproduced.

### 5. Medium: automation and mixed outputs distort the evidence ledger

Category: automated checks / tool economy. Verified bare-role children: `b2740420-ce56-4988-ab84-553ec076f2e2`, 2026-10-04 06:03:46.864 UTC L3, and `8b72f24d-3442-468f-826c-c03959111d2e`, 06:16:53.933 UTC L3: "You are the implementer subagent." T3 completion notices were counted as human steering in at least seven sessions, including `f8551b15` L137 and `01a104df` L1582. Mixed error attribution occurs independently in `01a101f0` L260/L264 (successful patch, failed shell), `01a104df` L5233 (successful PR-link call, failed shell), `01a101cd-3f81` L324 (successful plan, failed shell), and `01a101e0` L569 (successful mail read, failed search).

Owner: extractor and CLI tests. Accepted. Recognize anchored bare-role briefs; suppress exact T3 completion notices, including batches, from human messages; use an anonymous exec label when multiple tool types lack result identity. Keep real failures, genuine repeated corrections and source pointers. Level: architecture/classification at the parser; static types cannot recover external provenance. No guessed tool attribution. Independent fixture must fail on the old behavior and pass after repair. Load delta: 0. Implemented: `5085a3d597fbdb9cc537d8864e15d6093d265491`.

### 6. Medium: UI review and PR evidence lack a shared completion criterion

Category: review standards / navigation. Three verified sessions: `2c9a103a-809d-4f7a-9db6-2e1816f12ceb`, 2026-09-30 04:15:51.724 UTC L7968, "is confusing and bad UX"; `d0fcc55a-5c9a-499f-ad51-a1d6b8d6b781`, 2026-10-03 07:13:24.908 UTC L1600, conspicuous banner size/color correction; `01a104df-21c7-7a62-b6f7-e663c6878ac5`, 2026-10-04 06:34:39.840 UTC L2395, "why isn't it in the PR description with screenshots", followed by the agent admitting it had not read the existing owner (L2399).

Owner: the Review evidence section of `skills/review-and-simplify-changes/references/coding-standards.md` and `skills/describe-pr/SKILL.md`. Accepted. Review rendered affected states and acknowledge missing visual coverage; route UI PR evidence through the repository's existing requirements before publication. Source review and typechecks cannot judge appearance. A generic screenshot-presence check would not establish the right state or useful evidence; docs/reviewer judgment is the highest fitting level here. Existing TweetStream attachment guidance is reused, not copied globally. Load delta: 0. Prevention inference; historical UI was later repaired. Implemented: `90f798bdc0bb34188ee7ede91b64e37e4572b117`.

### 7. Medium: false Go nil-receiver findings recur in PR reviews

Category: review standards. Four independent PRs, verified REST findings and author rejections: [#440](https://github.com/tenz-app/TweetStream/pull/440#discussion_r4128995279), 2026-09-29 02:23:49 UTC; [#414](https://github.com/tenz-app/TweetStream/pull/414#discussion_r4155532947), 2026-10-01 12:50:50 UTC; [#415](https://github.com/tenz-app/TweetStream/pull/415#discussion_r4150532255), 00:14:03 UTC; [#464](https://github.com/tenz-app/TweetStream/pull/464#discussion_r4162876529), 2026-10-02 04:30:54 UTC. Each alleged nil dereference was answered with a nil-safe pointer-receiver method or guarded owner.

Owner: the Go nil receivers section under Review evidence in `skills/review-and-simplify-changes/references/coding-standards.md`. Accepted. Trace the receiver method and guard before reporting a nil panic; name the first actual unguarded dereference. Go types deliberately allow nil pointer receivers; a universal nil lint would ban valid methods, and a test of one method would not prevent a reviewer inventing a defect elsewhere. Level: evidence-based review standard. Load delta: 0. Runtime proofs in the replies were not rerun. Implemented: `7cf570776a82ade2f1f74267ed6beaa9159bd551`.

### 8. Medium: paired payment/attempt lifecycle ownership is scattered

Category: architecture / automated checks. Churn audits at TweetStream `2bb3fb1ec2bd034a5566b34bd15f5a5f2a50ad0c` found the declared EXPIRED-terminal table bypassed by reopening, raw status writers in 17 payment and 11 attempt files, and router cancellation using display text as a claim token. #468 and #482 illustrate repeated lifecycle fixes. Client payment-purpose sets and checkout URL handling also diverge across dashboard/card/confirmation owners. Verified source observations; further orphaned transitions and user impact are inferred.

Owner: TweetStream payment lifecycle, client contract owner and tests. Proposed for Q. Highest level: one owner for paired transitions with types for cancellation/recovery states; then a check against new raw writes outside that owner. Do not create a global status-write blacklist. Load delta: 0. Dashboard orchestration/query coupling merits bounded follow-up; absent unit imports alone do not establish absent proof when E2E already covers a flow.

### 9. Medium: campaign ledger drifts from the reviewed source

Category: automated checks. One costly verified session, `01a101e3-f0e0-7441-8ddd-bdb3a6b1234a`, 2026-10-04 06:28:41.690 UTC L8390: "A 109-declaration source increment lacks the retained, named ledger required for every declaration"; L2935 records 205 newer commits. The historical campaign was subsequently repaired.

Owner: TweetStream campaign inventory/ledger verifier; external test-audit workflow remains unmodified. Proposed for Q: bind ledger entries and inventory to the current source/base and fail on missing named declarations. Level: structural check, not additional prose. Load delta: 0.

### 10. Medium: renewal emails promise facts the lifecycle snapshot does not carry

Category: unresolved audit items. [#473](https://github.com/tenz-app/TweetStream/pull/473), merged 2026-10-04 03:20:06 UTC, has two `## Audit items`: final and midpoint automatic/card renewal claims and catalog-price wording can misdescribe manual/cardless grants, coupons or credits. Quote: "Fixing it needs a 'charge scheduled' fact from Stripe sync that the lifecycle snapshot doesn't have." Current final copy adds "With a card saved"; midpoint remains unconditional. Partly mitigated, not closed.

Owner: TweetStream lifecycle snapshot, Stripe sync, email templates and contract fixtures. Proposed for Q. Level: carry actual scheduled-charge facts and payable amount through the owning type, then assert cardless/discounted examples. Load delta: 0.

### 11. Low: retained helper and syntax-sensitive test debt

Category: unresolved audit items / test quality. [#476](https://github.com/tenz-app/TweetStream/pull/476), merged 2026-10-04 01:58:30 UTC, retains four helper-family exports with only internal/test callers because removal exceeds the touched-debt cap. [#477](https://github.com/tenz-app/TweetStream/pull/477), merged 04:59:47 UTC, retains an exact shell/PromQL assertion alongside behavioral deploy proof. Both complete audit sections were read; all other 47 merged PRs lack that section.

The fresh web test audit also found a setup-refusal expected-message set derived from its production table (and an earlier config refusal masking the intended path), docs redirects tested through executable spelling despite browser coverage, and a translation scan tied to the local variable name `t`. Existing Test lies standards already cover these; adding another global rule would duplicate them.

Owners: TweetStream helper family/deploy tests and the cited web test owners. Proposed for Q, grouped follow-ups with existing behavioral proof preserved. Load delta: 0.

### 12. Low: missing tool aliases, watcher recovery and review-record repair

Category: tool economy / navigation. Verified unavailable aliases recur across at least seven distinct sessions, including `cake_Write`, `tiny_Read`, `erupt_SendMessage`, `functions` inside code mode and `tools.exec`. No source guidance advertises those stale names; tool-bridge cause remains unknown. GraphQL quota failure (`cf5cfe5f` L570) and watcher expiry (`c170458e` L4585) are independently observed, with no proven causal connection. `1c8e959b` L6254-L6255 and `ec3d8049` L5289-L5290 combined review-record creation with `gh pr ready`; the hook correctly checks before either command runs.

Owners: T3/host capability bridge; existing REST fallback references; review-gate missing-record diagnostic. Proposed for Q: capability-aware dispatch, bounded REST recovery, and a diagnostic that says to record first and publish in a separate tool call. Low certainty/payoff relative to the accepted fixes; no hook relaxation. Load delta: 0.

## Churn audits and exclusions

Top five, by changed-file appearances across in-window merges (tests/generated files and #442's deletions included): web server 587 appearances / 60,203 changed lines; web app 413 / 30,965; Go source 86 / 11,680; Go DB 80 / 4,894; Go app 70 / 7,370. These are activity counts, not product additions.

Three Go buckets reuse [#415](https://github.com/tenz-app/TweetStream/pull/415)'s explicit whole-runtime architecture and test-suite audit record, including the ninth audit on October 4. That is recorded coverage on an open branch, not a fresh audit or production proof. The collector initially required a literal `## Audits completed` heading; that interpretation was rejected because retro permits any recorded large-change audit. Web #437/#470/#478 cover narrower billing paths; #442 is a test campaign, so web architecture and test-suite audits were dispatched separately, with an additional app architecture pass to cover the first pass's omission.

Fresh audits read high-churn owners, performed a 375-file web test/support pattern sweep and bounded read-only predicate experiments. They did not read every web file or run DB/E2E/production tests. Findings are narrowed to the traced paths; the suggested React Query cadence and dashboard user impact are not established runtime facts. Remaining #437 late-review and #475 profile-identity dispositions are unknown where there is no explicit resolution. Model-effort, full-access role configuration, one-PR policy, response brevity, retained-hypothesis rules and plain SQL UPDATE/SET LOCAL guard fixes are already in current sources; no duplicate instructions are added.

## Verification and handoff

Resume: reused this Worktrunk workspace and branch. The 122-session analysis, review inventory and churn audits were retained. No new branch, retrospective analysis, live install, production query, push, PR or merge. The earlier redaction commit was preserved; four fix classes were committed separately after review. This report is committed after its report-only delta review.

Implementation commits:

- `1ccde014c97ac67a5065ff5ac34ff180614612d7`: credential redaction before deriving private reports (candidate 1; already committed at interruption).
- `5085a3d597fbdb9cc537d8864e15d6093d265491`: transcript attribution, exact completion notices including batches, neutral mixed-tool failure labels, and documented retro test wiring (candidate 5).
- `1d17367c3317d5de856eb563215ab5471aff3199`: latency evidence definitions in the existing performance reference and its comparison/research routing line (candidate 3).
- `90f798bdc0bb34188ee7ede91b64e37e4572b117`: rendered UI review coverage, reusable evidence criteria, and repo-owned PR attachment requirements (candidate 6).
- `7cf570776a82ade2f1f74267ed6beaa9159bd551`: trace actual Go dereferences before claiming a nil-receiver panic (candidate 7).

Checks on the final implementation source:

- `TMPDIR=/tmp bun test skills/evals scripts claude skills/retro`: 658 pass, 0 fail, 2,645 assertions across 16 files. Evidence: `resume-final-suite.log`.
- `bash skills/evals/check-skill-surface.sh`: passed, including generated-host currency, metadata, reference and vocabulary checks. Evidence: `resume-final-surface.log`.
- `bun skills/evals/run-routing-evals.ts dry-run`: 83 cases, exit 0, no external model calls. Evidence: `resume-final-routing.log`. This validates fixtures and configuration; it does not prove live routing or agent behavior.
- `git diff --check` and staged pre-commit surface/generator checks: passed. Final committed source is compared byte-for-byte with the reviewed WIP tree.

Baseline proof retained from the interrupted run: 652 tests before redaction, 655 after its reviewed fix; primary-checkout read-only installed/external checks passed then. Those installed checks describe the unchanged live install, not activation of this branch.

Regression proof: the three attribution fixtures fail against `1ccde01` for their intended reasons (13 pass, 3 fail), then pass after repair. The batched-notice extension fails the first reviewed WIP (15 pass, 1 fail); the final suite passes it. Evidence: `resume-final-provenance-red.log`, `resume-provenance-green.log`, `resume-batched-red.log`, and `resume-final-suite.log`. Fixtures exercise the extractor CLI, with expected session membership, counts, failure labels and raw-line pointers taken from observed transcript shapes. Added-human-text controls preserve genuine steering. No production seam exists only for these tests.

Saved coverage and correction were checked without repeating analysis: all 122 original digests belong to exactly one analyst batch; corrected membership removes only the two bare-role children and adds none. Retained tool-call and error counts are unchanged. Human-message counts fall from 1,554 to 1,397 after exact automation filtering. Evidence: `coverage.json`, `corrected-validation.json`, `resume-saved-counts.json`, and `corrected/index.tsv`. The two batched notices discovered in review are outside the window (October 5, 06:34:21 and 07:02:37 UTC); they add a future-facing regression, not an in-window recurrence.

Independent review:

- Full WIP `4a4cdd0884555424cf07beddb06ed6af0c3f041e`, base `1ccde014c97ac67a5065ff5ac34ff180614612d7`: native reviewer at high and Opus design reviewer at medium. Scope: all ten changed paths, including this report, affected parser/CLI contracts, regression oracles, check wiring, and guidance routing. Eight review topics covered or explicitly not material.
- Delta `34e1cc38702ea8193ef04143508b80ad23787f6d`: independent native reviewer verified batched suppression, steering retention, report owner and review-evidence clarification; no findings. Final tests were rerun by the parent after these edits.
- Both reviewers classify the implementation as two-way / localized. The completed review record is stored under the common Git directory's `agent-review/`, keyed by the final committed tree. The prior redaction review record remains intact. The final report receives its own independent delta before commit.

Finding dispositions:

- Wrong latency owner in this report: fixed to the engineering performance reference and routing line.
- Batched notices counted as steering: fixed and regression demonstrated against the previous WIP. Bounded original lines confirmed both observations outside the pinned window.
- UI/nil evidence rules could be mistaken for code Standards: clarified under Review evidence; code violations retain Standards tags.
- Requested latency routing eval: not added. The existing engineering owner now explicitly routes comparison/research tasks; a dry-run fixture would not establish model behavior. Live routing and guidance effectiveness remain proof gaps, with no improvement claim.

Proof limits: redaction covers observed secret shapes, not arbitrary unknown credentials. Prose received static/reference checks, humanizer review and independent review, without live behavioral evaluation. No product UI was changed or rendered in this repository. Go review replies and production effects were not rerun. Findings outside codex-agents remain proposals; no external repository was edited.

Suggested Q order [bias: accounting risk first]: review the local fixes; repair #476's currency aggregate; repair the narrow SQL-guard false positives; settle paired billing lifecycle ownership and scheduled-charge email facts; then take the named test-debt and tool-bridge follow-ups. Installing or integrating this branch remains Q's decision.
