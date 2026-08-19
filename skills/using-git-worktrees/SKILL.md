---
name: using-git-worktrees
description: "Create an isolated git worktree. Use when the user requests branch/workspace isolation or current-workspace interference makes it necessary. Not merely because implementation has parallel subagents."
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

1. Confirm that isolation solves a current workspace or branch-state problem. Otherwise, stay in the existing workspace.
2. Prefer a repo-provided worktree or bootstrap script when one exists.
3. Prefer an existing `.worktrees/` or `worktrees/` directory when present.
4. Verify project-local worktree directories are ignored before using them.
5. Infer routine branch, path, and setup choices from repo conventions; ask only when missing, destructive, shared-state, or scope-changing.
6. Create the worktree, run its required setup, and report the branch and location.
7. Verify the baseline before handing off. If it fails, report the exact failing check and whether the failure also exists in the source workspace.

## Reference Routing

- Use `engineering` as the next primary skill once the isolated workspace is ready and the real task becomes implementation.
- Use `finishing-a-development-branch` when the isolated branch is complete and needs an integration decision.

## Failure modes

- Treating worktrees as mandatory for trivial work
- Ignoring a repo bootstrap script and recreating setup by hand
- Editing ignore files or committing setup changes without consent
- Using broken path expansion or stale runtime-specific paths
