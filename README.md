# Codex skills

This repository is the source of Q's global Codex operating contract, software-engineering skills, and custom subagent profiles. The configuration targets GPT-5.6 SOL at `xhigh`.

Route each job to one primary skill. Add a domain modifier or reference only when evidence from the task requires it.

## Engineering flow

- `engineering` owns understood features, bug fixes, refactors, plans, and research from inspection through fresh verification.
- `debugging` owns unexplained failures: reproduce the failure, prove its root cause, then make the smallest authorized fix and verify it.
- `test-design` owns work where tests are the main task, including explicit TDD, proof-layer selection, doubles, assertions, and focused coverage.

Review, audit, branch, handoff, and skill-authoring tasks use their narrower skill as primary. Rust, Effect, and data-intensive-system skills are modifiers. They add domain constraints without repeating the generic producer workflow.

Do not stack separate planning, implementation, testing, and final-proof skills. A primary skill owns its whole loop. Transition only when the task genuinely changes jobs.

`grill-me` is the sole model-invoked owner of dependency-aware interactive decisions. It can route from a natural request, an exact `$grill-me` invocation, or work that exposes several consequential, interdependent choices owned by the user. After inspection, `engineering` and the two improve skills may load the shared grilling procedure without giving up primary ownership.

## Progressive disclosure

Routine engineering begins with [engineering/SKILL.md](skills/engineering/SKILL.md) alone. That entrypoint names the active pressure and opens a one-level reference only when the pressure is present:

- new or large feature, including conceptual integrity: `feature-shape.md`
- consequential ownership, trust boundaries, invariant-bearing types, module/API shape, or competing abstractions: `boundary-design.md`
- poorly understood or migration-sensitive code: `legacy-change.md`
- durable state, money, jobs, retries, or external effects: `state-and-effects.md`
- contracts, schemas, SDKs, rollout, or rollback: `compatibility-and-delivery.md`
- auth, permissions, abuse, replay, or sensitive data: `security.md`
- hot paths or capacity: `performance-and-capacity.md`
- non-obvious proof: `proof.md`
- explicitly authorized multi-session discovery or execution plan: `durable-plan.md`

`debugging` and `test-design` follow the same pattern with their own short, one-level references. Reference files do not link to other references.

This structure keeps detailed production guidance available while protecting routine tasks from irrelevant checklists.

## Why these principles

- Tracer bullets and vertical slices establish a real end-to-end path before broad scaffolding.
- Conceptual integrity keeps a feature centered on one coherent model while treating every extra concept, state, and option as a reasoning cost.
- Deep modules and information hiding reduce caller knowledge and change amplification.
- Trusted boundary values preserve what parsing proved, while domain-owned operations keep invariants with one responsible module.
- Characterization seams make legacy changes observable before agents rewrite plausible behavior.
- Durable state/effect maps expose retries, duplicate delivery, partial failure, and reconciliation before production.
- Compatibility and expand/migrate/contract sequencing protect mixed-version consumers.
- Trust-boundary reasoning focuses security work on concrete authorization and abuse paths.
- Measurement-first performance work prevents speculative caches, concurrency, and denormalization.
- Claim-matched proof keeps tests small while preventing stale or partial completion claims.

The concise references synthesize established work including Hunt and Thomas, Brooks, Hoare, Wirth, Dijkstra, Ousterhout, Parnas, King, Wlaschin, Meyer, Bernhardt, Cockburn, Bogard, Metz, Feathers, Fowler, Evans, Beck, Meszaros, Humble and Farley, Nygard, Kleppmann, Google SRE, Brendan Gregg, and OWASP. Each reference states its source basis.

## Review and improve skills

- `review-and-simplify-changes` selects only material tracks for the pinned diff. It keeps small or tightly coupled reviews with one reviewer and delegates bounded independent tracks when separate context improves coverage; its eight topics are a coverage checklist, not an agent-count invariant.
- `improve-codebase-architecture` and `improve-test-suite` retain their audit and phased-plan behavior.

## Other skills

- `designing-data-intensive-systems`: workload, storage, consistency, partitioning, and recovery modifier
- `writing-rust`: Rust ownership, traits, errors, async, and unsafe modifier
- `effect-ts`: Effect service, error, layer, runtime, wrapper, and stream modifier
- `grill-me`: model-invoked interview owner with a shared procedure for latent consequential decisions
- `receiving-code-review`: validate review feedback against repository truth
- `using-git-worktrees`: explicitly requested or necessary workspace isolation
- `finishing-a-development-branch`: verified branch integration choices
- `describe-pr`: reviewer-oriented summary from the final diff and evidence
- `writing-skills`: skill routing, descriptions, progressive disclosure, and evals

## Global operating contract

