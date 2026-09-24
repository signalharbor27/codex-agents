# Worktrunk setup and remote use

Use the released Worktrunk CLI, not a custom workspace manager. Check `wt --version`, `git --version`, and `wt config show`; v0.78 requires Git 2.43 or newer. Installation or machine-wide changes need task authority. Follow the official [configuration](https://worktrunk.dev/config/) and [copy-ignored](https://worktrunk.dev/step/#wt-step-copy-ignored) documentation for the installed release.

## VPS configuration

This VPS uses `~/.config/worktrunk/config.toml` and `/srv/data/workspaces/{{ repo }}/{{ branch | sanitize }}`. Shell integration lives in `.zshrc` and `.bashrc`. On another host, inspect its configuration rather than assuming these paths exist.

The blocking user hook `wt step copy-ignored --require-include` copies only ignored files selected by the source worktree's `.worktreeinclude`. Source defaults to primary; the new branch need not contain the allowlist. Without an allowlist, copying is a no-op. Existing destination files are retained; use explicit reviewed refreshes when required.

Allowlist exact development env and dependency paths. Omit runtime state, test evidence, `.next`, and path-sensitive virtual environments. Never blindly copy all ignored files. Symlinks are copied verbatim: inspect relative targets and avoid an absolute/shared `node_modules` symlink when generated state must be isolated. Recreate Python environments with `uv sync`.

Reflinks require source and destination on the same supporting filesystem. This VPS's primary disk is ext4; `/srv/data` is XFS. A copy from primary to data disk uses full storage. TweetStream's locked `lewissmith/worktrunk-deps` worktree on XFS supplies dependencies to new XFS workspaces; primary supplies the env files. User-config project hooks reconcile dependencies and generate the Prisma client in the destination. Keep the donor locked; refresh it only while unused and reverify its dependency install. A donor is a warm cache, not authority for a task's lockfile.

Existing worktrees require no import into Worktrunk. Leave in-progress paths unchanged while agents or saved tasks depend on them. `wt list` sees them regardless of their original creation tool.

## Codex integration

The official Worktrunk Codex plugin provides guidance and activity markers (`wt config plugins codex install`). It does not make the app create worktrees through Worktrunk. Start a fresh Codex task to load new skills/plugin settings.

For CLI work, create the workspace with Worktrunk and launch Codex there. For a remote app task already in a suitable workspace, reuse it. Before using an existing app-created tree, run its supported setup, or run `wt hook pre-start` there (preview with `--dry-run`).

The app's worktree location is controlled by its Settings → Worktrees UI; official docs do not expose a verified remote-only CLI root setting. `.worktreeinclude` automatic app copying is documented for local app worktrees, not remote ones. Do not invent config keys, relocate all of `CODEX_HOME`, or edit session databases to redirect app worktrees.

References: [OpenAI worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees), [local environments](https://learn.chatgpt.com/docs/environments/local-environment), [remote connections](https://learn.chatgpt.com/docs/remote-connections).
