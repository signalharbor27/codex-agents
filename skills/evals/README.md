# Skill evals

These executable checks cover the active engineering skill surface.

The suite checks:

- exact top-level skill inventory
- exact invocation-policy inventory from `agents/openai.yaml`
- quoted descriptions that name their triggers and stay within the configured length limit
- required entrypoint sections, line limits, and valid local links
- one-level progressive references with no reference-to-reference chains
- one primary skill, the exact modifiers, and references required by current pressure
- first action, mutation authority, question boundary, stop condition, and required actions
- the static adaptive-review delegation contract and coverage of material topics; behavioral review fixtures still need migration

## Local validation

```bash
bash skills/evals/check-skill-surface.sh
bun test skills/evals/run-routing-evals.test.ts
bun skills/evals/run-routing-evals.ts validate
bun skills/evals/run-routing-evals.ts dry-run
```

The Bun validator has no dependencies. It is authoritative for fixture, inventory, frontmatter, link, progressive-disclosure, and cross-field rules.

Dry-run prints one JSON line for each case with `external_call: false` and this expected contract:

- `primary_skill`
- `modifier_skills`
- `references`
- `actions`
- `first_action`
- `mutation`
- `question`
- `stop`

To preview one case:

```bash
bun skills/evals/run-routing-evals.ts dry-run --case routine-refactor
```

## Optional live evaluation

Live mode classifies the task without running it. It uses GPT-5.6 SOL at `xhigh`, an ephemeral session, a read-only sandbox, and [routing-result.schema.json](routing-result.schema.json).

Live evaluation requires permission for external calls and an explicit case or `--all` scope:

```bash
bun skills/evals/run-routing-evals.ts live --case unknown-flaky-failure --allow-live
bun skills/evals/run-routing-evals.ts live --all --allow-live
```

The runner compares the exact primary skill, modifiers, disclosed references, required actions, and behavior contract. It exits nonzero when they differ.

## Files

- [routing-cases.json](routing-cases.json): sample routes and their expected behavior
- [routing-result.schema.json](routing-result.schema.json): schema for structured live output
- [run-routing-evals.ts](run-routing-evals.ts): validator, dry-run tool, and guarded live runner
- [check-skill-surface.sh](check-skill-surface.sh): local entrypoint for all checks
