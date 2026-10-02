# Codex agents and skills

Q's global instructions, skills, and agent profiles for Codex and Claude Code. In Codex, the main chat uses GPT-6.1 Sol at `xhigh`; each custom agent sets its own model and reasoning effort.

## Install

Install the skills from this repository:

```bash
npx skills add https://github.com/signalharbor27/codex-agents.git \
  --global --agent codex --skill engineering debugging test-design \
  review-and-simplify-changes receiving-code-review improve-codebase-architecture \
  improve-test-suite using-git-worktrees finishing-a-development-branch \
  describe-pr grill-me effect-ts writing-rust designing-data-intensive-systems \
  writing-skills project-verification codebase-investigation retro --copy --yes
```

The installer copies skills. After updates, reinstall the selected skills and compare them with the source. Keep sibling skills together when their references depend on one another. The evaluation harness stays in this repository.

### Global instructions

The global instructions cover scope, permissions, delegation, verification, and Git rules. Project instructions supply local commands and conventions.

Edit [instructions/global.md](instructions/global.md) and [instructions/response-style.md](instructions/response-style.md), then run `bun scripts/generate-hosts.ts`. It writes `AGENTS.md` for Codex and the Claude Code files under `claude/`. Lines that differ between hosts sit in `<!-- host:codex -->` and `<!-- host:claude -->` blocks next to the rule they belong to. Do not edit the generated files directly; `--check` fails when they drift from the source.

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

Start a new task after installation. Check both the exposed roles and an actual agent launch.

### Q's host notes

These describe Q's machine; the instructions and skills stay host-neutral.

- The custom provider also uses `model_catalog_url` and `features.api_key_model_discovery` in global config to discover available models. Those settings are local to the provider setup. Codex labels API-key discovery as under development.
- Worktrunk's `~/.config/worktrunk/config.toml` sets `worktree-path` to `/srv/data/workspaces/{{ repo }}/{{ branch | sanitize }}`. Shell integration lives in `.zshrc` and `.bashrc`.
- The primary disk is ext4 and `/srv/data` is XFS, so a copy from primary to the data disk uses full storage. TweetStream's locked `lewissmith/worktrunk-deps` worktree on XFS supplies dependencies to new XFS workspaces, and primary supplies the env files. User-config project hooks reconcile dependencies and generate the Prisma client in the destination.

## Agents

- `implementer`: `gpt-6.1-sol` / `high`, implementation slices with agreed contracts and acceptance criteria.
- `explorer`: `gpt-6.1-sol` / `medium`, repository structure, callers, and existing tests.
- `librarian`: `gpt-6.1-sol` / `medium`, external documentation and public code.
- `verifier`: `gpt-6.1-sol` / `high`, running checks and reporting command evidence.
- `reviewer`: `gpt-6.1-sol` / `xhigh`, independent correctness and simplification review.
- `oracle`: `gpt-6-astra` / `xhigh`, explicit user requests or concrete blockers that remain after investigation or ordinary review.
- `fast_reviewer`: `gpt-6.1-sol` / `low`, bounded checks for unused code, dependency cycles, stale comments, and stubs.
- `refiner`: `gpt-6.1-sol` / `high`, applies clear Standards fixes reported by independent review, in its own context; a different reviewer delta-reviews its edits.

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
- `retro` (user-invoked only): turns agent sessions and PR reviews into ranked environment fixes (checks, standards, pointers, access, pruning).

Start with the relevant entrypoint, such as [engineering/SKILL.md](skills/engineering/SKILL.md). It links to detailed guidance for the task. Substantial engineering starts with a working path through the system, then continues through the remaining vertical slices.

### Review before completion

