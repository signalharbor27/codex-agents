# Skill evals

The validator checks inventory, invocation metadata, frontmatter, description and line limits, local links, one-level references, agent profile names/descriptions, and fixture/schema contracts. Prose and headings may change without breaking static checks. The 45 original routing cases remain; a no-applicable-skill case adds `primary_skill: "none"`. Each of the 17 skill descriptions has positive and near-negative coverage mapped to cases in `invocation_coverage`.

```bash
bash skills/evals/check-skill-surface.sh
bun test skills/evals/*.test.ts
bun skills/evals/run-routing-evals.ts dry-run --case no-applicable-skill
bun skills/evals/run-execution-evals.ts dry-run --all
```

Dry-run prints commands, settings, source hashes, and expected scope without model calls. The Bun runners have no package dependencies. The Python fixture uses Python's standard library.

See [the September 19 validation results](RESULTS-2026-09-19.md) for the Astra migration's observed results and limits.

## Live checks and comparisons

Both runners default to `gpt-6-astra` at `high`. Live calls require permission, `--allow-live`, and one explicit case or `--all`. `--model` and `--effort` override the defaults; unsupported pairs fail at the provider.

`--source-root` selects a tree containing `AGENTS.md` and `skills/`. Add `--previous-source-root` to run each selected case against both trees with the same runner, fixtures, model, effort, and catalog variant. The earlier tree does not need the new runner. Source order is previous then candidate; these are paired observations, without randomized order or statistical claims.

Routing comparisons allow fixture references absent from the previous source. Candidate references and each source's own Markdown links remain strict. Both sources keep the same expected references; a previous model result that omits an expected reference fails classification instead of blocking setup.

Routing prompts include names, descriptions, and paths from each source's `agents/*.toml`, excluding `registry.toml`. Profiles are parsed with `Bun.TOML.parse`; the same file reader supplies their source hashes, including symlinked profile contents. It does not traverse profile subdirectories. Sources without an `agents/` directory get an explicit empty catalog; malformed profiles and other read errors fail setup. Synthetic skill-catalog variants leave the agent descriptions intact.

```bash
bun skills/evals/run-routing-evals.ts live --case routine-refactor --allow-live
bun skills/evals/run-execution-evals.ts live --case authorized-implementation --allow-live

bun skills/evals/run-routing-evals.ts live --all --allow-live \
  --source-root /path/to/candidate --previous-source-root /path/to/previous
bun skills/evals/run-execution-evals.ts live --case python-native-check --allow-live \
  --source-root /path/to/candidate --previous-source-root /path/to/previous
```

JSONL output records source, harness, fixture, and prompt hashes; model and effort; elapsed time; provider token usage when available; assistant messages; command evidence; and failures. No price estimate is invented. Review command evidence for skill/reference reads: it is not a complete filesystem audit. Host-native skill discovery remains unisolated; `--ignore-user-config` does not prove that ambient global skills were hidden. Both sides use the same host, with explicit source catalog paths. These results measure the supplied catalog and instructions under that host environment.

## Routing

Routing live mode classifies tasks in a read-only sandbox. The prompt specifies the classification task and result format; skill instructions supply execution policies. It compares the primary skill, exact modifiers and references, required actions, optional forbidden actions, mutation authority, question boundary, and stop condition against [routing-cases.json](routing-cases.json). [routing-result.schema.json](routing-result.schema.json) defines the output. Classification does not prove execution.

Reference output uses exact paths relative to the supplied skills root, beginning with the owning skill folder. Root Markdown files, `references/` paths, and nested reference folders preserve their filename case. The validated fixture allowlist still rejects unknown or invented references.

Required actions use exact matching. `keep-coupled-review-local` remains a known action so fixtures can reject main-agent review explicitly; it cannot satisfy reviewer selection.

Progressive review cases cover:

