# Codex Skills

This repo contains a Codex-native skill system for software work.

It is designed around a small global harness in [AGENTS.md](AGENTS.md), a small set of top-level routing skills in [skills](skills), and progressive disclosure through references instead of giant `SKILL.md` files.

## Design Goals

- keep the top-level skill surface small
- route software work through `software-engineering-flow` first, then into the narrowest producer or reviewer skill
- use narrower skills only when the problem is really about tests, debugging, Rust, data systems, or other specialized engineering domains
- keep prompts small, explicit, and backed by behavioral evals
- require fresh verification before completion claims
- avoid stale Claude/Anthropic/runtime-specific assumptions

This repo targets GPT-5.6; OpenAI's `gpt-5.6` alias currently routes to `gpt-5.6-sol`. Model upgrades are tuning passes: validate the deployed model and reasoning settings on representative work rather than treating a slug change as sufficient.

Prompt and skill guidance:
- start with the smallest prompt and tool set that reliably completes the task; add instructions only for observed gaps
- state outcomes, success evidence, important constraints, and approval boundaries; let the model infer routine steps
- use one compact authorization policy instead of repeating permission warnings throughout the prompt
- prioritize required evidence, decisions, caveats, and next actions instead of imposing generic brevity or global response templates
- use lightweight task-specific structure; disclose branch-specific detail behind precise reference pointers
- give ordered steps checkable completion criteria, co-locate related rules and caveats, and prune duplication and sentence-level no-ops
- benchmark task success, final-answer completeness, evidence, tokens, latency, and cost on representative prompts

References:
- OpenAI GPT-5.6 model guidance: https://developers.openai.com/api/docs/guides/latest-model
- Matt Pocock's writing-great-skills reference: https://github.com/mattpocock/skills/tree/main/skills/productivity/writing-great-skills

## Top-Level Skills

Current top-level routers:

- `software-engineering-flow`
  - first router for engineering work; selects the right producer, reviewer, debugging, testing, branch, or verification skill
- `writing-software`
  - default producer for larger software changes, refactors, interface design, and implementation planning
- `testing-software`
  - proof producer for test strategy, proof choice, TDD, and keeping tests trustworthy
- `systematic-debugging`
  - root-cause work when the failure mode is not understood yet
- `verification-before-completion`
  - final evidence gate before claiming success
- `grill-me`
  - standalone router for stress-testing a plan or design before execution
- `improve-codebase-architecture`
  - critical repo or subsystem review for simpler structure, clearer seams, and a phased agent-friendly improvement plan
- `improve-test-suite`
  - critical test-suite review for removing bad or redundant tests and planning stronger seam-level proof
- `designing-data-intensive-systems`
  - workload, storage, consistency, partitioning, and Timescale/Postgres decisions
- `writing-rust`
  - Rust-specific API, ownership, and refactor guidance
- `effect-ts`
  - Effect-specific service, error, wrapper, and testing guidance
- `using-git-worktrees`
  - optional branch/workspace isolation for risky or long-running work
- `finishing-a-development-branch`
  - merge, PR, keep, or discard decisions after implementation
- `receiving-code-review`
  - evaluate review feedback before blindly implementing it
- `describe-pr`
  - reviewer-oriented PR descriptions after the work is already done
- `writing-skills`
  - skill authoring, routing, descriptions, and eval guidance

## How The System Works

1. `AGENTS.md` provides the global operating contract.
2. A top-level skill router is selected based on the task.
3. The router stays small and points to references only when needed.
4. References carry deeper theory, examples, and edge cases.
5. Structural evals catch accidental sprawl and stale prompt drift.

For larger features:
- start with `software-engineering-flow`
- let `writing-software` branch into greenfield or brownfield mode based on whether the main uncertainty is new shape or existing invariants
- use narrower routers only when they clearly dominate
- pull in references only when the problem actually needs them
- when Q has requested or authorized a durable plan, keep it in the target repo, typically under `docs/exec-plans/active/`

## Skill Families

### Core software flow

- `writing-software`
- `testing-software`
- `systematic-debugging`
- `verification-before-completion`
- `grill-me`

### Architecture and systems

- `improve-codebase-architecture`
- `improve-test-suite`
- `designing-data-intensive-systems`
- `writing-rust`
- `effect-ts`

### Workflow and handoff

- `using-git-worktrees`
- `finishing-a-development-branch`
- `receiving-code-review`
- `describe-pr`

### Meta

- `writing-skills`

## Evals

The executable eval suite lives in [skills/evals](skills/evals).

It currently covers:
- exact skill inventory, quoted frontmatter, required sections, local links, and stale bindings
- 28 representative routing cases with mandatory router, primary/secondary sequence, first action, mutation authority, question policy, stop condition, and required actions
- dry-run previews that make no external calls
- optional guarded GPT-5.6-sol classification through `codex exec`

Run local structural and fixture validation:

```bash
bash skills/evals/check-skill-surface.sh
bun skills/evals/run-routing-evals.ts dry-run
```

Live evaluation requires an explicit case or `--all` plus `--allow-live`; see [skills/evals/README.md](skills/evals/README.md).

## Exec Plans

Long-running work can use local exec-plan files in the target repo. The path convention and template live in [skills/writing-software/EXEC-PLAN-FILES.md](skills/writing-software/EXEC-PLAN-FILES.md).

Suggested target-repo path:
- `docs/exec-plans/active/`: current plans
- `docs/exec-plans/completed/`: archived finished plans

Use them for large, multi-session, or multi-agent work only when the user requests or authorizes the durable artifact. Keep them local by default; commit only when the plan has durable team value and committing it is in scope.

## What Is Not In Scope

This repo does not try to preserve every workflow from Claude-centric or HumanLayer-specific systems.

It intentionally avoids:
- mandatory artifact pipelines
- always-on planning choreography
- host-specific agent rosters
- cloud permalink hooks
- ticket-directory conventions baked into generic skills

Useful ideas from those systems are merged only when they improve Codex behavior without adding workflow sprawl.
