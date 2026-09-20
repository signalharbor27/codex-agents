# Scope and proof guidance validation, 2026-09-20

The paired sample supports compatibility with the revised guidance. It does not establish a general improvement in engineering quality. Both versions usually reached equivalent conclusions; both omitted bounded failure handling in one concurrency-proof answer.

## Scope and configuration

- Model: `gpt-6-astra`, reasoning `high`; ambient host agent profiles unchanged.
- Baseline: `a1d95f2` plus the existing unrelated Worktrunk guidance present at task start, copied before edits.
- Baseline instruction hash: `e8b9b3ffa217116b4c53d33aeaaf7a9ead54c5a5ac01ebba7d74992b4125e328`.
- Candidate instruction hash: `d21a19ffab6cc446c55bf6e2220428f74dec6bd600530dc8f4a2e83e38119897`.
- Initial comparison: 26 model runs, 13 per source, covering 11 cases. Coupled scope and the trivial control each ran twice through separate invocations; their recorded repetition numbers are both 1.
- Paired sources used the same fixtures, model, effort, and harness within each comparison. Source order was baseline then candidate. Temporary catalog paths make prompt hashes differ.
- Transfer cases were added after guidance was frozen, without tuning the guidance to their results. They are small generalization probes, not a secret benchmark.

## Observed behavior

- Coupled scope: both versions used the grilling procedure and asked consequential product questions before settling the plan. Repeated runs retained that behavior.
- Single choice: both asked about CSV versus JSON without opening an unrelated interview.
- Discoverable facts: both inspected the CLI for flag syntax and used the requested default of three, without asking the user for repository facts.
- Trivial control: both answered `3` concisely without a planning or review ceremony, including repeated runs.
- Clock boundary: both identified missing rejection coverage and proposed checks before and at the deadline. This case tests assertion strength, not mismatched clock origins.
- Concurrency: both exposed the false overlap claim and a sequential counterexample. Neither included the rubric's required bounded failure handling for the proposed barrier. Both fail that complete rubric.
- Research: both limited the benchmark conclusion to the small warm workload and identified production-shaped evidence needed before replacement.
- Review assumptions: both reopened authorization and warm-cache coverage affected by the supplied fix while preserving unrelated valid coverage. This is a reasoning exercise, not an executed multistep review loop.
- Setup-masked restart: both fixed string parsing in the worker, preserved persisted settings, demonstrated raw-input failure before the fix, and received an independent review covering the startup contract. The candidate also added a persistent two-process restart test.
- Transfer scope: both surfaced recipient, consent, content, and follow-up decisions. The candidate's first product outcome was less concrete; that rubric point remains uncertain.
- Transfer fixture: both found the shared cents/dollars assumption and proposed provider-shaped input `1234` with expected output `12.34`.

An independent Oracle assessed all 26 transcripts, artifacts, and returned implementation reviews. Correct semantic answers do not restore missing captured evidence.

## Evidence and measurement limits

Automatic evidence gates cleared 7/13 baseline and 10/13 candidate runs. These are evidence results, not semantic pass rates. Seven rejected rows contain attempted reads with missing CLI stdout. Two captured the complete README but a trailing no-match `rg` returned 1. Original failures remain recorded; they are not counted as quality gains.

Aggregate model-call elapsed time was 644.6 seconds baseline and 632.4 seconds candidate; median 41.2 and 37.4 seconds. Calls overlapped across independent tracks. These small, fixed-order observations do not establish a speed improvement.

Provider-reported usage totals: baseline 1,778,352 input tokens (1,420,928 cached), 11,758 output tokens; candidate 1,793,154 input tokens (1,469,568 cached), 12,406 output tokens. These are reported parent-run counters, not an independently reconciled bill for all delegated calls. No dollar-cost claim is made.

The automatic-review execution control returned an actual independent Oracle review. Its original judge rejected a successful check combined with `git diff --check`, status/diff inspection, and receipt reading. A narrowly tested command allowlist repair accepts that exact conjunctive form; rescoring the unchanged trace passes. The control used an earlier candidate snapshot; subsequent changes affected test-reference routing, not the engineering/review path it exercised.

## Harness repairs

- SIGKILL process reaping gets a separate bounded scheduling allowance instead of inheriting a 20 ms test grace period. The delayed-reaping regression and process-group check pass.
- The restart oracle runs edited code through Bubblewrap with a read-only filesystem and isolated network/process namespaces. There is no unsandboxed fallback.
- Protected hashes are checked after the oracle too, and a literal legacy string input is supplied independently of the persisted record. Import-time fixture repair is rejected.
- Failed executions retain available raw output, artifacts, hashes, and failure stage before cleanup. A separate sandbox preflight reports environment failures as runner errors rather than implementation failures.

Independent review found the oracle isolation, integrity-timing, and failure-retention defects before publication. These were harness defects; they do not establish defects in the observed worker repairs.

Raw transcripts, original failures, rescoring, and command logs are retained locally under `/tmp/astra-judgment-evidence`. The baseline snapshot is `/tmp/astra-judgment-baseline-bq1eci1e`. The original scope/proof/repair and repeat/transfer groups used different harness revisions; each source pair stayed matched. Two further repair runs used the sandboxed oracle: both oracle checks passed and both returned independent reviews; both retained an inspection-evidence failure for missing settings-read stdout. These runs are separate from the 26-row timing and token totals. Static verification passed 114 tests and the skill-surface validator.

## Interpretation

The instruction changes clarify requested decision and proof boundaries. The sample does not justify broader orchestration, different agent models, or stronger claims about Astra. Remaining gaps include the barrier timeout omission, uncertain first-slice specificity, CLI evidence loss, ambient skill discovery, and untested complete interactive and multi-fix workflows across real repositories.
