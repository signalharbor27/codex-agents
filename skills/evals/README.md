# Skill Evals

Executable checks for the active Codex engineering skill surface.

The suite covers:

- structural skill checks: expected routers, required sections, description shape, and stale terms
- routing fixture validation: exact skill inventory, mandatory router, primary and allowed secondary skills, ordered sequences, and behavior contracts
- behavioral expectations: first action, mutation authority, question boundary, stop condition, and required workflow actions
- optional live routing evaluation through `codex exec` with GPT-5.6-sol

## Static validation

Run the complete local check:

```bash
./skills/evals/check-skill-surface.sh
```

Run only routing fixture and result-vocabulary validation:

```bash
bun skills/evals/run-routing-evals.ts validate
```

Run focused runner boundary tests:

```bash
bun test skills/evals/run-routing-evals.test.ts
```

The Bun validator is dependency-free. Its manual fixture validator is authoritative: it rejects unknown or malformed fields, compares `engineering_skills` with actual `SKILL.md` directories, validates local Markdown links, and checks cross-field routing invariants.

## Dry run

Preview every live invocation contract without calling a model:

```bash
bun skills/evals/run-routing-evals.ts dry-run
```

Preview one case:

```bash
bun skills/evals/run-routing-evals.ts dry-run --case wip-cleanup-quality
```

Each JSON line reports `external_call: false`, the fixed model and sandbox arguments, and the expected routing/behavior contract.

## Optional live run

Live mode invokes the installed `codex exec` CLI with:

- model `gpt-5.6-sol`
- ephemeral sessions
- read-only sandbox
- `routing-result.schema.json` as the output contract

It requires explicit external-call consent and an explicit case scope:

```bash
bun skills/evals/run-routing-evals.ts live --case unknown-flaky-failure --allow-live
```

Run all cases only when model cost and latency are intentional:

```bash
bun skills/evals/run-routing-evals.ts live --all --allow-live
```

Live evaluation classifies the intended workflow; it does not execute the task embedded in a case. The runner compares mandatory/primary routing, allowed secondaries, ordered required sequence, required actions, and behavioral expectations. A non-matching case exits nonzero.

## Files

- `routing-cases.json`: versioned cases and expected behavior
- `routing-result.schema.json`: structured live-model output schema
- `run-routing-evals.ts`: static, dry-run, and live runner
- `check-skill-surface.sh`: complete structural and routing validation entrypoint