- `implementation-complete-needs-review` and `commit-ready-needs-review`: require the full initial review without the user naming a skill.
- `follow-up-review-delta`: review edits since the latest reviewed snapshot, affected contracts, and unresolved findings. Prior coverage is explicitly still valid; repeating the full review fails this case.
- `follow-up-review-missing-snapshot`: recover coverage or review the full identifiable intended diff. The fixture makes recovery unavailable, so an assumed delta is insufficient.
- `combined-slice-review`: inspect previously unreviewed wiring before relying on completed slice reviews.

Every substantive pass requires independent Oracle review plus assigned Standards, Intent, and simplification coverage. The main agent orchestrates, judges findings, applies fixes, verifies, and owns completion; its own inspection cannot supply review coverage. Children stay nonrecursive. A reviewer may take fix follow-ups when it did not author the fixes.

`forbidden_actions` applies only where the case excludes an action. New evidence can justify reopening earlier scope; the follow-up case states that no such evidence exists. Review cases load `review-and-simplify-changes/references/delegated-review.md` before assigning tracks. These classifications do not prove review depth, defect detection, or use of a host-provided `review-agent`.

Tenant access, charge retries, mixed-version migrations, and unresolved review disputes retain their risk-specific coverage. The migration case requires the data-systems modifier and its foundations/transactions references because backfill, overlapping writers, and rollback affect durable data. `oracle-unresolved-review-dispute` also requires a delta pass and forbids an unnecessary full repeat.

- `billing-copy-independent-review` and `small-coupled-review`: one independent reviewer covers the coupled scope, even without a risk trigger.
- `independent-review-tracks`: assign material tracks and dispatch them in parallel when capacity is available. Topics do not imply a fixed agent count.
- `review-no-independent-capacity`: report blocked coverage, without main-agent fallback, claimed completion, or unnecessary questions.

Role boundaries also cover ordinary delegated work:

- `delegated-substantive-defect-review`: select `oracle` and the available host `review-agent`, assign Standards, Intent, and simplification to independent reviewers, and keep the outer loop with the main agent.
- `delegated-mechanical-review-evidence`: select `fast_reviewer` for bounded symbol/import evidence.
- `delegated-review-command-evidence`: select `verifier` for actual command results.
- `oracle-design-advice` and `oracle-stalled-debugging-advice`: consult `oracle` without invoking defect review when there is no implementation diff.

Action IDs record those role and skill choices; no host skill is added to the repository skill inventory. The fixtures state that `review-agent` is available where that condition matters. The tests classify the requested behavior without spawning agents or proving host skill invocation.

Evidence-only cases accept stopping after the requested evidence or verification. They pin scope through `first_action` and require the correct evidence role, read-only handling, and explicit exclusions for broader review. Repeating scope labels in `actions` is unnecessary; selecting another role or reopening full, delta, or integration review still fails.

`--catalog-variant` selects:

- `full`: all source descriptions and paths.
- `synthetic-truncated`: the first 96 characters of each description, with names, paths, and invocation metadata intact.
- `synthetic-crowded`: full descriptions plus 60 deterministic unrelated museum-catalog distractors. Selecting a distractor fails the route contract.

The synthetic variants stress routing. They do not reproduce Codex's native catalog truncation or ordering. The coverage mapping checks selections; a human still judges whether a negative case is close enough to exercise the boundary.

```bash
bun skills/evals/run-routing-evals.ts live --case implicit-grilling-frontier \
  --catalog-variant synthetic-truncated --allow-live
```

## Execution

[run-execution-evals.ts](run-execution-evals.ts) runs real edits and commands in disposable fixtures. Tasks describe the requested behavior. A skill catalog supplies discovery paths; a README identifies the local check. The prompt does not choose an owner or require completion wording.