[AGENTS.md](AGENTS.md) defines the global contract rather than repository-specific workflow. Skills own workflows; `AGENTS.md` owns safety, permissions, honesty, scope, delegation, verification, and Git boundaries.

After changing it, sync it byte-for-byte to the user instruction source:

```text
~/.agents/AGENTS.md
```

Codex CLI discovers global instructions from `$CODEX_HOME/AGENTS.md`, normally
`~/.codex/AGENTS.md`. Keep that path as a symlink to `~/.agents/AGENTS.md` so
the repository file, the user source, and the Codex discovery path cannot drift.

## Custom agents

Installable profiles live in [agents](agents). Current Codex releases discover
these standalone files automatically. [agents/registry.toml](agents/registry.toml)
therefore contains shared agent settings only.

- `fast_reviewer`: fast mechanical evidence
- `reviewer`: standard contract and correctness review
- `oracle_reviewer`: subtle or high-consequence judgment
- `librarian`: version-aware documentation and current-source research
- `verifier`: fresh local command evidence after implementation

The main agent retains scope, approvals, write coordination, synthesis, and the completion claim. Each subagent receives a bounded brief and returns evidence for the main agent to judge.

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

## Skill installation

Install top-level folders from [skills](skills) into `~/.agents/skills/`. Sync the intended directories individually; replacing the global skill root could delete unrelated installed skills.

Install `grill-me` as a single skill. For post-inspection grilling, also sync the consumer skill directories that link to `grill-me/references/frontier.md`. They reuse the procedure directly, so they do not need nested invocation or another grilling router.

If another installed skill supplies an overlapping umbrella workflow, disable it with an exact `[[skills.config]]` path entry in `~/.codex/config.toml`. Restart Codex after changing discovery configuration.

## Evals

The local suite checks the skill inventory and behavior contract:

- exact top-level skill inventory
- quoted, trigger-focused descriptions no longer than 240 characters
- required entrypoint sections and a 120-line `SKILL.md` budget
- valid local links and one-level pressure references
- invocation metadata plus implicit and exact `$skill` routing
- one primary skill, exact modifiers, and exact disclosed references
- representative routine, pressure, debugging, testing, review, improve, domain, and handoff routes
- the adaptive review delegation contract
- guarded optional GPT-5.6 SOL `xhigh` live classification

Run:

```bash
bash skills/evals/check-skill-surface.sh
bun test skills/evals/run-routing-evals.test.ts
bun skills/evals/run-routing-evals.ts dry-run
```

Live model evaluation remains opt-in. It requires an explicit case or `--all` together with `--allow-live`; [skills/evals/README.md](skills/evals/README.md) documents the guarded runner.

## Prompt design basis

- Start with outcomes, success evidence, important constraints, authority, and stop condition.
- Give the model freedom for routine choices; use strict ordered steps only where sequence protects correctness.
- Keep metadata trigger-focused, entrypoints small, and branch-specific material behind precise pointers.
- Add instructions only for observed failure modes and remove sentence-level no-ops.
- Evaluate task success and required evidence before tokens, latency, or cost.

Current agent-behavior authority:

- [OpenAI GPT-5.6 Sol prompting guidance](https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6)
- [OpenAI Multi-agent deployment guidance](https://developers.openai.com/api/docs/guides/deployment-checklist#use-multi-agent-for-parallel-work)
- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Codex `AGENTS.md`](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [OpenAI skills documentation](https://learn.chatgpt.com/docs/build-skills)
- [Matt Pocock's writing-great-skills reference](https://github.com/mattpocock/skills/tree/main/skills/productivity/writing-great-skills)

Use maintained vendor guidance as corroboration for context management, planning, delegation, and verification, not as an OpenAI platform contract:

- [Anthropic context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) and [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- [Cursor rules](https://cursor.com/docs/rules) and [Cursor subagents](https://cursor.com/docs/subagents)
- [Devin effective instructions](https://docs.devin.ai/essential-guidelines/instructing-devin-effectively)

Do not base current-agent behavior on stale benchmark results.

Canonical SWE sources own code design: module depth and information hiding, domain language and ownership, trusted boundaries and contracts, production tracer bullets, state/effect reasoning, compatibility, and behavior-focused proof. The routed reference that applies the idea names its source basis.

Comparative material such as Ousterhout's *A Philosophy of Software Design* versus *Clean Code* helps explain tradeoffs, but the primary works and the repository's explicit decision rules remain authoritative.

Practitioner material such as Sandi Metz's “The Wrong Abstraction,” Kent C. Dodds's AHA Programming, Dan Abramov's “Goodbye, Clean Code,” Carson Gross's Locality of Behaviour and *The Grug Brained Developer*, and Joel Spolsky's “Architecture Astronauts” is secondary reinforcement. It can explain a rule but does not create independent runtime doctrine.
