---
name: receiving-code-review
description: "Use when handling review comments from people or tools, especially disputed or unclear feedback. Excludes initiating a review of a diff."
---

# Receiving code review

## Overview

Test review feedback against this codebase before accepting or rejecting it. The reviewer's confidence does not replace local evidence.

## When to Use

- Sorting valid feedback from context-free or incorrect suggestions
- Planning the order of review-driven changes

## When Not to Use

- Pure design or implementation questions outside a review response: use `engineering`.
- Reviewing a diff or its fixes: use `review-and-simplify-changes`.

## Minimal Workflow

1. Identify the reviewer's technical claim and the user's existing authorization. During authorized implementation, terse follow-ups such as "PR review comments" request investigation, valid fixes, and verification. Preserve explicit review-only restrictions. Ask only about missing acceptance criteria or material scope, product, architecture, cost, destructive, or external effects.
2. Trace the relevant code, callers, tests, and contracts until the claim is confirmed or contradicted.
3. Classify the feedback as valid, invalid, or unresolved. Give the evidence and the smallest appropriate response. Valid means it meets the disposition bar in [review-and-simplify-changes's coding standards](../review-and-simplify-changes/references/coding-standards.md): fix blockers, and answer leads and pre-existing issues with a one-line reply.
4. Apply valid fixes within existing authority, and switch to `engineering` as primary once implementation becomes the main task. Existing authorization covers this work without a new request. Explain invalid feedback with evidence; isolate any unresolved decision while continuing independent authorized fixes.
5. From a bot's third pass on one PR, dismiss its findings with a reason unless they meet the bar or fall in the standards' risk findings. Push a change only to fix a real finding.
6. Close the loop after proof covers accepted changes and evidence explains rejected feedback. A fix to reviewed code gets `review-and-simplify-changes`'s round 2 alone. Reuse recorded proof across turns when the tested code and relevant state are unchanged; rerun checks affected by a fix.

## Failure modes

- Implementing feedback before checking the codebase reality
- Arguing with correct feedback instead of verifying it
- Agreeing reflexively instead of evaluating the feedback technically