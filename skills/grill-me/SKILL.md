---
name: grill-me
description: Stress-test a plan or design through focused questioning until the key branch decisions are stable. Use when the user wants to grill a plan, pressure-test a design, or explicitly says "grill me".
---

# Grill Me

## Overview

Use this skill when the main task is to challenge a plan or design before execution.
The goal is shared understanding, not implementation.

## When to Use

- The user explicitly says `grill me`
- A plan feels plausible but still has branch, dependency, or scope risk
- A design needs stronger pressure-testing before implementation starts
- You need to expose missing assumptions, weak verification, or unresolved tradeoffs

## When Not to Use

- Use `writing-software` when the task is still shaping or implementing the change
- Use `systematic-debugging` when the failure mode is not yet understood
- Do not use this for tiny tasks where a light internal plan check is enough

## Minimal Workflow

1. Read the plan, design, or directly mentioned files fully before questioning it.
2. If the codebase can answer a question, inspect the code before asking the user.
3. Walk the design tree one branch at a time instead of spraying unrelated questions.
4. For each important question, give a recommended answer or tradeoff, not just the question.
5. Tighten dependencies, rejected alternatives, scope edges, and verification until the plan is stable.
6. Stop when the major branch decisions are resolved or the user wants to return to planning.

## Reference Routing

- Use [../writing-software/CHALLENGE-MODE.md](../writing-software/CHALLENGE-MODE.md) for the detailed grill rubric.
- Use `writing-software` if the discussion needs to turn back into staged planning or implementation.

## Failure Modes

- Asking broad unrelated questions instead of resolving one branch at a time
- Using user questions as a substitute for code inspection
- Grilling forever without converging on stable decisions
- Stress-testing tiny low-risk work that does not need a standalone grill