Every implementation handoff or intended commit requires independent subagent review through `review-and-simplify-changes`, including small changes. Reviewers apply the review-only [coding standards](skills/review-and-simplify-changes/references/coding-standards.md) (module design, test lies, comments); a repo-root `CODING_STANDARDS.md` extends or overrides them, and implementer briefs leave them out. The review lane scales reviewers to the diff's risk. Default and separable lanes run `codex review` on the first full pass; research or prototype work and mechanical deltas skip it. One-way doors (the triggers in [merge-danger.md](skills/describe-pr/references/merge-danger.md)) and hot paths add `oracle`. Reviewers classify Merge danger independently; the more severe value of each wins (one-way over two-way; localized < service < customers < data) and goes into the review record. Clear Standards fixes go to `refiner`, and judgement calls stay with the main agent. Standards cover every file the diff touches, so clear pre-existing debt there is fixed in the same pass and larger debt is listed under `## Audit items` in the PR body for the weekly `retro`. A diff that adds a subsystem or changes more than about 500 source lines also gets `improve-codebase-architecture` and `improve-test-suite` reviewers scoped to the touched subsystems.

`describe-pr` ends every PR body with a Merge danger footer (`Door: one-way|two-way`, `Blast radius: localized|service|customers|data`). Agents merge without asking only under a standing grant from Q that names the repo (project instructions or a memory entry quoting Q), when the footer and the review record both say two-way and localized, and checks and reviews pass on the current head. Everything else, including every one-way door, goes to Q. When Q says the work is merged, `skills/finishing-a-development-branch/scripts/cleanup-merged.sh [--dry-run] <branch>` removes the agent-owned worktree, deletes the branch and its stale remote ref, and fast-forwards a clean main checkout. It needs `wt` and `jq`, runs only hooks with persisted Worktrunk approvals, and refuses dirty, untracked, unmerged, or host-owned workspaces (any worktree other than the one `wt list` reports at the branch's template path). A branch with no worktree is deleted only after the merge proof.

Review the full intended diff first. After fixes, review the changed portions and affected contracts, retaining earlier evidence where it still applies. Check the integrated result before declaring completion. The main agent coordinates this loop; its own review cannot satisfy the independent-review requirement.

## Claude Code

Claude Code runs from the same checkout. From the main checkout (install refuses to run from a linked worktree), run:

```bash
bun scripts/generate-hosts.ts --install
```

This links `~/.claude/CLAUDE.md`, `~/.claude/agents`, the `Q` output style, and each non-test `claude/hooks/*.ts` file to `claude/`, and links Codex's built-in `review-agent` skill into `~/.claude/skills`. It also writes each key of [claude/settings.fragment.json](claude/settings.fragment.json) into `~/.claude/settings.json`, replacing that key's installed value and listing the permission rules and hooks it removes. Keys the fragment doesn't name, including `env`, stay as they are, so tokens stay out of the repository. Replaced files go to `~/.claude/backups/`.

The generator writes `AGENTS.md`, `claude/CLAUDE.md`, `claude/agents/*.md`, and `claude/output-styles/q.md`. Everything else under `claude/` is source.

[claude/roles.ts](claude/roles.ts) sets each Claude agent's model, effort, tools, and preloaded skills. The `Q` output style puts the reply rules from `instructions/response-style.md` into Claude's system prompt. Hooks:

- [reply-guard](claude/hooks/reply-guard.ts) stops a reply that ends by offering to continue, and reminds Claude of the word budget after a long reply.
- [review-gate](claude/hooks/review-gate.ts) denies `gh pr ready`, non-draft `gh pr create`/`gh pr new`, non-draft `gh api` PR creation, and the GraphQL ready-for-review mutation until three things hold: a review record for the current commit's tree has no open findings, the reviewed commit is pushed when the branch has an upstream, and the command names the current branch or its PR. Commit the reviewed snapshot unchanged, then write the record from the reviewed checkout with `review-and-simplify-changes/scripts/record-review.sh <base-ref> --reviewed <rev> --reviewers <role,...> --open-findings <n> [--door … --blast-radius …] [--copy-humanized]`, where `<rev>` is that commit's full commit or tree sha (40 or 64 hex; refs and short shas are rejected); records live in `<git-common-dir>/agent-review/`. Draft PRs pass; `AGENT_REVIEW_GATE=off` in Claude's environment disables it.
- [destructive-guard](claude/hooks/destructive-guard.ts) blocks Redis FLUSHALL/FLUSHDB everywhere; access-control writes to any non-local host; SQL DROP DATABASE/DROP SCHEMA/TRUNCATE and `dropdb` outside a scratch container; and `rm -r` except of paths strictly inside a scratch container, a git work tree, or a temp directory. An access-control write is a curl, HTTPie, xh, wget, or `gh api` request that PUTs, PATCHes, or DELETEs a `permissions`, `roles`, `collaborators`, `acl`/`acls`, or `branches/<b>/protection` path, POSTs to a path ending in `/roles`, `/permissions`, or `/collaborators`, or PATCHes or PUTs an inline body setting `permission_overwrites`, or `roles` or `permissions` on a member or user. GitHub file contents and git refs are exempt. localhost, 127.0.0.0/8, 0.0.0.0, ::1, `*.localhost`, and bare paths count as local unless the command runs over ssh; a host hidden in a `$VAR` does not. A `docker exec` or `podman exec` target is a scratch container when the same command starts it with a label key ending in `.worktree` (follow the project's convention, e.g. `<project>.worktree=<path>`), or its `docker inspect` labels include such a key; `docker compose exec` always counts as non-local. Start Claude Code with `AGENT_DESTRUCTIVE_OK=1` to allow them deliberately.

`--install` refuses a fragment hook that has no source file.

`bun scripts/generate-hosts.ts --check-installed` reports broken links, settings drift, and installed skill copies that differ from `skills/`.

## Workspaces

Agent-created workspaces use Worktrunk. Reuse existing isolated task directories. Worktrees created by a host or app (Codex app, Claude Code, T3 Code) keep their creator's cleanup lifecycle; run setup in them explicitly when the app does not.

See [using-git-worktrees](skills/using-git-worktrees/SKILL.md) and the [remote setup guide](skills/using-git-worktrees/references/worktrunk.md) for environment copying, dependencies, and host configuration. Q's values are in [Q's host notes](#qs-host-notes).

```bash
wt list
wt switch --create lewissmith/my-task --base origin/main
# For authorized cleanup, from a retained workspace:
wt remove lewissmith/my-task --no-delete-branch --foreground
```

## Checks

Enable the pre-commit check once per clone with `git config core.hooksPath .githooks`; it runs the generator `--check` and the skill surface check. It deliberately omits `--check-installed`, which reads host state and fails in linked worktrees.

The local suite validates skill metadata, references, agent profiles, and evaluation fixtures. Dry runs prepare routing cases without model calls.

```bash
bash skills/evals/check-skill-surface.sh
bash skills/evals/check-skill-surface.sh --installed   # also checks the live install
bun test skills/evals scripts claude
bun skills/evals/run-routing-evals.ts dry-run
```

Live evaluations require `--allow-live` and an explicit case or `--all`. Their default is GPT-6 Astra at `high`, separate from the main chat setting; `--harness claude` runs routing cases through Claude Code, and `run-standards-evals.ts` checks that review flags planted standards violations. Routing evaluations test skill selection; execution evaluations inspect edits and tool activity. Neither static checks nor a successful agent launch establishes code quality. See [the eval README](skills/evals/README.md) for live commands, comparisons, and limits.

## Optional skill and sources

The external `bro` skill restates the last response plainly:

```bash
npx skills add https://github.com/cursor/plugins --global --agent codex --skill bro --copy --yes
```

The verification and investigation skills, plus selected engineering references, draw on [pstack](https://github.com/cursor/plugins/tree/6ed0f7a9504f577d7529064103cecce9be7dfc5e/pstack/skills). They are adapted for Codex. Engineering references name the software-design sources behind their guidance.

Prompt and skill guidance:

- [OpenAI GPT-6 guidance](https://developers.openai.com/api/docs/guides/latest-model)
- [Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)
- [OpenAI Multi-agent deployment guidance](https://developers.openai.com/api/docs/guides/deployment-checklist#use-multi-agent-for-parallel-work)
- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Codex `AGENTS.md`](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [OpenAI skills documentation](https://learn.chatgpt.com/docs/build-skills)
- [Matt Pocock's writing-great-skills reference](https://github.com/mattpocock/skills/tree/main/skills/productivity/writing-great-skills)

Other workflow references include [Anthropic context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), [Claude Code best practices](https://code.claude.com/docs/en/best-practices), [Cursor rules](https://cursor.com/docs/rules), [Cursor subagents](https://cursor.com/docs/subagents), and [Devin effective instructions](https://docs.devin.ai/essential-guidelines/instructing-devin-effectively).
