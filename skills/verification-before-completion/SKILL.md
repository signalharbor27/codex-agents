---
name: verification-before-completion
description: Prove completion claims with fresh evidence before reporting success. Use when about to say work is fixed, passing, complete, or ready. Not for deciding what to build or how to debug.
---

# Verification Before Completion

## Overview

Use this skill right before claiming success.
Fresh evidence in the current turn is required for completion claims.

## When to Use

- About to say tests pass, build succeeds, or bug is fixed
- About to hand work off, create a PR, or mark a task complete
- About to trust a delegated result without independent verification

## When Not to Use

- Use `writing-software` to decide change shape
- Use `systematic-debugging` to understand failures
- Use `testing-software` to decide what proof is cheapest and most trustworthy

## Minimal Workflow

1. Identify the command or observation that proves the claim.
2. Run it fresh.
3. Read the actual result, not the expected result.
4. Report the state that the evidence supports.

## Failure Modes

- Claiming completion from confidence instead of evidence
- Treating partial checks as proof of the whole
- Trusting delegated success reports without verifying the result
- Reusing stale output from earlier turns
