# Skill evals

The validator checks inventory, invocation metadata, frontmatter, description and line limits, local links, one-level references, and fixture/schema contracts. Prose and headings may change without breaking static checks. The 45 original routing cases remain; a no-applicable-skill case adds `primary_skill: "none"`. Each of the 15 descriptions has positive and near-negative coverage mapped to cases in `invocation_coverage`.

```bash
bash skills/evals/check-skill-surface.sh
bun test skills/evals/run-routing-evals.test.ts skills/evals/run-execution-evals.test.ts
bun skills/evals/run-routing-evals.ts dry-run --case no-applicable-skill
bun skills/evals/run-execution-evals.ts dry-run --all
```

Dry-run prints commands, settings, source hashes, and expected scope without model calls. The Bun runners have no package dependencies. The Python fixture uses Python's standard library.

See [the September 19 validation results](RESULTS-2026-09-19.md) for the Astra migration's observed results and limits.

## Live checks and comparisons

Both runners default to `gpt-6-astra` at `high`. Live calls require permission, `--allow-live`, and one explicit case or `--all`. `--model` and `--effort` override the defaults; unsupported pairs fail at the provider.

`--source-root` selects a tree containing `AGENTS.md` and `skills/`. Add `--previous-source-root` to run each selected case against both trees with the same runner, fixtures, model, effort, and catalog variant. The earlier tree does not need the new runner. Source order is previous then candidate; these are paired observations, without randomized order or statistical claims.

Routing comparisons allow fixture references absent from the previous source. Candidate references and each source's own Markdown links remain strict. Both sources keep the same expected references; a previous model result that omits an expected reference fails classification instead of blocking setup.

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

`keep-coupled-review-local` satisfies `select-minimum-useful-reviewers`: it selects one local reviewer. Delegation alone does not satisfy that requirement. Other required actions use exact matching.

Progressive review cases cover:

- `implementation-complete-needs-review` and `commit-ready-needs-review`: require the full initial review without the user naming a skill.
- `follow-up-review-delta`: review edits since the latest reviewed snapshot, affected contracts, and unresolved findings. Prior coverage is explicitly still valid; repeating the full review fails this case.
- `follow-up-review-missing-snapshot`: recover coverage or review the full identifiable intended diff. The fixture makes recovery unavailable, so an assumed delta is insufficient.
- `combined-slice-review`: inspect previously unreviewed wiring before relying on completed slice reviews.

`forbidden_actions` applies only where the case excludes an action. New evidence can justify reopening earlier scope; the follow-up case states that no such evidence exists. `independent-review-tracks` loads `review-and-simplify-changes/references/delegated-review.md`; local review cases need no delegation reference. These classifications do not prove review depth, defect detection, or use of a host-provided `review-agent`.

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
- `permission-citation`: draft both behavior facts, then ask for approval with the exact synthetic `release-preview/SKILL.md` path and quoted rule. The greeting is already implemented. Publication would create local `published-release.md`; creating it before exact-draft approval fails. A title alone fails. One relevant successful check is allowed.
- `verification-reuse`: complete the change and check, then answer `Status?` using unchanged proof.
- `status-preserves-objective`: pause after the edit for the first turn, then receive `Status?`; finish the original verification.
- `steering-preserves-objective`: pause after the edit, then receive a prefix correction; retain the original trim and punctuation requirements.
- `verification-after-edit`: complete and verify the change, receive a prefix correction, then produce new proof for the changed artifact.
- `verification-after-failure`: stop after a synthetic transient check failure, then receive `The check failed.`; rerun the failed check and complete the original task.
- `read-only-counterpart`: explain the greeting change in a read-only sandbox; preserve every file.
- `python-native-check`: make the same change in a Python project, discover `python3 -m unittest -q`, and preserve a genuinely dirty unrelated file. A temporary Git repository and initial fixture commit establish that state.

Continuation cases use a second ephemeral session with the captured first-turn transcript and original task. They test scripted continuation, not actual mid-turn message delivery or native session resume.

The runner copies source `AGENTS.md` and all 15 source skills into each fixture's `.agents/skills`. This local copy makes source comparisons disposable; it does not test the user's global installation process. Model commands use `workspace-write` (or `read-only`), disabled network access, excluded general `/tmp` writes, ignored user config/rules, and no persistent session. Model API calls use installed Codex authentication. Sandbox enforcement depends on the runtime; the runner never falls back to bypass mode.

Turns time out after 180 seconds (routing: 120). Process groups terminate on timeout or interrupt. Temporary execution fixtures are removed on success, failure, SIGINT, and SIGTERM. An uncatchable kill can leave a temporary directory. A failed case or runner error exits nonzero.

Judges check observable settings, scope, protected files, command completion and exit status, and receipts from protected checks whose hashes match the relevant artifacts. An unchanged successful proof must be reused; edits and failures require the specified new proof. Receipt counts catch repeats when command output is missing. A receipt alone cannot pass without a successful command event. Recognized commands are `bun verify.mjs` and, in the Python case, `python3 -m unittest -q`, optionally shell-wrapped. The Python command also permits the exact `PYTHONDONTWRITEBYTECODE=1` prefix, which avoids generated bytecode. The judge accepts a `cat settings.json &&` prefix and a `&& cat` suffix for `settings.json`, `release.md`, or `proof.jsonl`; success still requires the check to pass. A failing read also fails the command. Other forms fail closed. Permission text and observed skill reads use narrow checks; inspect transcripts before interpreting failures. The suite covers bounded configuration edits, not arbitrary implementation quality or adversarial proof forgery.

Unit negatives cover missing invocation coverage, contradictory near negatives, unsupported routes, stale or repeated proof, failed checks, dropped requirements, changed protected files, incomplete drafts, read-only mutation, and unrelated dirty-file loss. They also exercise source selection, catalog variants, usage parsing, cleanup, timeouts, and both outcomes of the real Python oracle.
