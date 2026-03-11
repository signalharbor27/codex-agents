---
name: finishing-a-development-branch
description: Close out completed branch work with an explicit integration choice and verified state. Use when implementation is done and you need to merge, open a PR, keep the branch, or discard it. Not for mid-task execution.
---

# Finishing a Development Branch

## Overview

Use this skill at the end of a branch-based task.
Verify the current state, present clear options, and do not delete work by accident.

## When to Use

- Implementation is complete and the next step is merge, PR, keep, or discard
- A worktree or branch needs explicit cleanup or preservation

## When Not to Use

- Mid-task execution
- Situations where the current branch state has not been verified yet

## Minimal Workflow

1. Verify the relevant checks before offering completion choices.
2. Present the branch options clearly.
3. Require explicit confirmation before destructive actions.
4. Preserve the worktree for PR and keep-as-is flows.

## Failure Modes

- Offering completion choices without verification
- Deleting a worktree needed for an open PR
- Treating discard as a normal cleanup step