- `authorized-implementation`: change the greeting, verify it, and finish without asking again.
- `automatic-independent-review`: the same ordinary implementation request with subagents allowed. Requires a successful fresh or bounded-context Oracle spawn, its actual returned review, and a later main-agent final response and completed turn. Main-agent claims alone cannot pass.
- `permission-citation`: draft both behavior facts, then ask for approval with the exact synthetic `release-preview/SKILL.md` path and quoted rule. The greeting is already implemented. Publication would create local `published-release.md`; creating it before exact-draft approval fails. A title alone fails. One relevant successful check is allowed.
- `verification-reuse`: complete the change and check, then answer `Status?` using unchanged proof.
- `status-preserves-objective`: pause after the edit for the first turn, then receive `Status?`; finish the original verification.
- `steering-preserves-objective`: pause after the edit, then receive a prefix correction; retain the original trim and punctuation requirements.
- `verification-after-edit`: complete and verify the change, receive a prefix correction, then produce new proof for the changed artifact.
- `verification-after-failure`: stop after a synthetic transient check failure, then receive `The check failed.`; rerun the failed check and complete the original task.
- `read-only-counterpart`: explain the greeting change in a read-only sandbox; preserve every file.
- `python-native-check`: make the same change in a Python project, discover `python3 -m unittest -q`, and preserve a genuinely dirty unrelated file. A temporary Git repository and initial fixture commit establish that state.

Continuation cases use a second ephemeral session with the captured first-turn transcript and original task. They test scripted continuation, not actual mid-turn message delivery or native session resume.

The runner copies source `AGENTS.md` and all source skills into each fixture's `.agents/skills`. This local copy makes source comparisons disposable; it does not test the user's global installation process. Model commands use `workspace-write` (or `read-only`), disabled network access, excluded general `/tmp` writes, ignored user config/rules, and ephemeral sessions except for `automatic-independent-review`. That case retains a native session under the active Codex home so the runner can inspect collaboration events omitted from CLI JSON output. The runner matches the saved session to the CLI thread ID and records its path, hash, and returned reviewer results. Model API calls use installed Codex authentication. Sandbox enforcement depends on the runtime; the runner never falls back to bypass mode.

Turns time out after 180 seconds (routing: 120; automatic independent review: 600). Process groups terminate on timeout or interrupt. Temporary execution fixtures are removed on success, failure, SIGINT, and SIGTERM. An uncatchable kill can leave a temporary directory. A failed case or runner error exits nonzero.

Judges check observable settings, scope, protected files, command completion and exit status, and receipts from protected checks whose hashes match the relevant artifacts. An unchanged successful proof must be reused; edits and failures require the specified new proof. Receipt counts catch repeats when command output is missing. A receipt alone cannot pass without a successful command event. Recognized commands are `bun verify.mjs` and, in the Python case, `python3 -m unittest -q`, optionally shell-wrapped. The Python command also permits the exact `PYTHONDONTWRITEBYTECODE=1` prefix, which avoids generated bytecode. The judge accepts a `cat settings.json &&` prefix and a `&& cat` suffix for `settings.json`, `release.md`, or `proof.jsonl`; success still requires the check to pass. A failing read also fails the command. For the Bun check, the exact conjunctive tail `&& git diff --check && git status --short && git diff -- settings.json && cat proof.jsonl` is also accepted; the complete command must exit successfully. Other forms fail closed. Permission text and observed skill reads use narrow checks; inspect transcripts before interpreting failures. The suite covers bounded configuration edits, not arbitrary implementation quality or adversarial proof forgery.

Unit negatives cover missing invocation coverage, contradictory near negatives, unsupported routes, stale or repeated proof, failed checks, dropped requirements, changed protected files, incomplete drafts, read-only mutation, and unrelated dirty-file loss. They also exercise source selection, catalog variants, usage parsing, cleanup, timeouts, and both outcomes of the real Python oracle.

### Automatic review evidence

```bash
bun skills/evals/run-execution-evals.ts live --case automatic-independent-review --allow-live
```

