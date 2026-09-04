---
name: finishing-a-development-branch
description: "Close out completed branch work with an explicit integration choice and verified state. Use when the current task asks to merge, open a PR, keep, discard, or clean up after implementation only; not as an automatic implementation tail."
---

# Finishing a development branch

## Overview

Verify the branch state and carry out the authorized integration choice. Ask only when the choice is still open. Preserve work until cleanup is explicitly authorized.

## When to Use

- Implementation is complete and the next step is merge, PR, keep, or discard
- A worktree or branch needs explicit cleanup or preservation

## When Not to Use

- Mid-task execution
- Situations where the current branch state has not been verified yet

## Minimal Workflow

1. Inspect the branch, worktree, dirty state, commits, and relevant checks. Do not present an integration option as ready unless its required checks have passed.
2. Use the integration choice already authorized by the user. If none is settled, present only viable choices: merge, open a PR, keep the branch, or discard it. State what each would change.
3. Proceed once the selected action and required checks are authorized and satisfied. Do not ask the user to repeat a choice. Discard and cleanup require their own explicit authorization; a merge or PR request does not grant it.
4. Preserve the worktree for PR and keep-as-is choices. Finish when the selected action is complete and the resulting branch and worktree state are verified.

## Reference Routing

- Reuse current-turn proof for unchanged code at the verified head and relevant state. Run missing checks or repeat stale evidence when code, state, or integration requirements change.
- Use `describe-pr` when the next step is writing or updating the PR summary.

## Failure modes

- Offering completion choices without verification
- Deleting a worktree needed for an open PR
- Treating discard as a normal cleanup step
