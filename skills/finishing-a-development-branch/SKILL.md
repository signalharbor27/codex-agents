---
name: finishing-a-development-branch
description: "Close out completed branch work with an explicit integration choice and verified state. Use when the current task asks to merge, open a PR, keep, discard, or clean up after implementation only; not as an automatic implementation tail."
---

# Finishing a development branch

## Overview

Close a branch-based task by verifying its state and letting the user choose what happens next. Preserve the work until that choice explicitly authorizes cleanup.

## When to Use

- Implementation is complete and the next step is merge, PR, keep, or discard
- A worktree or branch needs explicit cleanup or preservation

## When Not to Use

- Mid-task execution
- Situations where the current branch state has not been verified yet

## Minimal Workflow

1. Inspect the branch, worktree, dirty state, commits, and relevant checks. Do not present an integration option as ready unless its required checks have passed.
2. Present only viable choices: merge, open a PR, keep the branch, or discard it. State what each choice will change.
3. Wait for an explicit choice before changing branch state. Treat discard and cleanup as destructive actions that need separate confirmation.
4. Preserve the worktree for PR and keep-as-is choices. Finish when the selected action is complete and the resulting branch and worktree state are verified.

## Reference Routing

- Run the repository's claim-matched proof fresh before presenting completion choices.
- Use `describe-pr` when the next step is writing or updating the PR summary.

## Failure modes

- Offering completion choices without verification
- Deleting a worktree needed for an open PR
- Treating discard as a normal cleanup step
