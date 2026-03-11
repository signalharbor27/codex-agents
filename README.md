# Codex Skills

This repo contains a Codex-native skill system for software work.

It is designed around a small global harness in [AGENTS.md](AGENTS.md), a small set of top-level routing skills in [skills](skills), and progressive disclosure through references instead of giant `SKILL.md` files.

## Design Goals

- keep the top-level skill surface small
- route large software work through `writing-software` by default
- use narrower skills only when the problem is really about tests, debugging, Rust, data systems, UI, or other specialized domains
- keep prompts compact and explicit
- require fresh verification before completion claims
- avoid stale Claude/Anthropic/runtime-specific assumptions

This repo is intentionally aligned with current OpenAI prompt-guidance themes:
- keep instructions specific and compact
- separate complex work into clear stages only when it improves reliability
- prefer small reusable prompt components over one giant always-on prompt
- make success and verification criteria explicit where they matter

Reference:
- OpenAI prompt guidance: https://developers.openai.com/api/docs/guides/prompt-guidance/

## Top-Level Skills

Current top-level routers:

- `writing-software`
  - default router for larger software changes, refactors, interface design, and implementation planning
- `testing-software`
  - test strategy, proof choice, TDD, and keeping tests trustworthy
- `systematic-debugging`
  - root-cause work when the failure mode is not understood yet
- `verification-before-completion`
  - final evidence gate before claiming success
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
- `frontend-design`
  - building and reviewing frontend/UI work
- `copywriting`
  - new copy and revision of existing copy
- `seo-audit`
  - SEO diagnosis, including schema references
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
- start with `writing-software`
- use narrower routers only when they clearly dominate
- pull in references only when the problem actually needs them
- use a file-backed exec plan under `docs/exec-plans/active/` when the work is large, multi-session, or multi-agent

## Skill Families

### Core software flow

- `writing-software`
- `testing-software`
- `systematic-debugging`
- `verification-before-completion`

### Architecture and systems

- `designing-with-patterns`
- `improve-codebase-architecture`
- `improve-test-suite`
- `designing-data-intensive-systems`
- `writing-rust`
- `effect-ts`

### Product/UI/content

- `frontend-design`
- `copywriting`
- `seo-audit`

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

Long-running work can use local exec-plan files under [docs/exec-plans](docs/exec-plans).

- `active/`: current plans
- `completed/`: archived finished plans
- [TEMPLATE.md](docs/exec-plans/TEMPLATE.md): minimal plan shape

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
