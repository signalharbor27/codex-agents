---
name: describe-pr
description: "Write reviewer-oriented pull request summaries after implementation. Use when creating or updating a PR body from the final diff and verification state; not while code still needs design or implementation."
---

# Describe PR

## Overview

Use this skill after the work is complete, when the main task is explaining it clearly to reviewers.
Focus on what changed, why it changed, what users will notice, and how someone can verify it quickly.
The first task action is reading the final diff; do not draft from a plan or file list alone.

## When to Use

- Drafting a PR description after implementation
- Updating a PR body after follow-up changes
- Explaining deviations between the final code and the original plan
- Summarizing verification steps for reviewers or release notes

## When Not to Use

- Use `engineering` when the code itself still needs to be designed or implemented
- Run claim-matched proof before this skill; do not use the PR summary as verification
- Do not use this skill before you understand the final diff and verification state

## Minimal Workflow

1. Read the final diff, the relevant context, and any plan or ticket that explains intent.
2. If staged planning artifacts exist, read the durable decisions and phase intent before summarizing the implementation.
3. State the problem being solved before listing the code changes.
4. Separate user-facing impact from internal implementation detail.
5. Call out meaningful deviations from the original plan or durable decisions when they matter to review.
6. End with the concrete verification someone else can run or observe.

## Reference Routing

- Use the repo PR template when one exists.
- Return to the relevant producer and run fresh claim-matched proof if verification state is unclear.

## Failure modes

- Summarizing file churn instead of the change rationale
- Mixing reviewer guidance with speculative future work
- Claiming verification that was not actually run
- Hiding plan changes that materially affect review
