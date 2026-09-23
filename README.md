# Codex skills

Q's global Codex instructions, engineering skills, and custom agents. Evaluation default: GPT-6 Astra at `high`. The main chat default is Astra at `medium`. The main setting is configured per installation or task; custom agents set their own models and reasoning efforts.

Select a primary skill when its invocation conditions match the task; proceed without one when none applies. Descriptions state when to invoke a skill. Bodies contain workflow and output requirements. Add domain guidance or references only when the task needs them.

## Engineering flow

- `engineering` owns understood features, bug fixes, refactors, plans, and research from inspection through verified completion.
- `debugging` owns unexplained failures: reproduce the failure, prove its root cause, then make the smallest authorized fix and verify it.
- `test-design` owns work where tests are the main task, including explicit TDD, proof-layer selection, doubles, assertions, and focused coverage.
- `project-verification` owns creating, repairing or auditing project verification runbooks and feature maps. Commands and application details stay in the consuming project; existing checks still run through the verifier role.
- `codebase-investigation` owns standalone questions about current behavior or historical rationale. Engineering retains research needed for its implementation task.

Review, audit, branch, handoff, and skill-authoring tasks use their narrower skill as primary. Rust, Effect, and data-intensive-system skills are modifiers. They add domain constraints without repeating the generic producer workflow.

A primary skill owns its whole loop, including the mandatory `review-and-simplify-changes` gate before implementation handoff or an intended commit. The main agent retains integration and completion ownership. Load other workflow skills only when their distinct task applies.

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

- `review-and-simplify-changes` reviews the full intended diff, then loops over fixes and affected contracts until actionable findings are resolved and required checks pass. Follow-up passes use recorded review snapshots; new evidence can reopen earlier scope. Integrated slices need combined coverage. Reviewer count follows the material work; the eight topics are a coverage checklist.
- Every review pass uses independent subagents, including small changes and follow-up fixes. The main agent maps material checks to review tracks and dispatches independent tracks in parallel: `oracle` instances inspect correctness, Standards, Intent, simplification, and integration; `fast_reviewer` supplies bounded mechanical evidence; `verifier` runs checks. Defect reviewers use the host's `review-agent` skill when available, or an equivalent scoped read-only brief. The main agent collects results, judges findings, and coordinates fixes; its own inspection cannot replace delegated coverage.
- `improve-codebase-architecture` and `improve-test-suite` produce evidence-backed plans, with phases and decisions only when the findings need them.

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

[AGENTS.md](AGENTS.md) defines permissions, scope, delegation, verification, and Git boundaries across projects. Skills own their task workflows; project guidance supplies local commands and conventions.

Codex discovers global instructions from `$CODEX_HOME/AGENTS.md`, normally
`~/.codex/AGENTS.md`. Q's `~/.codex/AGENTS.md` links to `~/.agents/AGENTS.md`,
which links to this repository's `AGENTS.md`. Edits here therefore update the
global source immediately. Verify the links before editing; on another machine,
sync the approved file and compare bytes. Start a new Codex task to load updates.

Global defaults allow routine local choices, necessary files and dependencies,
and safe workspace isolation within authorized work. Initial inspection can
precede skill selection. Substantial engineering starts with a production-shaped
tracer bullet and continues through the remaining slices. Earlier proof remains
usable after confirming its inputs are unchanged. Destructive operations,
publication, deployment, and shared-state changes retain explicit authorization
boundaries. Responses stay concise without dropping required evidence.

## Custom agents

Installable profiles live in [agents](agents). Current Codex releases discover
these standalone files automatically. [agent-settings.toml](agent-settings.toml)
therefore contains shared agent settings only.

- `implementer`: `gpt-6-sol` / `xhigh`, agreed implementation slices
- `explorer`: `gpt-6-sol` / `low`, codebase facts and tracing
- `fast_reviewer`: `gpt-6-luna` / `max`, mechanical evidence
- `oracle`: `gpt-6-astra` / `xhigh`, independent review, consequential design advice, stalled debugging, or unresolved correctness disputes
- `librarian`: `gpt-6-sol` / `low`, external documentation and research
- `verifier`: `gpt-6-sol` / `high`, command verification

The main agent retains scope, approvals, write coordination, synthesis, and the completion claim. Each subagent receives a bounded brief and returns evidence for the main agent to judge.

