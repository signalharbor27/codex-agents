# Skill Evals

Executable checks for the active engineering skill surface.

The suite verifies:

- exact top-level skill inventory
- exact invocation-policy inventory from `agents/openai.yaml`
- quoted, trigger-focused descriptions with the configured length budget
- required entrypoint sections, line limits, and valid local links
- one-level progressive references with no reference-to-reference chains
- one primary skill plus exact modifiers and pressure references
- first action, mutation authority, question boundary, stop condition, and required actions
- the static adaptive-review delegation contract and material-topic coverage; behavioral review fixtures remain to be migrated

## Local Validation

```bash
bash skills/evals/check-skill-surface.sh
bun test skills/evals/run-routing-evals.test.ts
bun skills/evals/run-routing-evals.ts validate
bun skills/evals/run-routing-evals.ts dry-run
```

The Bun validator is dependency-free and authoritative for fixture, inventory, frontmatter, link, progressive-disclosure, and cross-field rules.

Dry-run emits one JSON line per case with `external_call: false` and the expected contract:

- `primary_skill`
- `modifier_skills`
- `references`
- `actions`
- `first_action`
- `mutation`
- `question`
- `stop`

Preview one case:

```bash
bun skills/evals/run-routing-evals.ts dry-run --case routine-refactor
```

## Optional Live Evaluation

Live mode classifies the task; it does not execute it. It explicitly uses GPT-5.6 SOL at `xhigh`, an ephemeral session, a read-only sandbox, and [routing-result.schema.json](routing-result.schema.json).

External-call consent and explicit scope are mandatory:

```bash
bun skills/evals/run-routing-evals.ts live --case unknown-flaky-failure --allow-live
bun skills/evals/run-routing-evals.ts live --all --allow-live
```

The runner compares the exact primary skill, modifiers, disclosed references, required actions, and behavior contract. A mismatch exits nonzero.

## Files

- [routing-cases.json](routing-cases.json): representative routes and expected behavior
- [routing-result.schema.json](routing-result.schema.json): structured live output
- [run-routing-evals.ts](run-routing-evals.ts): validation, dry-run, and guarded live runner
- [check-skill-surface.sh](check-skill-surface.sh): complete local entrypoint
