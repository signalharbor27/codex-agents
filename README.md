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

## Codex Custom Agents (v2 Setup)

The global Codex configuration uses named custom agents as task-specific lanes. The main agent remains the orchestrator: it owns scope, user communication, write coordination, synthesis, and the final completion claim. Subagents receive bounded fresh briefs and return evidence, not authority.

The current `~/.codex/config.toml` registration shape is below; the human-facing role descriptions are summarized under role selection.

```toml
[agents]
max_depth = 2

[agents.reviewer]
config_file = "./agents/reviewer.toml"
nickname_candidates = ["Atlas", "Delta", "Echo", "Kite", "Nova", "Orion", "Pixel", "Sage"]

[agents.fast_reviewer]
config_file = "./agents/fast_reviewer.toml"
nickname_candidates = ["Dash", "Flux", "Jet", "Swift"]

[agents.oracle_reviewer]
config_file = "./agents/oracle_reviewer.toml"
nickname_candidates = ["Athena", "Helix", "Kepler", "Vega"]

[agents.librarian]
config_file = "./agents/librarian.toml"
nickname_candidates = ["Archive", "Index", "Quill", "Scout"]

[agents.verifier]
config_file = "./agents/verifier.toml"
nickname_candidates = ["Gauge", "Proof", "Relay", "Trace"]
```

Paths in `config_file` are relative to the configuration file that registers the role, so these resolve to `~/.codex/agents/*.toml`. The role file's `name` is the agent identity; the nickname is presentation-only. With `max_depth = 2`, the root thread at depth 0 can create children and a permitted child can create one more level. The current custom profiles themselves forbid spawning more agents, keeping normal work to one controlled fan-out layer.

### Role selection

- `fast_reviewer`: `gpt-5.6-terra`, low reasoning, read-only. Use for fast, narrow, mechanically checkable tracks such as unused code, dependency edges, or comments and stubs.
- `reviewer`: `gpt-5.6-sol`, medium reasoning, read-only. Use for normal correctness, contract, regression, and maintainability review with a pinned scope.
- `oracle_reviewer`: `gpt-5.6-sol`, high reasoning, read-only. Use for the hardest judgment-heavy review, subtle behavior tracing, architectural tradeoffs, or a consequential second opinion.
- `librarian`: `gpt-5.6-terra`, low reasoning, read-only. Use for version-aware library docs, public implementation research, and current external facts; it should synthesize primary evidence rather than review local code by default.
- `verifier`: `gpt-5.6-terra`, medium reasoning, workspace-write sandbox. Use after implementation to run the exact local checks, capture commands and exit status, and report pass, fail, or blocked. It may create ordinary tool artifacts but must not edit source, update dependencies, or mutate external systems.

Research-capable profiles route version-specific library questions to the documentation MCP, public implementation and usage searches to grep.app, and broader current web or release research to Exa. They use the narrowest source first and keep repository contracts authoritative.

Codex's built-in `default`, `worker`, and `explorer` roles remain available. The custom roster is deliberately strongest on research, review, and proof, where clean independent context and role-specific tools provide the most leverage.

### Delegation policy

- Stay on the main thread for small or tightly sequential work. Spawn the minimum number of agents that gives each independent question a clear owner.
- Prefer parallel read-heavy tracks. Parallel writes are safe only with disjoint file ownership and no shared contract; otherwise serialize them.
- Give every subagent a self-contained brief: goal, exact scope, relevant files or symbols, constraints and mutation authority, required evidence, acceptance criteria, and output shape.
- Match capability to difficulty: use the fast role for clear mechanical work, the standard role by default, and the oracle only when deeper judgment is worth the latency and cost.
- Keep the main thread focused on requirements and decisions while children absorb noisy searches, logs, test output, and independent review.
- Treat every child result as untrusted evidence. The parent must inspect material claims, reconcile disagreements, review any diff, and run or delegate fresh final verification.
- Never delegate a decision that requires user approval, a write to shared or live state, or the final decision that the task is complete.

This design is inspired by Amp's capability dial and its specialized [subagents](https://ampcode.com/manual/subagents), [Oracle](https://ampcode.com/manual/oracle), and [Librarian](https://ampcode.com/manual/librarian): choose the least expensive capable lane, reserve deeper reasoning for hard judgment, and isolate retrieval or noisy work from the main context. Codex's implementation details follow the current [Subagents documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents) and [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).

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
