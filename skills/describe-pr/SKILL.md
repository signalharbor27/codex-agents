---
name: describe-pr
description: "Use when drafting or updating a pull request description after implementation; not while the code still needs design or implementation."
---

# Describe PR

## Overview

Use this skill after the work is complete, when the main task is explaining it clearly to reviewers.
Focus on what changed, why it changed, what users will notice, and how someone can verify it quickly.
Ground the description in the final diff and verification evidence.

## When to Use

- Drafting a PR description after implementation
- Updating a PR body after follow-up changes
- Explaining deviations between the final code and the original plan
- Summarizing verification for PR reviewers

## When Not to Use

- Use `engineering` when the code itself still needs to be designed or implemented
- Run claim-matched proof before this skill; do not use the PR summary as verification
- Do not use this skill before you understand the final diff and verification state

## Minimal Workflow

1. Read and apply `humanizer` and `show-me` before writing or updating the description. Use the repository's PR template when present.
2. Read the final diff, relevant context, and any plan or ticket that explains intent. If staged planning artifacts exist, read their durable decisions and phase intent. Do not draft from a plan or file list alone.
3. Lead with the concrete problem and resulting behavior. Explain what changed, why it was needed, and how it works. Name the affected abstractions and primitives, their responsibilities, and how they interact; scale detail to the change.
4. Include the smallest useful visual from `show-me`: GitHub-rendered Mermaid for a diagram or a fenced `diff` block for before/after behavior. Show the relevant trigger, boundaries, and observable result so reviewers can assess the design without reading every line.
5. Describe the final implementation for a reviewer who has not seen the conversation. Include deviations from durable decisions only when they explain a material tradeoff. Omit conversational history, abandoned approaches, and empty sections.
6. State verification actually performed and any material risk or limit. Reuse recorded evidence when the tested code and relevant state are unchanged; distinguish observed results from commands a reviewer could run.
7. Check the complete draft against the final diff and both writing skills. Return a reviewable description; publish or update the external PR only with existing or explicit authority.

## Reference Routing

- Return to the relevant producer for missing or stale proof when verification state is unclear. This skill does not replace verification.

## Failure modes

- Summarizing file churn instead of the change rationale
- Mixing reviewer guidance with speculative future work
- Claiming verification that was not actually run
- Hiding plan changes that materially affect review
- Omitting the required visual or filling a small PR with unnecessary sections
