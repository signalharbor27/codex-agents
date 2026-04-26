---
name: receiving-code-review
description: Evaluate review feedback technically before acting on it. Use when handling review comments, especially when scope, correctness, or context is unclear. Not for requesting a review or for blind feedback application.
---

# Receiving Code Review

## Overview

Use this skill to evaluate review feedback rather than performing social agreement.
The goal is technical correctness for this codebase.

## When to Use

- Receiving review comments from people or tools
- Sorting valid feedback from context-free or incorrect suggestions
- Planning the order of review-driven changes

## When Not to Use

- Use `verification-before-completion` for final proof of a claim
- Use `writing-software` when the question is pure design, not review response

## Minimal Workflow

1. Infer routine intent from the review comment; ask only for missing acceptance criteria, destructive/live/shared-state, or scope changes.
2. Verify it against the actual codebase.
3. Apply, reject, or escalate with technical reasoning.
4. Test changes before closing the loop.

## Reference Routing

- Use `writing-software` after the review feedback has been validated and the main task becomes implementation.
- Use `verification-before-completion` before claiming the review-driven changes are done.

## Failure Modes

- Implementing feedback before checking the codebase reality
- Arguing with correct feedback instead of verifying it
- Performing agreement language instead of technical evaluation
