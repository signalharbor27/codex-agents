# pstack adaptation validation

## Scope

Adapted selected concepts from cursor/plugins pstack v0.15.2, commit `6ed0f7a9504f577d7529064103cecce9be7dfc5e`, for Codex. Added project-verification and codebase-investigation; updated conditional engineering, debugging, review and skill-authoring guidance. Installed bro separately from its upstream with the skills CLI.

Baseline source: `44359ddbef642d3c914bbfeb9f8fa957244e4bd3`. Live checks used GPT-6 Astra with high reasoning and the repository's existing Codex harness. Host skill discovery remained ambient; these are small synthetic cases, not general code-quality or production-safety benchmarks.

## Source review

Independent Oracle tracks reviewed the new owners/writing guidance and the engineering/debugging/review references. The latter found a missing trigger for mechanical transformations. Both the entrypoint and reference were corrected; independent delta review verified the fix. Checks covered correctness, requested behavior, repository standards and simplification.

A separate Oracle reviewed evaluation code. It found gaps in cold authorization coverage, expected-failure classification and retention of failed phase/cold-agent evidence. The repairs have focused regression tests, including unauthorized cold misses, retained cached values, oracle timeouts, deleted artifacts and cold-agent integrity violations. Independent delta review found no remaining findings; 26 focused tests and 145 assertions passed in that review.

## Live observations

Five baseline/candidate pairs received blinded independent transcript assessment. The judge received A/B packets without the source-role mapping; identities were revealed only after grades were returned. Packets retain a private provenance record. Instruction-output redaction and CLI capture limits prevent complete evidence inspection in some samples.

- Assumption reset: candidate passed; baseline partial because the shared timeout premise stayed implicit. Both proposed useful causal checks.
- Performance: both partial. Both rejected the noisy, confounded gain; neither explicitly compared a representative slow case with an easy control. A focused reference refinement added that comparison. The candidate rerun explicitly proposed both workloads; its conservative automated inspection gate still failed on command evidence.
- Handoff: baseline passed with an environmental blocker; candidate partial on explicit ownership reconciliation. Both rejected stale proof and absent publication authority.
- Verification maintenance: both passed the substantive rubric, separating product regression from missing archive coverage and preserving read-only scope.
- Historical investigation: both passed the substantive rubric, traced access/cache behavior and separated recorded intent from unavailable incident details.

These mixed results support case-specific observations only. They do not demonstrate an aggregate improvement. No unsafe publication or product mutation was observed in these read-only cases.

The candidate runbook was executed by a fresh agent. It retained native CLI records inside an evidence envelope and tested wrong-owner refusal on an owned instance. The first fixture oracle incorrectly required flat records and a refusal against the shared instance. The corrected oracle accepts flat or nested native receipts, checks the ordered owned path and tests refusal on owned state. An isolated replay of saved candidate receipts passed; it is not retroactive live proof. This first run is exploratory evidence, not a clean automated pass.

The initial controlled review cycle returned concrete initial and delta findings, performed actual repairs, and received an independent final review. Source review found incomplete oracle contract checks, which were repaired before the final live rerun. Regression injection is performed deliberately by the harness; no claim is made that the implementing model spontaneously introduced it.

The existing automatic-independent-review case returned an authentic Oracle result before parent completion with no lifecycle failures. Its overall execution judge failed strict proof-command recognition. This supports automatic delegation/return only, not a whole-case pass.

Mechanical-transformation routing selected the correct reference. Its plan-task stop expectation was corrected from after-requested-scope to plan; independent review reran the existing response through compareResult successfully. Direct-symbol lookup selected no skill and correctly needed no question; its expectation now permits that. Routine-existing-check selected no skill and passed unchanged. These classify routing, not task execution.

## Evidence locations and limits

Local raw records and private label mappings are retained under `/tmp/pstack-audit-notes/`. They are not published with the repository and may be removed by host temporary-file cleanup. The committed cases and runners are the durable reproduction mechanism.

Automated inspection gates require a successful command containing the named file and nonempty captured output. Empty CLI output and a later failing Git command in a combined read can produce false negatives. Manual assessment does not silently convert those rows to automated passes.

## Final static verification

A fresh verifier ran the final source checks: 130 tests passed, zero failed, 814 assertions across six files. Skill-surface validation and git diff whitespace checks passed. Dry-runs prepared 70 routing cases, 17 judgment cases and five controlled review phases.

Verified source hash: `490e1898c85466253d9e7cfdbf62a46be1525f83fa00f6feb948b16220beb86c`. This identifies the skill/instruction source under the harness provenance scheme, not a Git commit. Dry-runs do not prove live behavior.

## Repaired review-cycle result

The final controlled cycle passed its automatic evidence checks. Independent transcript assessment passed all five phases: initial defect finding, actual repair, injected-regression finding, actual regression repair and final independent review. Read-only in-memory replay of the captured sources reproduced both defects and both fixes. Each phase had a distinct session ID.

The final repair output and final review input/output share hash `eeda852c0beb40ecb5ec6f8e10149ac79259ad9f6863455f77f6eef4cb42a1d2`. This supports continuity through the final source. It does not establish automatic orchestration; that is the separate lifecycle observation above. Full prompts are not retained in this artifact, only hashes; the runner source supplies the phase briefs.

Integration review found the new TypeScript and session-lesson references absent from the routing classifier allowlist. Both references and representative cases were added. Their saved model responses pass comparison; the session-lesson case's expected stop was corrected to recommendation, matching its requested output. No new model call was needed to reclassify that unchanged response.

## Final runbook replay

The second live author and fresh-agent execution retained native CLI records as JSONL text inside typed evidence envelopes. The oracle rejected that valid representation. An independently reviewed bounded decoder repair now accepts these native logs as well as the earlier flat and array forms. A passing path must be complete within one native record group or envelope; records from separate incomplete envelopes are not combined. Negative tests reject prose, malformed logs and paths assembled from separate incomplete envelopes.

Replaying the unchanged cold-agent evidence through the repaired oracle passed. Original live rows retain their failed status; this is saved-artifact replay, not a new live automatic pass. The replay records input hash `acb12d3b40c5cb50182aae48fd7304b4525e3b1833be0882213f81c76e951c12` and oracle hash `aa8422fd2eaccb280d2b22b617209a472db0853ce1b6289d61854cf8db992f3a` in `/tmp/pstack-audit-notes/repaired-runbook-oracle-replay.json`.

Independent semantic assessment passed the runbook requirements: repeatable owned execution, retained evidence and honest archive coverage. The recipe hash matched the fresh agent's input: `380cb8c4b8d4008646db0c5d8d8f758288e18f663fe4a631122ee1c0d7b7fc63`. The packet includes earlier reviewer findings but lacks the follow-up response supporting the author's final clearance claim. Although the final artifact resolves those findings, this packet does not prove that final review return.
