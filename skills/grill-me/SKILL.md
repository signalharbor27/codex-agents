---
name: grill-me
description: "Stress-test a plan or design interactively, one decision at a time. Use when the user asks to be grilled or a consequential user-owned decision blocks execution. Not for large but already-specified work."
---

# Grill Me

## Overview

Challenge a plan or design until its consequential user-owned decisions are settled.
The skill is interactive and read-only; its output is shared understanding, not implementation or a written artifact.

## When to Use

- The user asks to be grilled or interactively pressure-tested
- A consequential product, scope, architecture, or behavior decision blocks execution
- Several user-owned decisions depend on one another and need to be resolved in order

## When Not to Use

- Use `engineering` for ordinary planning or implementation when no interactive user decision blocks progress
- Keep large but already-specified work with its current primary skill
- Use the relevant planning or review skill when the user requests findings rather than an interview
- Use `debugging` when the failure mode is not yet understood

## Minimal Workflow

1. Read the plan, design, and directly relevant files. Resolve facts from authoritative evidence instead of asking the user.
2. Identify the consequential user-owned decisions and their prerequisites. Exclude routine choices that repository evidence or conventions settle.
3. From decisions whose prerequisites are settled, choose the root-most one; break ties by downstream impact.
4. Ask exactly one atomic decision question. Include the recommended answer, key tradeoff, and what materially changes with the alternative.
5. Stop and wait. On the next turn, record the decision briefly, recompute what is now answerable, and ask only the next eligible question.
6. When no consequential user-owned decision remains, summarize settled decisions, rejected consequential alternatives, factual blockers, and verification expectations. Ask the user to confirm readiness.
7. Do not create or change code, plans, ADRs, glossaries, questionnaires, or external state during the grill. After confirmation, transition to `engineering` if planning or implementation is authorized.

## Reference Routing

- Use `engineering` as the next primary skill if the discussion turns into planning or implementation.

## Failure Modes

- Choosing a downstream question before its prerequisites are settled
- Asking multiple questions in one turn or presenting the whole design tree at once
- Packing several decisions into one nominal question
- Using user questions as a substitute for code inspection
- Treating routine implementation details as user-owned decisions
- Treating task size, plan readiness, or prior implementation authority as permission to write during the grill
- Grilling after no consequential user-owned decision remains
