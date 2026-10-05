# Skill evals

The validator checks inventory, invocation metadata, frontmatter, description and line limits, local links, one-level references, agent profile names/descriptions, and fixture/schema contracts. Prose and headings may change without breaking static checks. The fixture has 83 routing cases, including `primary_skill: "none"` routes. Each of the 18 skill descriptions has positive and near-negative coverage mapped to cases in `invocation_coverage`. A skill is explicit-only when its `agents/openai.yaml` sets `allow_implicit_invocation: false`; its `SKILL.md` must then set `disable-model-invocation: true` (the Claude Code equivalent), and the validator rejects a mismatch in either direction.

```bash
bash skills/evals/check-skill-surface.sh
TMPDIR=/tmp bun test skills/evals scripts claude skills/retro
bun skills/evals/run-routing-evals.ts dry-run --case no-applicable-skill
bun skills/evals/run-execution-evals.ts dry-run --all
bun skills/evals/run-routing-evals.ts dry-run --case describe-pr --harness claude
bun skills/evals/run-standards-evals.ts dry-run --all
```

Dry-run prints commands, settings, source hashes, and expected scope without model calls. The Bun runners have no package dependencies. The Python fixture uses Python's standard library.

See [the September 19 validation results](RESULTS-2026-09-19.md) for the Astra migration's observed results and limits.

## Live checks and comparisons

Both runners default to `gpt-6-astra` at `high`. Live calls require permission, `--allow-live`, and one explicit case or `--all`. `--model` and `--effort` override the defaults; unsupported pairs fail at the provider.

`--source-root` selects a tree containing `AGENTS.md` and `skills/`. Add `--previous-source-root` to run each selected case against both trees with the same runner, fixtures, model, effort, and catalog variant. The earlier tree does not need the new runner. Source order is previous then candidate; these are paired observations, without randomized order or statistical claims.

Routing cases come from the candidate fixture, which is validated case by case; the previous source needs only a valid skill surface and its own Markdown links. When the previous source lacks a case's primary or modifier skill, its record carries `skipped` with the reason and makes no call. When it lacks an expected reference, the case still runs with the same contract and its record carries `expected_red`; that failure documents the gap and does not fail the run. Candidate references remain strict. Prove a pairing without model calls with a dry-run against an export of the older commit, for example `git archive <rev> | tar -x -C /tmp/prev` and `--previous-source-root /tmp/prev`.

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

## Claude Code harness

`run-routing-evals.ts --harness claude` runs the same prompt, catalog, result schema, parser, and comparison through `claude -p` (default `claude-opus-5-5` at `high`; efforts `low` to `max`). Codex stays the default, with unchanged behavior. The prompt goes on stdin. Tools are limited to `Read,Grep,Glob` in `dontAsk` mode with no session persistence. The source's generated `claude/CLAUDE.md` (or `AGENTS.md` when absent) is appended to the system prompt, the counterpart of Codex loading `AGENTS.md` from `--cd`. Claude Code rejects the 2020-12 `$schema` key, so the harness sends the schema without it.

Isolation: each case copies the source's `skills/` (without `evals/`), `agents/`, `AGENTS.md`, and `claude/CLAUDE.md` into a temporary directory, and the catalog paths point into that copy. The process runs from a separate empty temporary cwd with `--add-dir <copy>`, `--setting-sources project`, `--strict-mcp-config`, `--disable-slash-commands`, and `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`, so the model cannot read the routing cases or schema it is judged against. Those flags exclude user and project settings files, `~/.claude/CLAUDE.md`, user and project skills, agents, hooks, MCP servers, project instruction files, and auto memory. Claude Code still reads `~/.claude.json` and managed policy and loads its builtin plugins.

