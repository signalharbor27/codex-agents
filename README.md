# Codex agents and skills

Q's global Codex instructions, skills, and agent profiles. The main chat uses GPT-6 Astra at `medium`; each custom agent sets its own model and reasoning effort.

## Install

Install the skills from this repository:

```bash
npx skills add https://github.com/signalharbor27/codex-agents.git \
  --global --agent codex --skill engineering debugging test-design \
  review-and-simplify-changes receiving-code-review improve-codebase-architecture \
  improve-test-suite using-git-worktrees finishing-a-development-branch \
  describe-pr grill-me effect-ts writing-rust designing-data-intensive-systems \
  writing-skills project-verification codebase-investigation --copy --yes
```

The installer copies skills. After updates, reinstall the selected skills and compare them with the source. Keep sibling skills together when their references depend on one another. The evaluation harness stays in this repository.

### Global instructions

[AGENTS.md](AGENTS.md) defines scope, permissions, delegation, verification, and Git rules. Project instructions supply local commands and conventions.

Codex reads `$CODEX_HOME/AGENTS.md`, normally `~/.codex/AGENTS.md`. On Q's installation, that file links through `~/.agents/AGENTS.md` to this repository's `AGENTS.md`. Check the links on another machine before editing. Start a new task to load changed instructions.

### Agent profiles

[agents](agents) contains the profiles. Link the global agent directory to this checkout so profile edits apply when new tasks load them. Preserve existing profiles before replacing that directory.

Run from the repository root:

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

Merge [agent-settings.toml](agent-settings.toml) into the existing `$CODEX_HOME/config.toml`. It sets the shared agent depth. Keep a single `[agents]` table and leave this settings fragment outside `$CODEX_HOME/agents/`; the profiles need no separate registrations.

On this host, the custom provider also uses `model_catalog_url` and `features.api_key_model_discovery` in global config to discover available models. Those settings are local to the provider setup. Codex labels API-key discovery as under development.

Start a new task after installation. Check both the exposed roles and an actual agent launch.

## Agents

- `implementer`: `gpt-6-sol` / `xhigh`, implementation slices with agreed contracts and acceptance criteria.
- `explorer`: `gpt-6-sol` / `low`, repository structure, callers, and existing tests.
- `librarian`: `gpt-6-sol` / `low`, external documentation and public code.
- `verifier`: `gpt-6-sol` / `high`, running checks and reporting command evidence.
- `oracle`: `gpt-6-astra` / `xhigh`, independent review, consequential design decisions, and unresolved technical questions.
- `fast_reviewer`: `gpt-6-luna` / `max`, bounded checks for unused code, dependency cycles, stale comments, and stubs.

Use custom roles with explicit `fork_turns="none"` and a brief containing the goal, file ownership, contracts, acceptance criteria, and required evidence. Full-history forks inherit the parent role in hosts that expose that option. Generic agents inherit parent settings. See [Codex subagent settings](https://learn.chatgpt.com/docs/agent-configuration/subagents#custom-agents).

The main agent owns scope, approvals, integration, and the final completion claim. It assigns independent implementation slices in parallel and checks the combined result.

## Choosing skills

Skills load when their invocation conditions match the task. They can also be requested by name. Descriptions say when to invoke them; each `SKILL.md` contains the workflow.

- `engineering`: understood changes, implementation plans, and supporting research.
- `debugging`: unexplained failures, from reproduction through a verified fix.
- `test-design`: test strategy, assertions, doubles, coverage, and explicit TDD.
- `project-verification`: a project's repeatable verification runbook and feature map.
- `codebase-investigation`: questions about how a codebase works or why a design was chosen.
- `grill-me`: interviews and coupled decisions that need the user's judgment.
- `review-and-simplify-changes`: reviewing a diff and subsequent fixes.
- `receiving-code-review`: checking incoming review feedback against the code.
- `improve-codebase-architecture` and `improve-test-suite`: audits and improvement plans.
- `designing-data-intensive-systems`, `writing-rust`, and `effect-ts`: guidance for those domains.
- `using-git-worktrees` and `finishing-a-development-branch`: workspace isolation and requested branch integration or cleanup.
- `describe-pr`: PR descriptions based on the final diff and verification.
- `writing-skills`: skill descriptions, instructions, references, and evaluations.

Start with the relevant entrypoint, such as [engineering/SKILL.md](skills/engineering/SKILL.md). It links to detailed guidance for the task. Substantial engineering starts with a working path through the system, then continues through the remaining vertical slices.

### Review before completion

Every implementation handoff or intended commit requires independent subagent review through `review-and-simplify-changes`, including small changes. Oracle reviews correctness and simplification; other roles provide focused evidence as needed. Defect reviewers use the host's `review-agent` skill when available.

Review the full intended diff first. After fixes, review the changed portions and affected contracts, retaining earlier evidence where it still applies. Check the integrated result before declaring completion. The main agent coordinates this loop; its own review cannot satisfy the independent-review requirement.

## Workspaces

Agent-created workspaces use Worktrunk. Reuse existing isolated task directories. Codex app-created worktrees retain the app's setup and cleanup lifecycle.

See [using-git-worktrees](skills/using-git-worktrees/SKILL.md) and the [remote setup guide](skills/using-git-worktrees/references/worktrunk.md) for environment copying, dependencies, and this VPS's configuration.

```bash
wt list
wt switch --create lewissmith/my-task --base origin/main
# For authorized cleanup, from a retained workspace:
wt remove lewissmith/my-task --no-delete-branch --foreground
```

## Checks

The local suite validates skill metadata, references, agent profiles, and evaluation fixtures. Dry runs prepare routing cases without model calls.

```bash
bash skills/evals/check-skill-surface.sh
bun test skills/evals
bun skills/evals/run-routing-evals.ts dry-run
```

Live evaluations require `--allow-live` and an explicit case or `--all`. Their default is GPT-6 Astra at `high`, separate from the main chat setting. Routing evaluations test skill selection; execution evaluations inspect edits and tool activity. Neither static checks nor a successful agent launch establishes code quality. See [the eval README](skills/evals/README.md) for live commands, comparisons, and limits.

## Optional skill and sources

The external `bro` skill restates the last response plainly:

```bash
npx skills add https://github.com/cursor/plugins --global --agent codex --skill bro --copy --yes
```

The verification and investigation skills, plus selected engineering references, draw on [pstack](https://github.com/cursor/plugins/tree/6ed0f7a9504f577d7529064103cecce9be7dfc5e/pstack/skills). They are adapted for Codex. Engineering references name the software-design sources behind their guidance.

Prompt and skill guidance:

- [OpenAI GPT-6 Astra guidance](https://developers.openai.com/api/docs/guides/latest-model)
- [Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)
- [OpenAI Multi-agent deployment guidance](https://developers.openai.com/api/docs/guides/deployment-checklist#use-multi-agent-for-parallel-work)
- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Codex `AGENTS.md`](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [OpenAI skills documentation](https://learn.chatgpt.com/docs/build-skills)
- [Matt Pocock's writing-great-skills reference](https://github.com/mattpocock/skills/tree/main/skills/productivity/writing-great-skills)

Other workflow references include [Anthropic context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), [Claude Code best practices](https://code.claude.com/docs/en/best-practices), [Cursor rules](https://cursor.com/docs/rules), [Cursor subagents](https://cursor.com/docs/subagents), and [Devin effective instructions](https://docs.devin.ai/essential-guidelines/instructing-devin-effectively).
