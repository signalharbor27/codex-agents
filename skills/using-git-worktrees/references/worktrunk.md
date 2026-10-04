# Worktrunk setup and remote use

Use the released Worktrunk CLI, not a custom workspace manager. Check `wt --version`, `git --version`, and `wt config show`; v0.78 requires Git 2.43 or newer. Installation or machine-wide changes need task authority. Follow the official [configuration](https://worktrunk.dev/config/) and [copy-ignored](https://worktrunk.dev/step/#wt-step-copy-ignored) documentation for the installed release.

## Host configuration

User config lives in `~/.config/worktrunk/config.toml`; its `worktree-path` template decides where new worktrees land, and shell integration lives in the shell's rc files. Hosts differ, so read `wt config show` on the current host before relying on a path.

The blocking user hook `wt step copy-ignored --require-include` copies only ignored files selected by the source worktree's `.worktreeinclude`. Source defaults to primary; the new branch need not contain the allowlist. Without an allowlist, copying is a no-op. Existing destination files are retained; use explicit reviewed refreshes when required.

Allowlist exact development env and dependency paths. Omit runtime state, test evidence, `.next`, and path-sensitive virtual environments. Never blindly copy all ignored files. Symlinks are copied verbatim: inspect relative targets and avoid an absolute/shared `node_modules` symlink when generated state must be isolated. Recreate Python environments with `uv sync`.

Reflinks require source and destination on the same filesystem, and that filesystem must support them (XFS or Btrfs do; ext4 does not). When `worktree-path` sits on a different filesystem from the primary checkout, every copy from primary uses full storage. A locked donor worktree on the workspace filesystem can then supply dependencies to new workspaces while primary supplies the env files, with user-config project hooks reconciling dependencies and generated code in the destination. Keep the donor locked; refresh it only while unused and reverify its dependency install. A donor is a warm cache, not authority for a task's lockfile.

Existing worktrees require no import into Worktrunk. Leave in-progress paths unchanged while agents or saved tasks depend on them. `wt list` sees them regardless of their original creation tool.

## Codex integration

The official Worktrunk Codex plugin provides guidance and activity markers (`wt config plugins codex install`). It does not make the app create worktrees through Worktrunk. Start a fresh Codex task to load new skills/plugin settings.

For CLI work, create the workspace with Worktrunk and launch Codex there. For a remote app task already in a suitable workspace, reuse it. Before using an existing app-created tree, run its supported setup, or run `wt hook pre-start` there (preview with `--dry-run`).

The app's worktree location is controlled by its Settings → Worktrees UI; official docs do not expose a verified remote-only CLI root setting. `.worktreeinclude` automatic app copying is documented for local app worktrees, not remote ones. Do not invent config keys, relocate all of `CODEX_HOME`, or edit session databases to redirect app worktrees.

References: [OpenAI worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees), [local environments](https://learn.chatgpt.com/docs/environments/local-environment), [remote connections](https://learn.chatgpt.com/docs/remote-connections).

## T3 Code integration

T3 creates a worktree when a thread is launched with `t3_thread_launch` and `workspaceStrategy: {type: "worktree", ...}`, or moved with `t3_worktree_handoff`. Neither goes through Worktrunk, so no `wt` hook runs; T3 owns the workspace and its removal, and `wt list` still shows it.

Run the configured Worktrunk creation hooks on that existing worktree with `wt -C <path> hook pre-start`, then `wt -C <path> hook post-start --foreground` so background setup finishes before you rely on it. Preview each with `--dry-run` and list hooks with `wt -C <path> hook show`. Unapproved project hooks stop a noninteractive run; handle them as in the skill's step 4 before adding `--yes`.

For every new T3 worktree, a T3 project script with `runOnWorktreeCreate: true` can run those commands (or the repo's bootstrap) automatically; `t3_worktree_handoff` runs it unless `runSetupScript` is false. Project scripts are shared settings: change them with `t3_project_update` only with authority.
