---
name: grill-me
description: "Use when the user asks to be grilled or interviewed, or any unresolved user-owned choice materially affects the deliverable, acceptance criteria, or costly commitments. Excludes routine, factual, or settled choices."
---

# Grill me

## Overview

Settle consequential user-owned decisions through a dependency-frontier interview. The procedure lives in one reference so that a primary skill can load it mid-task and keep ownership of the task.

## When to Use

- One or more unresolved consequential user-owned choices about product, scope, architecture, or behavior, including plausible interpretations that change the deliverable or acceptance criteria, even when coding is technically possible
- Explicit requests, including `$grill-me` and requests to pressure-test a plan interactively

## When Not to Use

- Routine choices and already-settled work: stay with the current primary skill.
- Factual unknowns: use the relevant research, review, or debugging skill.
- Implementation work: the interview is read-only.

## Minimal Workflow

1. Read [the dependency-frontier grilling procedure](references/frontier.md) in full on every invocation, before asking a question or taking any other task action.
2. Follow the procedure within the user's authority until it ends. Done when a standalone interview has settled decisions, or an interview loaded by another primary skill has returned to that skill's authorized work.

## Failure modes

- Failing to invoke `grill-me` because the user did not use its name even though the work meets its trigger
- Starting the interview before reading the procedure completely
- Duplicating or overriding the interview behavior in this entrypoint or a consumer skill
