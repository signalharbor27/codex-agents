---
name: verification-before-completion
description: "Bind a completion claim to concrete evidence, then run it before reporting success. Use when defining required proof, including a read-only verification plan. Not for root-cause debugging or test-suite design."
---

# Verification Before Completion

## Overview

Use this skill right before claiming success.
Fresh evidence in the current turn is required for completion claims.

## When to Use

- About to say tests pass, build succeeds, or bug is fixed
- About to hand work off, create a PR, or mark a task complete
- About to trust a delegated result without independent verification
- Defining the command or observation that would prove a completion claim, including a read-only plan

## When Not to Use

- Use `writing-software` to decide change shape
- Use `systematic-debugging` to understand failures
- Use `testing-software` to decide what proof is cheapest and most trustworthy

## Minimal Workflow

1. Identify the command or observation that proves the claim.
2. Run it fresh.
3. Read the actual result, not the expected result.
4. Report the state that the evidence supports.

## Reference Routing

- Use `testing-software` when the unresolved question is test layer or test design; this skill owns binding the final claim to a command or observation.
- Use `describe-pr` when the work is already proven and the remaining task is reviewer communication.

## Failure Modes

- Claiming completion from confidence instead of evidence
- Treating partial checks as proof of the whole
- Trusting delegated success reports without verifying the result
- Reusing stale output from earlier turns
