---
name: finishing-a-development-branch
description: "Use when the user requests merging, opening a PR, preserving, discarding, or cleaning up completed branch work, or merging under a standing grant; not as an automatic implementation tail."
---

# Finishing a development branch

## Overview

Verify the branch state and carry out the authorized integration choice. Ask only when the choice is still open. Preserve work until cleanup is explicitly authorized.

## When to Use

- Implementation is complete and the next step is merge, PR, keep, or discard
- A worktree or branch needs explicit cleanup or preservation

## When Not to Use

- Mid-task execution
- Ordinary implementation without a requested integration or cleanup step

## Minimal Workflow

1. Inspect the branch, worktree, dirty state, commits, and relevant checks. Do not present an integration option as ready unless its required checks have passed.
2. Use the integration choice already authorized by the user. If none is settled, present only viable choices: merge, open a PR, keep the branch, or discard it. State what each would change.
3. Complete authorized preparation before asking about a remaining boundary. Carry out the selected action once its required checks pass and authority covers its effects; do not ask the user to repeat a choice. Publishing, discard, and destructive cleanup need existing or explicit authority. A merge or PR request does not by itself authorize deleting the branch or worktree.
4. Merge authority: merge without asking only when all of these hold; otherwise ask Q and name the door and blast radius.
   - A standing grant from Q covers this repository, recorded in its project instructions or in a memory entry that quotes Q.
   - The PR's Merge danger footer (from `describe-pr`) reads `two-way` and `localized`, and the review record for the PR head's tree carries the same `door` and `blast_radius`.
   - Required checks and reviews pass on the current head, and no newer instruction from Q withholds the merge.
5. Preserve the worktree for PR and keep-as-is choices unless its cleanup is separately authorized. Finish when the selected action is complete and the resulting branch and worktree state are verified.

## Merged work cleanup

When Q says the work is merged or asks to clean up, that request authorizes cleanup of the agent-owned workspace. Ask no confirmation question and make no follow-up offers. After the pre-removal checks in [using-git-worktrees](../using-git-worktrees/SKILL.md#authorized-cleanup), run `bash <this skill's directory>/scripts/cleanup-merged.sh <branch>` ([script](scripts/cleanup-merged.sh)) from a checkout that stays. The script needs `wt` and `jq`. It refuses unless the branch is merged and its worktree is clean, untracked files included, and is the one `wt list` reports for the branch at its worktree-path template path (no branch mismatch). It runs only project hooks already persisted in Worktrunk's approvals and refuses on an unapproved hook. A branch with no worktree is deleted only after the merge proof. It then removes the worktree, deletes the branch and its stale remote ref, and fast-forwards a clean main checkout on the default branch; `--dry-run` previews the actions. On refusal, report the reason and keep the work.

## Reference Routing

- Reuse recorded proof across turns when the tested code and relevant state are unchanged. Run missing checks or repeat affected checks when code, state, or integration requirements change.
- Use `describe-pr` when the next step is writing or updating the PR summary.
- For authorized removal of unmerged or kept-branch workspaces, follow [using-git-worktrees](../using-git-worktrees/SKILL.md#authorized-cleanup).

## Failure modes

- Offering completion choices without verification
- Deleting a worktree needed for an open PR
- Treating discard as a normal cleanup step
- Asking "should I clean up?" or offering more work after Q says the work is merged
