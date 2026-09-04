# Skill evals

The local validator checks skill inventory, invocation policy, quoted frontmatter, description and line limits, local links, one-level references, and routing contracts. Review cases cover adaptive delegation, local review of coupled changes, and topic coverage without a reviewer quota.

```bash
bash skills/evals/check-skill-surface.sh
bun test skills/evals/run-routing-evals.test.ts skills/evals/run-execution-evals.test.ts
bun skills/evals/run-routing-evals.ts dry-run --case small-coupled-review
bun skills/evals/run-execution-evals.ts dry-run --all
```

Dry-run prints commands and expected scope without calling a model. The Bun runners have no package dependencies.

## Optional live checks

Both runners default to `gpt-6-astra` at `high`. Live calls require permission, `--allow-live`, and one explicit case or `--all`. `--model` and `--effort` support comparisons; unsupported model/effort pairs fail at the provider.

```bash
bun skills/evals/run-routing-evals.ts live --case small-coupled-review --allow-live
bun skills/evals/run-execution-evals.ts live --case authorized-implementation --allow-live

# Optional comparison, using the same case.
bun skills/evals/run-routing-evals.ts live --case small-coupled-review --model gpt-5.6-sol --effort xhigh --allow-live
```

Routing live mode classifies tasks in a read-only sandbox. It compares the primary skill, exact modifiers and references, required actions, mutation authority, question boundary, and stop condition against [routing-cases.json](routing-cases.json). Its output follows [routing-result.schema.json](routing-result.schema.json). Classification does not prove execution behavior.

## Execution cases

[run-execution-evals.ts](run-execution-evals.ts) runs real edits and commands in disposable fixtures:

- `authorized-implementation`: make an agreed greeting change, verify it, and finish without asking again.
- `permission-citation`: prepare a release draft, then ask for approval with the exact skill path and quoted rule. Uses a synthetic `release-preview/SKILL.md`; no publication tool or destination exists.
- `verification-reuse`: complete the change and its check, then answer a status follow-up using the unchanged proof.
- `steering-preserves-objective`: edit, pause at the user's request, then incorporate a prefix correction and finish the original behavior and proof.

The last two use a second ephemeral session with the captured first-turn transcript. They test scripted continuation, not actual mid-turn message delivery or native session resume.

The runner copies current `AGENTS.md` and the relevant skills into a fresh temporary directory. Model commands use `workspace-write`, disabled network access, excluded general `/tmp` writes, ignored user config/rules, and no persistent session. Model API calls still use the installed Codex authentication. No branch or shared repository write is needed. Sandbox enforcement depends on the installed Codex runtime; the runner never falls back to bypass mode.

Each turn has a 180-second timeout. Process groups are terminated on timeout or interrupt; temporary fixtures are removed on success, failure, SIGINT, and SIGTERM. An uncatchable process kill can leave a temporary directory. Live output records model settings, assistant/command evidence, artifacts, and judge failures. A failed case or runner error exits nonzero.

Judges check actual JSON behavior, unchanged fixture scripts, scope, completed command events, exit status, and a receipt written by the protected verification script with a hash matching the final artifact. Receipt count detects repeated checks even when Codex drops command stdout; a receipt alone cannot pass without a successful command event. They reject missing or repeated checks. The recognized proof command is `bun verify.mjs`, optionally shell-wrapped. Alternate command forms fail closed. Approval wording uses narrow text checks; failures need transcript review. These cases cover small configuration edits, not arbitrary implementation quality, adversarial proof forgery, publication, or runtime steering transport.

Local tests include negative cases for opt-in guards, config injection, cleanup, incomplete traces, false completion, stale/failed/repeated proof, dropped objectives, changed oracles, and missing permission citations.