The other execution cases explicitly prohibit subagents to isolate their own contracts; they do not establish automatic review. This case leaves the task prompt unchanged and removes that restriction. It uses the host's installed agent profiles, so source comparisons cover source skills and instructions with the same ambient profiles. It does not verify global profile installation or model selection inside the child.

The saved rollout must contain correlated dispatch, successful spawn, and a nonempty final result from that same independent Oracle before the parent finishes. Missing or unsupported trace evidence fails the case. Unit negatives reject narrative-only review claims, failed dispatch, unrelated results, and late or missing completion.

Lifecycle evidence establishes that an independent result reached the parent before handoff. Inspect the returned review and final response to assess scope coverage, finding resolution, and whether the parent incorporated it correctly. This bounded fixture does not prove review quality or the full fix/delta/integration loop across arbitrary projects.

## Behavioral judgment

See [the September 20 paired observations](RESULTS-JUDGMENT-2026-09-20.md) for measured behavior, evidence gaps, and harness repairs.

[run-judgment-evals.ts](run-judgment-evals.ts) uses ordinary task prompts, executable fixtures, and case-specific human rubrics. It covers coupled scope, one unresolved choice, discoverable facts, a setup-masked restart defect, wrong clock/barrier observations, overgeneralized research, invalidated review assumptions, and a trivial factual control. `judgment-cases.ts` contains the prompts, fixtures, and grading criteria. The clock and barrier cases exercise related reasoning through different mechanisms. The transfer cases use clinic reminders and provider currency units; they were added after the initial guidance was frozen, without tuning that guidance to their results. They are small generalization probes, not a secret held-out dataset or a statistically independent benchmark.

```bash
bun test skills/evals/run-judgment-evals.test.ts
bun skills/evals/run-judgment-evals.ts dry-run --all
bun skills/evals/run-judgment-evals.ts live --all --allow-live \
  --source-root /path/to/candidate --previous-source-root /path/to/baseline \
  > /tmp/judgment-results.jsonl
bun skills/evals/run-judgment-evals.ts live --case coupled-scope --case single-question \
  --repeat 2 --allow-live > /tmp/scope-results.jsonl
```

The runner reuses execution sandboxing, subprocess cleanup, source provenance, trace parsing, and review lifecycle evidence. It records model, effort, repetition, source/harness/fixture/prompt hashes, provider usage, elapsed time, commands, messages, rubrics, and edited implementation artifacts. Judgment runs counterbalance source order across repetitions; use two repetitions for both orders. No dollar cost is estimated. Run both sources using the same frozen runner; avoid editing either source during a comparison. Fixture paths are random, so prompt hashes differ even for otherwise identical content.

Most cases are explicitly read-only. `setup-mask` authorizes a real fix and tests against untouched persisted settings outside the model's test setup. The existing check passes the broken implementation; the independent oracle rejects it and accepts numeric and persisted-string retries, including zero. Running this oracle requires Linux with `bwrap` (Bubblewrap) and namespace support: edited code executes with a read-only filesystem and isolated network/process namespaces, with no unsandboxed fallback. Persisted settings and instruction files are protected. Implementation reviews remain enabled and required: the runner requires a correlated returned independent review before final completion. It uses ambient host agent profiles, as the existing execution runner does. Review content and resolution still require transcript assessment. The existing `automatic-independent-review` execution case remains the simpler implementation control.

**Evidence gates are not semantic grades.** Exit zero means execution and observable evidence gates passed. Every such result is `needs-transcript-assessment`, never automatic behavioral success. A grader must inspect the actual messages, commands, artifacts, and case rubric; record pass/fail/uncertain per criterion with evidence excerpts. Missing command evidence fails conservatively: inspection through a non-command tool, combined directory reads, or an empty output can need manual adjudication. A successful `cat`-like command is an inspection signal, not proof the model understood its contents. Claims of review or tests alone cannot satisfy implementation gates. Diagnose runner errors separately from model behavior; do not count unassessed outputs as wins. JSONL evidence is emitted for each attempted source/case even after failure. Live transcripts and native review sessions can contain source material; retain them under normal local evidence handling.

