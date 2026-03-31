---
name: describe-pr
description: Write reviewer-oriented pull request summaries with clear problem framing, user-visible impact, implementation notes, and verification steps. Use when drafting or updating a PR description after the code is already in place.
---

# Describe PR

## Overview

Use this skill when the work exists and the main task is explaining it clearly to reviewers.
Focus on what changed, why it changed, what users will notice, and how someone can verify it quickly.

## When to Use

- Drafting a PR description after implementation
- Updating a PR body after follow-up changes
- Explaining deviations between the final code and the original plan
- Summarizing verification steps for reviewers or release notes

## When Not to Use

- Use `writing-software` when the code itself still needs to be designed or implemented
- Use `verification-before-completion` to prove the work, not to write the summary
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
- Use `verification-before-completion` first if the verification state is still unclear.

## Failure Modes

- Summarizing file churn instead of the change rationale
- Mixing reviewer guidance with speculative future work
- Claiming verification that was not actually run
- Hiding plan changes that materially affect review
