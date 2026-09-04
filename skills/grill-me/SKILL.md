---
name: grill-me
description: "Stress-test consequential choices through a read-only interview. Use when the work contains several interdependent user-owned decisions or the user asks to be grilled; not for routine or settled work."
---

# Grill me

## Overview

This model-invoked Codex skill is the sole owner of grilling behavior.
Its interview procedure is a local reference. An existing primary skill can use the same behavior after inspection without adding another installable router.

## When to Use

- The work contains several interdependent consequential product, scope, architecture, or behavior choices that belong to the user
- The user asks to be grilled, interviewed, or interactively pressure-tested, including through `$grill-me`

## When Not to Use

- Keep routine choices, already-settled work, and one approval question with the current primary skill
- Use the relevant research, review, or debugging skill when the unresolved issue is factual rather than a user decision
- Do not use it as an implementation skill or as authority to change files, branch state, external services, or live state

## Minimal Workflow

1. Read [the dependency-frontier grilling procedure](references/frontier.md) before asking a question or taking any other task action.
2. Follow the procedure within the user's authority. End a standalone interview with settled decisions. If another primary skill loaded it during authorized work, resume that work when decisions are settled; ask for confirmation only when unresolved assumptions or authority require it.

## Reference Routing

- Read [references/frontier.md](references/frontier.md) for every invocation
- Existing primary skills may load the same reference when inspection reveals its trigger; they retain primary ownership

## Failure modes

- Failing to invoke `grill-me` because the user did not use its name even though the work meets its trigger
- Invoking it for routine, factual, single-approval, or already-settled work
- Starting the interview before reading the procedure completely
- Duplicating or overriding the interview behavior in this entrypoint or a consumer skill
- Treating settled discussion as implementation authority or mutating files, artifacts, services, or live state
