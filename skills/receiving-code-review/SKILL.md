---
name: receiving-code-review
description: "Evaluate review feedback technically before acting on it. Use when handling review comments, especially when scope, correctness, or context is unclear. Not for requesting a review or for blind feedback application."
---

# Receiving code review

## Overview

Test review feedback against this codebase before accepting or rejecting it. The reviewer's confidence does not replace local evidence.

## When to Use

- Receiving review comments from people or tools
- Sorting valid feedback from context-free or incorrect suggestions
- Planning the order of review-driven changes

## When Not to Use

- Use `engineering` when the question is pure design or implementation, not review response

## Minimal Workflow

1. Restate the reviewer's technical claim and infer routine intent. Ask only when acceptance criteria are missing or the request would change scope, destructive state, live state, or shared state.
2. Trace the relevant code, callers, tests, and contracts until the claim is confirmed or contradicted.
3. Classify the feedback as valid, invalid, or unresolved. Give the evidence and the smallest appropriate response.
4. When valid feedback requires implementation, transition to `engineering` as the primary skill before editing.
5. Close the loop only after fresh proof covers the accepted change, or after an evidence-backed explanation resolves rejected feedback.

## Reference Routing

- Use `engineering` after feedback is validated and the main task becomes implementation.

## Failure modes

- Implementing feedback before checking the codebase reality
- Arguing with correct feedback instead of verifying it
- Agreeing reflexively instead of evaluating the feedback technically
