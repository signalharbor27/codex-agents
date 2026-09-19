---
name: using-git-worktrees
description: "Use when the user requests branch or workspace isolation, or current-workspace interference requires it; not merely because implementation has parallel subagents."
---

# Using Git worktrees

## Overview

Create a worktree only when isolation materially reduces interference or branch risk. Worktrees are optional setup, not a default precondition for implementation.

## When to Use

- Large features or refactors that should stay off the current workspace
- Work that needs a clean branch or separate dependency state
- Parallel efforts that would otherwise interfere with the current directory

## When Not to Use

- Tiny edits or single-file changes that do not benefit from isolation
- Repositories where the current workspace is already the correct branch and state
- Parallelizable work whose write scopes can remain isolated without changing branch state

## Minimal Workflow

1. Inspect the current branch, worktrees, dirty state, and untracked work. Use isolation when it solves a current interference or branch-state problem; otherwise stay in the existing workspace.
2. Prefer a repo-provided worktree or bootstrap script when one exists.
3. Prefer an existing `.worktrees/` or `worktrees/` directory when present.
4. Verify project-local worktree directories are ignored before using them. Prefer an external directory if this would otherwise require unrelated repository changes.
5. Infer routine branch, path, and setup choices from repo conventions. An authorized task permits needed, reversible creation of a new isolated branch and worktree. Preserve existing branches, worktrees, dirty files, and untracked work; do not switch, reset, clean, or overwrite them without authority. Ask only for material scope, architecture, cost, or external effects, or destructive changes without prior authorization.
6. Create the worktree, run setup within the task's authority, and report the branch and location. Do not commit or publish setup changes without authorization.
7. Verify the relevant baseline before handing off. If it fails, report the exact check and any evidence of a pre-existing failure. Do not claim the source workspace also fails unless verified.

## Reference Routing

- Use `engineering` as the next primary skill once the isolated workspace is ready and the real task becomes implementation.
- Use `finishing-a-development-branch` when the isolated branch is complete and needs an integration decision.

## Failure modes

- Treating worktrees as mandatory for trivial work
- Ignoring a repo bootstrap script and recreating setup by hand
- Overwriting existing work or committing setup changes without authority
- Using broken path expansion or stale runtime-specific paths
