# Codex Skills

This repository is the source for Q's global Codex operating contract, software-engineering skills, and custom subagent profiles. It targets GPT-5.6 SOL at `xhigh`.

The core rule is simple: select one primary skill for the current job, then disclose only the domain modifiers and references demanded by present evidence.

## Engineering Flow

- `engineering`: understood features, bug fixes, refactors, plans, and research. It owns inspection through fresh verification.
- `debugging`: unexplained failures. It owns reproduction and root cause, then the smallest authorized fix through proof.
- `test-design`: tests are the primary task, including explicit TDD, proof-layer selection, doubles, assertions, and focused coverage.

Review, audit, branch, handoff, and skill-authoring tasks use their narrower skill as primary. Rust, Effect, and data-intensive-system skills are modifiers: they add domain constraints without repeating the generic producer workflow.

Do not stack separate planning, implementation, testing, and final-proof skills. A primary skill owns its whole loop. Transition only when the task genuinely changes jobs.

## Progressive Disclosure

Routine engineering loads only [engineering/SKILL.md](skills/engineering/SKILL.md). It names present pressure and opens a one-level reference only when that pressure exists:

- new or large feature, including conceptual integrity: `feature-shape.md`
- consequential module/API ownership or competing interface shapes: `boundary-design.md`
- poorly understood or migration-sensitive code: `legacy-change.md`
- durable state, money, jobs, retries, or external effects: `state-and-effects.md`
- contracts, schemas, SDKs, rollout, or rollback: `compatibility-and-delivery.md`
- auth, permissions, abuse, replay, or sensitive data: `security.md`
- hot paths or capacity: `performance-and-capacity.md`
- non-obvious proof: `proof.md`
- explicitly authorized multi-session discovery or execution plan: `durable-plan.md`

`debugging` and `test-design` follow the same pattern with their own short, one-level references. Reference files do not link to other references.

This structure keeps strong production guidance available without placing every checklist into every task.

## Why These Principles

- Tracer bullets and vertical slices establish a real end-to-end path before broad scaffolding.
- Conceptual integrity keeps a feature centered on one coherent model while treating every extra concept, state, and option as a reasoning cost.
- Deep modules and information hiding reduce caller knowledge and change amplification.
- Characterization seams make legacy changes observable before agents rewrite plausible behavior.
- Durable state/effect maps expose retries, duplicate delivery, partial failure, and reconciliation before production.
- Compatibility and expand/migrate/contract sequencing protect mixed-version consumers.
- Trust-boundary reasoning focuses security work on concrete authorization and abuse paths.
- Measurement-first performance work prevents speculative caches, concurrency, and denormalization.
- Claim-matched proof keeps tests small while preventing stale or partial completion claims.

The concise references synthesize established work including Hunt and Thomas, Brooks, Hoare, Wirth, Dijkstra, Ousterhout, Parnas, Feathers, Fowler, Evans, Beck, Meszaros, Humble and Farley, Nygard, Kleppmann, Google SRE, Brendan Gregg, and OWASP. Each reference states its source basis.

## Protected Review and Improve Skills

- `review-and-simplify-changes` keeps its exact eight-fresh-agent invariant for every broad review and its explicit single-track exception.
- `improve-codebase-architecture` and `improve-test-suite` retain their audit and phased-plan behavior.

Their only redesign changes are routing names, pressure-reference paths, and upstream-prevention classification.

## Other Skills

- `designing-data-intensive-systems`: workload, storage, consistency, partitioning, and recovery modifier
- `writing-rust`: Rust ownership, traits, errors, async, and unsafe modifier
- `effect-ts`: Effect service, error, layer, runtime, wrapper, and stream modifier
- `grill-me`: interactive pressure test for consequential user-owned decisions
- `receiving-code-review`: validate review feedback against repository truth
- `using-git-worktrees`: explicitly requested or necessary workspace isolation
- `finishing-a-development-branch`: verified branch integration choices
- `describe-pr`: reviewer-oriented summary from the final diff and evidence
- `writing-skills`: skill routing, descriptions, progressive disclosure, and evals