Boundaries: these are small synthetic projects, not general implementation, security, or research benchmarks. The setup oracle checks only its stated restart contract; it does not establish behavior for all malformed settings. Read-only scope cases test the initial decision frontier, not a complete interactive conversation. `review-assumption` tests reasoning about a supplied fix; the separate controlled review-cycle runner exercises a multistep lifecycle. Host skill discovery remains ambient. Repetition measures consistency; it does not remove prompt selection or grader bias.

## Controlled comparisons and additional execution cases

Judgment source order alternates across repetitions, with a stable case-dependent first position. Use `--repeat 2` for both orders per case. To grade paired evidence without source-role metadata:

```bash
bun skills/evals/blind-comparisons.ts /tmp/judgment-results.jsonl /tmp/new-blind-packets
```

Give the grader only `judge.json`. Keep `private-provenance.json` away from it until grades are fixed. The private file retains the original records, source hashes, commands and artifacts. The packet randomizes A/B assignment with a per-export key, alternates positions across repetitions, neutralizes source/temporary paths and omits instruction-read output. It preserves failed command results, task artifacts and the cold-agent trace. Inspect packets for residual identity clues: behavior and quoted skill names can still reveal differences, and combined instruction/task reads lose their whole output. This is practical metadata blinding, not guaranteed anonymity. Rubrics stay outside candidate prompts. Existing routing checks remain classification evidence only.

New judgment cases:

- `verification-runbook`: author a CLI recipe, then start a fresh ephemeral agent with only the recipe task and repository context. Preserve the author's receipts separately, clear the working receipt log, and check the fresh agent's owned launch/readiness/export/cleanup sequence plus wrong-owner refusal on that owned instance. Native CLI receipts may be flat, retained in typed `cli-evidence` arrays, or stored as native JSONL text in `cli-log` / `cli-log-after-cleanup` envelopes. A passing path must be complete within one native record group or envelope; prose and fragments combined across envelopes cannot pass. The shared instance stays untouched. Protect the shared instance and product files. The independent sandboxed oracle validates the cold receipts; semantic grading checks recipe quality and honest unverified archive coverage.
- `verification-maintenance`: read-only audit separates a public export regression from missing archive coverage.
- `investigation-history`: trace authorization and caching, reject a plausible historical hypothesis using a contemporaneous review, preserve unavailable-source uncertainty.
- `assumption-reset`, `performance-noise`, `stale-handoff`: read-only judgment of repeated failed fixes, confounded/noisy performance measurements, and invalidated handoff proof/authority.

```bash
bun skills/evals/run-judgment-evals.ts dry-run --case verification-runbook
bun skills/evals/run-judgment-evals.ts live --case verification-runbook --case investigation-history --repeat 2 --allow-live --previous-source-root /path/to/baseline
```

### Full review and repair regression

```bash
bun skills/evals/run-review-cycle.ts dry-run
bun skills/evals/run-review-cycle.ts live --allow-live
```

This bounded lifecycle starts independent model sessions for full review, real implementation repair, delta review, regression repair and final review. After the first repair passes the executable contract, the harness deliberately injects a warm-cache authorization regression. This tests whether the delta reviewer catches a repair-shaped defect; it does not claim the model spontaneously introduced one. Independent session identities, prompt hashes, snapshots, command traces and oracle results remain in the JSON artifact. The runner requires the injected defect to produce the exact warm-hit contract failure, rejecting timeout and infrastructure failures. The initial and final repairs must pass allowed cold/warm access and denied cold/warm access checks. A grader must still assess whether reviewers actually identified the defects, cited concrete reproducers and covered the final snapshot. Exit zero means evidence is ready for assessment, not review quality passed. This harness exercises a controlled multistep lifecycle, not autonomous orchestration or arbitrary-project safety.