Environment: the child gets the runner's own environment minus parent-session variables (`CLAUDECODE`, `CLAUDE_CODE_SESSION_ID`, messaging tokens, and similar), plus `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`. Inside a Claude Code session that environment already holds the session's `ANTHROPIC_BASE_URL` and credential, so the child routes the same way. Outside one, export `ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN` (or `ANTHROPIC_API_KEY`), or rely on claude's stored login. Each record's `claude_routing` gives the base URL host (no path or credentials) and `auth_source`: `env` when the environment carries a credential, `config` otherwise.

Each JSONL record has `harness`, `host_native_discovery` (the isolation summary), the instructions file and hash, the session init (model, tools, skills, agents, MCP servers, plugins) as isolation evidence, tool calls as command evidence, token usage, and Claude's reported duration, turns, and `total_cost_usd`. The prompt hash replaces the temporary copy's path with a placeholder, so equal inputs hash equally.

```bash
bun skills/evals/run-routing-evals.ts live --case describe-pr --harness claude --allow-live
```

## Standards review

[run-standards-evals.ts](run-standards-evals.ts) checks whether a review applies the coding standards. Each case in [standards-cases.ts](standards-cases.ts) is a small TypeScript git repository: `before` is committed and `after` is left as the uncommitted diff. Five cases each plant one defect class from the 2026-10-02 retro (a tautological constant test, a test that asserts source text order, a test named for malformed input that mocks its own `readFileSync` to return valid JSON, restating and change-log comments, and a shallow module whose callers orchestrate its pass-through functions). A sixth extends a file whose existing test re-asserts a constant, so the plant predates the diff in a touched file. A clean control holds a small deep module with behavior tests through its public interface. A second control extends a clean module and its tests while an untouched file holds restating comments; it passes only with zero findings, so the untouched smell must not be reported.

Live mode runs `claude -p` from the fixture with the same flags, environment, and read-only tools as the routing harness, the diff in the prompt, and the reviewer instructions appended. The model never sees the source tree: each case copies `coding-standards.md`, every doc it names in backticks (`engineering/references/boundary-design.md`, `engineering/references/proof.md`, `test-design/references/test-selection.md`, `review-and-simplify-changes/SKILL.md`), and `agents/reviewer.toml` into a temporary directory, and `--add-dir` exposes only that copy and the fixture. A source whose standards name a missing doc fails setup. Fixture directories use the neutral prefix `standards-fixture-`, and neither paths, file names, nor the prompt name the case or its planted category. The prompt asks for findings in every touched file, pre-existing code included. The reviewer returns `{findings:[{file, category, summary, origin}]}`, where the required `origin` is `new` or `touched`; the prompt and schema list every allowed category id. Records carry `host_native_discovery` with the standards isolation summary, `claude_routing`, the staged doc list, and hashes of the standards, reviewer instructions, diff, and prompt.

The judge passes a defect case when each plant has a finding in one of its accepted files, under its category or a listed alternative, whose summary names one of the plant's evidence tokens (for example `MAX_NICKNAME_LENGTH` or `32`, `readFileSync`, or `malformed`). A located finding without a token counts as missing with reason `no-evidence`. A plant that names an `origin` also needs a matching finding with that origin, or it is missing with reason `wrong-origin`. Findings that match no plant are `extra`, whatever their category, and more than one fails the case; the defect fixtures carry no secondary defects, so a correct review has nothing else to report. The control, a small `LruCache` class with behaviour tests through its public methods, passes only with zero findings. Fixtures and doc copies are removed after each case.

```bash
bun skills/evals/run-standards-evals.ts dry-run --all
bun skills/evals/run-standards-evals.ts live --case clean-control --case slop-comment --allow-live
```

The evidence token shows the reviewer located the defect, not that its diagnosis is right. Read the summaries before treating a pass as a correct diagnosis.

## Routing

Routing live mode classifies tasks in a read-only sandbox. The prompt specifies the classification task and result format; skill instructions supply execution policies. It compares the primary skill, modifiers and references as unordered sets (neither the prompt nor the schema gives their order meaning), required actions, optional forbidden actions, mutation authority, question boundary, and stop condition against [routing-cases.json](routing-cases.json). [routing-result.schema.json](routing-result.schema.json) defines the output. Classification does not prove execution.