## Global Operating Contract

[AGENTS.md](AGENTS.md) is a global contract, not repository-specific guidance. Keep workflows in skills; keep safety, permissions, honesty, scope, delegation, verification, and git boundaries in `AGENTS.md`.

After changing it, sync it byte-for-byte to the user instruction source:

```text
~/.agents/AGENTS.md
```

Codex CLI discovers global instructions from `$CODEX_HOME/AGENTS.md`, normally
`~/.codex/AGENTS.md`. Keep that path as a symlink to `~/.agents/AGENTS.md` so
the repository file, the user source, and the Codex discovery path cannot drift.

## Custom Agents

Installable profiles live in [agents](agents). Current Codex releases discover
standalone profile files automatically; [agents/registry.toml](agents/registry.toml)
contains only shared agent settings.

- `fast_reviewer`: fast mechanical evidence
- `reviewer`: standard contract and correctness review
- `oracle_reviewer`: subtle or high-consequence judgment
- `librarian`: version-aware documentation and current-source research
- `verifier`: fresh local command evidence after implementation

The main agent owns scope, approvals, write coordination, synthesis, and the completion claim. Subagents receive bounded briefs and return evidence.

Install the profiles:

```bash
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
install -d "$CODEX_HOME/agents"
install -m 0644 \
  agents/fast_reviewer.toml \
  agents/librarian.toml \
  agents/oracle_reviewer.toml \
  agents/reviewer.toml \
  agents/verifier.toml \
  "$CODEX_HOME/agents/"
```

Merge only the shared settings from [agents/registry.toml](agents/registry.toml)
into the existing `$CODEX_HOME/config.toml`; do not append a second `[agents]`
table. Do not add redundant `[agents.<role>]` registrations for profiles already
installed under `$CODEX_HOME/agents/`.

## Skill Installation

Top-level skill folders under [skills](skills) are installable into `~/.agents/skills/`. Sync each explicit directory rather than replacing the whole global skill root, because that root can contain unrelated skills.

If another installed skill supplies an overlapping umbrella workflow, disable it with an exact `[[skills.config]]` path entry in `~/.codex/config.toml`. Restart Codex after changing discovery configuration.

## Evals

The local suite enforces:

- exact top-level skill inventory
- quoted, trigger-focused descriptions no longer than 240 characters
- required entrypoint sections and a 120-line `SKILL.md` budget
- valid local links and one-level pressure references
- one primary skill, exact modifiers, and exact disclosed references
- representative routine, pressure, debugging, testing, review, improve, domain, and handoff routes
- the broad-review eight-agent invariant
- guarded optional GPT-5.6 SOL `xhigh` live classification

Run:

```bash
bash skills/evals/check-skill-surface.sh
bun test skills/evals/run-routing-evals.test.ts
bun skills/evals/run-routing-evals.ts dry-run
```

Live model evaluation is opt-in and requires an explicit case or `--all` plus `--allow-live`; see [skills/evals/README.md](skills/evals/README.md).

## Prompt Design Basis

- Start with outcomes, success evidence, important constraints, authority, and stop condition.
- Give the model freedom for routine choices; use strict ordered steps only where sequence protects correctness.
- Keep metadata trigger-focused, entrypoints small, and branch-specific material behind precise pointers.
- Add instructions only for observed failure modes and remove sentence-level no-ops.
- Evaluate task success and required evidence before tokens, latency, or cost.

Current guidance:

- [OpenAI GPT-5.6 prompting guidance](https://developers.openai.com/api/docs/guides/model-guidance?model=gpt-5.6#prompting-best-practices)
- [OpenAI skills documentation](https://learn.chatgpt.com/docs/build-skills)
- [Matt Pocock's writing-great-skills reference](https://github.com/mattpocock/skills/tree/main/skills/productivity/writing-great-skills)
