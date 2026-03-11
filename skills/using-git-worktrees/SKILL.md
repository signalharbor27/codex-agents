---
name: using-git-worktrees
description: Create an isolated git worktree when the work is large enough or risky enough to justify a separate workspace. Use when branch isolation matters. Not for every small edit or as an automatic first step.
---

# Using Git Worktrees

## Overview

Use worktrees when isolation materially reduces risk.
This is optional setup, not a universal prerequisite.

## When to Use

- Large features or refactors that should stay off the current workspace
- Work that needs a clean branch or separate dependency state
- Parallel efforts that would otherwise interfere with the current directory

## When Not to Use

- Tiny edits or single-file changes that do not benefit from isolation
- Repositories where the current workspace is already the correct branch and state

## Minimal Workflow

1. Check whether a worktree is actually needed.
2. Prefer a repo-provided worktree or bootstrap script when one exists.
3. Prefer an existing `.worktrees/` or `worktrees/` directory when present.
4. Verify project-local worktree directories are ignored before using them.
5. Collect the branch, path, and setup command explicitly before creating the worktree.
6. Create the worktree and report the location.
7. If baseline checks fail, report the state before proceeding.

## Failure Modes

- Treating worktrees as mandatory for trivial work
- Ignoring a repo bootstrap script and recreating setup by hand
- Editing ignore files or committing setup changes without consent
- Using broken path expansion or stale runtime-specific paths
