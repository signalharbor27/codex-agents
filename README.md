# Codex Skills

This repo contains a Codex-native skill system for software work.

It is designed around a small global harness in [AGENTS.md](AGENTS.md), a small set of top-level routing skills in [skills](skills), and progressive disclosure through references instead of giant `SKILL.md` files.

## Design Goals

- keep the top-level skill surface small
- route software work through `software-engineering-flow` first, then into the narrowest producer or reviewer skill
- use narrower skills only when the problem is really about tests, debugging, Rust, data systems, or other specialized engineering domains
- keep prompts compact and explicit
- require fresh verification before completion claims
- avoid stale Claude/Anthropic/runtime-specific assumptions

This repo is intentionally aligned with current OpenAI prompt-guidance themes:
- keep instructions specific and compact
- prefer outcome-first prompts over process-heavy scaffolding
- separate complex work into clear stages only when it improves reliability
- prefer small reusable prompt components over one giant always-on prompt
- make success and verification criteria explicit where they matter
- scale verification to risk and blast radius

Reference:
- OpenAI prompt guidance: https://developers.openai.com/api/docs/guides/prompt-guidance/
- Amp GPT-5.5 findings: https://ampcode.com/models/gpt-5.5

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
- `designing-with-patterns`
  - pattern-vs-no-pattern architecture decisions
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
- use a file-backed exec plan in the target repo, typically under `docs/exec-plans/active/`, when the work is large, multi-session, or multi-agent

## Skill Families

### Core software flow

- `writing-software`
- `testing-software`
- `systematic-debugging`
- `verification-before-completion`
- `grill-me`

### Architecture and systems

- `designing-with-patterns`
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

The lightweight eval suite lives in [skills/evals](skills/evals).

It currently covers:
- skill count and expected top-level routers
- required `When to Use` / `When Not to Use` sections
- description shape
- banned legacy terms
- routing cases for representative prompts

## Exec Plans

Long-running work can use local exec-plan files in the target repo. The path convention and template live in [skills/writing-software/EXEC-PLAN-FILES.md](skills/writing-software/EXEC-PLAN-FILES.md).

Suggested target-repo path:
- `docs/exec-plans/active/`: current plans
- `docs/exec-plans/completed/`: archived finished plans

Use them for large, multi-session, or multi-agent work. Keep them local by default; commit only when the plan has durable team value.

Run:

```bash
bash skills/evals/check-skill-surface.sh
```

`routing-cases.json` is the seed set for manual or agent-driven behavioral checks after major edits.

## What Is Not In Scope

This repo does not try to preserve every workflow from Claude-centric or HumanLayer-specific systems.

It intentionally avoids:
- mandatory artifact pipelines
- always-on planning choreography
- host-specific agent rosters
- cloud permalink hooks
- ticket-directory conventions baked into generic skills

Useful ideas from those systems are merged only when they improve Codex behavior without adding workflow sprawl.