Reference output uses exact paths relative to the supplied skills root, beginning with the owning skill folder. Root Markdown files, `references/` paths, and nested reference folders preserve their filename case. The validated fixture allowlist still rejects unknown or invented references.

`host_skills` lists skills the host supplies outside this tree (`humanizer`, `show-me`, `review-agent`). A result may name them as modifiers, for example when `describe-pr` applies `humanizer`; the parser accepts them and the comparison ignores them, so naming one neither fails nor is required. Cases may not expect them.

A case may list `optional_references`: references a correct route may load but need not. Every first-pass review case lists `describe-pr/references/merge-danger.md` this way, one-way and hot-path cases included: the skill has reviewers classify Merge danger against it, and the main agent may pick the one-way or hot-path lane from the task alone, so the skill text supports loading it without requiring it. The comparison ignores them; any other extra or missing reference still fails. Read-only review cases accept question `none` or `only-if-blocked`, since a findings-only review has no decision to block on.

Required actions use exact matching. `keep-coupled-review-local` remains a known action so fixtures can reject main-agent review explicitly; it cannot satisfy reviewer selection.

Progressive review cases cover:

- `implementation-complete-needs-review` and `commit-ready-needs-review`: require the full initial review without the user naming a skill.
- `follow-up-review-delta`: review edits since the latest reviewed snapshot, affected contracts, and unresolved findings. Prior coverage is explicitly still valid; repeating the full review fails this case.
- `follow-up-review-missing-snapshot`: recover coverage or review the full identifiable intended diff. The fixture makes recovery unavailable, so an assumed delta is insufficient.
- `combined-slice-review`: inspect previously unreviewed wiring before relying on completed slice reviews.

Every substantive pass requires independent `reviewer` coverage, including Standards, Intent, and simplification. A first full pass in the default or separable lane also requires `delegate-design-reviewer-review`, the second-family `design_reviewer` pass; follow-up delta cases (`follow-up-review-delta`, `oracle-unresolved-review-dispute`, and the refiner and judgement cases) forbid it. The one-way-door or hot-path lane adds both `oracle` seats reconciled by a `judge` (`reconcile-oracle-with-judge`) and a blast-radius pass (`run-blast-radius-pass`); otherwise reserve `oracle` for an explicit user request or a concrete blocker that remains after investigation or ordinary review. The main agent orchestrates, judges findings, applies fixes, verifies, and owns completion; its own inspection cannot supply review coverage. Children stay nonrecursive. A reviewer may take fix follow-ups when it did not author the fixes.

`forbidden_actions` applies only where the case excludes an action. New evidence can justify reopening earlier scope; the follow-up case states that no such evidence exists. Review cases load `review-and-simplify-changes/references/delegated-review.md` before assigning tracks. These classifications do not prove review depth, defect detection, or use of a host-provided `review-agent`.

Tenant access, charge retries, and mixed-version migrations are one-way doors, and `hot-path-one-way-review` changes realtime fan-out latency: each requires `reviewer`, both `oracle` seats with a `judge`, a blast-radius pass, and `delegate-design-reviewer-review`, and stays read-only. The migration case requires the data-systems modifier and its foundations/transactions references because backfill, overlapping writers, and rollback affect durable data. `oracle-unresolved-review-dispute` tests escalation after ordinary reviewers investigate a concrete disagreement; it also requires a delta pass and forbids an unnecessary full repeat.