The main chat default is Astra / `medium`.
Profiles pin both model and effort, so changing the chat setting does not change
their assignments. The custom `explorer` replaces the built-in role of that name.
Use `implementer` with explicit `fork_turns="none"` and a self-contained slice
brief. Full-history forks inherit the parent role in hosts that expose this
option; they do not reliably select a custom profile. For harder implementation,
the Astra parent can take over. Generic agents inherit the parent settings;
use a named profile for the assignments above. No documented config setting
enforces fork mode. See
[Codex subagent settings](https://learn.chatgpt.com/docs/agent-configuration/subagents#custom-agents).

The review skill assigns every material check to an independent reviewer.
Small coupled changes can share one Oracle; separable checks use parallel
tracks. Follow-up passes delegate fixes and affected contracts while preserving
valid earlier coverage. Unavailable subagents leave review blocked. Oracle can
also advise on design or debugging; those assignments do not load the
defect-review skill.

Link the global agent directory to this checkout's `agents` directory.
Codex 0.154.0 discovers individual file symlinks but refuses to load them when
spawning an agent. A directory symlink leaves each profile as a regular file.
Repository edits then apply when a new task loads the profiles. Explicit profile
settings override the parent model and effort.

From the repository root, check for unrelated profiles and preserve the old directory:

```bash
codex_repo_root="$(pwd -P)"
codex_profile_root="${CODEX_HOME:-$HOME/.codex}"
install -d "$codex_profile_root" || exit 1
for profile in "$codex_profile_root/agents/"* "$codex_profile_root/agents/".[!.]* "$codex_profile_root/agents/"..?*; do
  if [ -e "$profile" ] || [ -L "$profile" ]; then
    cmp -s "$profile" "$codex_repo_root/agents/${profile##*/}" || {
      echo "Existing profiles differ; preserve them and use regular copies for the selected roles."
      exit 1
    }
  fi
done
codex_profile_backup="$(mktemp -d "$codex_profile_root/agent-backup.XXXXXX")" || exit 1
if [ -e "$codex_profile_root/agents" ] || [ -L "$codex_profile_root/agents" ]; then
  mv "$codex_profile_root/agents" "$codex_profile_backup/agents" || exit 1
fi
ln -s "$codex_repo_root/agents" "$codex_profile_root/agents" || exit 1
test "$(readlink "$codex_profile_root/agents")" = "$codex_repo_root/agents" || exit 1
```

Start a new Codex task after installation and verify the exposed role settings.

Merge only the shared settings from [agent-settings.toml](agent-settings.toml)
into the existing `$CODEX_HOME/config.toml`; do not append a second `[agents]`
table. Do not add redundant `[agents.<role>]` registrations for profiles already
installed under `$CODEX_HOME/agents/`. Keep `agent-settings.toml` outside that directory;
it is a shared-settings fragment, not an agent profile.

## Skill installation

Install from this Git repository with the `skills` CLI. Its installation command
is `add`; select the intended skill folders and preserve unrelated installed skills.

```bash
npx skills add https://github.com/signalharbor27/codex-agents.git \
  --global --agent codex --skill engineering debugging test-design \
  review-and-simplify-changes receiving-code-review improve-codebase-architecture \
  improve-test-suite using-git-worktrees finishing-a-development-branch \
  describe-pr grill-me effect-ts writing-rust designing-data-intensive-systems \
  writing-skills project-verification codebase-investigation --copy --yes
```

Compare installed files with the published source and check bundled and
sibling-skill references. The repository's eval harness stays in the repository.

Install `grill-me` as a single skill. For post-inspection grilling, also sync the consumer skill directories that link to `grill-me/references/frontier.md`. They reuse the procedure directly, so they do not need nested invocation or another grilling router.

If another installed skill supplies an overlapping umbrella workflow, disable it with an exact `[[skills.config]]` path entry in `~/.codex/config.toml`. Restart Codex after changing discovery configuration.

The optional `bro` shortcut restates the last response plainly. Install it separately:

```bash
npx skills add https://github.com/cursor/plugins --global --agent codex --skill bro --copy --yes
```

The project-verification and investigation skills, and selected engineering references, draw on [pstack](https://github.com/cursor/plugins/tree/6ed0f7a9504f577d7529064103cecce9be7dfc5e/pstack/skills). Their guidance targets Codex and preserves this repository's authority, delegation and verification rules.

## Evals

The local suite checks the skill inventory and behavior contract:

- exact top-level skill inventory
- quoted, trigger-focused descriptions no longer than 240 characters
- bounded entrypoints, valid metadata, and resolvable references
- valid local links and one-level pressure references
- invocation metadata plus implicit and exact `$skill` routing
- an applicable primary skill or no skill, expected modifiers, and relevant references
- representative routine, pressure, debugging, testing, review, improve, domain, and handoff routes
- the adaptive review delegation contract
- guarded live routing classification, defaulting to GPT-6 Astra / `high`
- isolated execution cases for authorization, complete approval drafts, read-only limits, proof reuse and rechecks, project-native commands, unrelated changes, and continuation

Run:

```bash
bash skills/evals/check-skill-surface.sh
bun test skills/evals
bun skills/evals/run-routing-evals.ts dry-run
```

Live evaluation requires `--allow-live` and an explicit case or `--all`. Compare
baseline and candidate instructions through the same runner and fixtures. Model,
effort, hashes, timings, and available usage/tool evidence identify each run.
Full source-catalog routing and synthetic crowded or truncated catalogs measure different
conditions. Routing classification checks selection; execution cases inspect
artifacts and tool activity. Scripted continuation does not prove mid-turn
steering. Static checks do not establish model improvement. See [the eval README](skills/evals/README.md)
for commands and limits.

## Prompt design basis

- Start with outcomes, success evidence, important constraints, authority, and stop condition.
- Give the model freedom for routine choices; use strict ordered steps only where sequence protects correctness.
- Keep metadata trigger-focused, entrypoints small, and branch-specific material behind precise pointers.
- Add instructions only for observed failure modes and remove sentence-level no-ops.
- Evaluate task success and required evidence before tokens, latency, or cost.

Current agent-behavior authority:

- [OpenAI GPT-6 Astra guidance](https://developers.openai.com/api/docs/guides/latest-model)
- [Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)
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
