---
name: describe-pr
description: "Use when drafting or updating a pull request description after implementation. Excludes code that still needs design or implementation."
---

# Describe PR

## Overview

Explain a finished change to reviewers: what changed, why it changed, what users will notice, and how someone can verify it quickly. Ground the description in the final diff and verification evidence.

## When to Use

- Updating a PR body after follow-up changes
- Explaining deviations between the final code and the original plan
- Summarizing verification for PR reviewers

## When Not to Use

- Code that still needs design or implementation: use `engineering`.
- Missing, stale, or unclear proof: return to the relevant producer and run claim-matched proof first; the PR summary is not verification.

## Minimal Workflow

1. Read and apply `humanizer` and `show-me` before writing or updating the description. Use the repository's PR template when present. For visible UI changes, read the repository's UI evidence and attachment requirements, and include the required rendered states in the description. State missing evidence before publication.
2. Read the final diff, relevant context, and any plan or ticket that explains intent. If staged planning artifacts exist, read their durable decisions and phase intent. The final diff is the source; a plan or file list only supplements it.
3. Lead with the concrete problem and resulting behavior.
4. Open the "what changed" part with the smallest `show-me` sketch of the change: pseudocode, a call tree, a fenced `diff` of before and after behavior, or GitHub-rendered Mermaid. Show the trigger, the boundaries crossed, and the observable result. The prose after it explains why the change was needed and how the affected abstractions and primitives interact, scaled to the change; leave out what the sketch already shows.
5. Describe the final implementation for a reviewer who has not seen the conversation. Include deviations from durable decisions only when they explain a material tradeoff. Omit conversational history, abandoned approaches, and empty sections. Carry the review's `## Audit items` section, when it has items, unchanged.
6. State verification actually performed and any material risk or limit. Reuse recorded evidence when the tested code and relevant state are unchanged; distinguish observed results from commands a reviewer could run.
7. End the body with the `## Merge danger` footer: `Door: one-way|two-way`, `Blast radius: localized|service|customers|data`, and one `Reason:` line. Read [references/merge-danger.md](references/merge-danger.md) and classify from the final diff and the effects of merging and deploying it. When the review recorded a more severe classification, use that one.
8. Check the complete draft against the final diff and both writing skills; `humanizer` covers the whole body. Done when every claim matches the final diff or recorded verification. Return a reviewable description; publish or update the external PR only with existing or explicit authority.

## Failure modes

- Summarizing file churn instead of the change rationale
- Mixing reviewer guidance with speculative future work
- Claiming verification that was not actually run
- Hiding plan changes that materially affect review
- Omitting the required visual or filling a small PR with unnecessary sections
- Classifying Merge danger by diff size instead of effects, or leaving a stale footer after follow-up commits