- `billing-copy-independent-review` and `small-coupled-review`: one independent reviewer covers the coupled scope, even without a risk trigger.
- `independent-review-tracks`: assign material tracks and dispatch them in parallel when capacity is available. Topics do not imply a fixed agent count.
- `review-no-independent-capacity`: report blocked coverage, without main-agent fallback, claimed completion, or unnecessary questions.
- `refiner-clear-standards-findings`: send `fix: clear` Standards findings (inlining a pass-through module and rewriting a private-call test through the public API, neither mechanical) to the refiner, then a full read-only `reviewer` delta review by a non-author.
- `touched-file-clear-refactor`: two `origin: touched` findings (an unexported pass-through helper and a tautological test) arrive untagged, so the route must classify them clear under the standards, send them to the refiner, and run a non-author delta review; listing them as audit items fails. It accepts `evaluate-feedback` or `pin-review-scope` as the first step; the validator allows that pair, and only that pair, in place of a required `pin-review-scope` action.
- `touched-file-budget-audit-item`: a clear touched fix of about 150 lines against a 12-line diff exceeds the touched-origin budget, so it must become an audit item, not a refiner dispatch.
- `new-origin-audit-finding-stays-open`: an audit-sized finding in new code cannot be listed as a terminal audit item; it stays open (`carry-unresolved-findings-forward`) until fixed or deferred by Q.
- `touched-file-audit-item`: pre-existing touched-file debt that needs a three-module redesign and a public contract change requires `list-audit-item-without-fixing` and forbids the refiner; the defect fix made since R1 gets a non-author delta review. It is the near-negative for `improve-codebase-architecture`: a small diff does not run the audit.
- `large-change-subsystem-review`: a new subsystem of about 800 lines requires `run-large-change-audits` (independent reviewers run `improve-codebase-architecture` and `improve-test-suite`) on the first full pass. It is an action because reviewers, not the main agent, apply those skills; the case lists them under `optional_modifier_skills`, which the comparison ignores like `optional_references`, so a route may also name them as modifiers. The touched-file cases forbid the action.
- `review-judgement-only-findings`: the main agent decides each `fix: judgement` finding, and any resulting edit gets a non-author delta review. It expects the boundary-design reference because the open judgement concerns inlining a shallow module. It, `broad-read-only-review`, and `hot-path-one-way-review` forbid the refiner dispatch.
- `describe-pr-one-way-migration` requires `mark-one-way-door`; `describe-pr-copy-two-way` forbids it. `merged-cleanup-no-question` runs cleanup without asking; `finish-branch` forbids that, requires the integration choice, and accepts mutation `after-user-choice`.
- `retro-explicit-weekly` expects `writing-skills/SESSION-LESSONS.md`, which the retro skill reads first, and accepts pinning the window (`pin-review-scope`) as the first action. Its mutation is `requested-plan-file` because the skill writes `<out>/RETRO.md`; the retro stays read-only for the code it analyses, so it neither requires nor forbids `keep-task-read-only`.

Role boundaries also cover ordinary delegated work:

- `delegated-substantive-defect-review`: select `reviewer` and the available host `review-agent`, assign Standards, Intent, and simplification to independent reviewers, and keep the outer loop with the main agent.
- `delegated-mechanical-review-evidence`: select `fast_reviewer` for bounded symbol/import evidence; it forbids `delegate-design-reviewer-review`.
- `delegated-review-command-evidence`: select `verifier` for actual command results; it forbids `delegate-design-reviewer-review`.
- `oracle-design-advice` explicitly requests Oracle. `oracle-stalled-debugging-advice` presents an unexplained crash after investigation. Both consult `oracle` without invoking defect review when there is no implementation diff.

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
- `automatic-independent-review`: the same ordinary implementation request with subagents allowed. Requires a successful fresh or bounded-context `reviewer` spawn, its actual returned review, and a later main-agent final response and completed turn. The parser also recognizes a genuine Oracle escalation; main-agent claims alone cannot pass.
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

The saved rollout must contain correlated dispatch, successful spawn, and a nonempty final result from that same independent reviewer before the parent finishes. Missing or unsupported trace evidence fails the case. Unit negatives reject narrative-only review claims, failed dispatch, unrelated results, full-history forks, and late or missing completion.

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
