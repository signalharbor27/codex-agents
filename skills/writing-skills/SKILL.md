---
name: writing-skills
description: "Use when creating or revising skills, invocation descriptions, reference routing, or skill evaluations. Excludes ordinary software implementation and project-only conventions."
---

# Writing skills

## Overview

Design skills that route predictably, disclose relevant detail, and make completion observable.

## When to Use

- Refactoring an oversized or overlapping skill
- Demoting router-like skills into reference docs

## When Not to Use

- Code changes that do not alter skill behavior or raise a routing or progressive-disclosure question: use `engineering`.
- One-off repo conventions: put them in that repository's `AGENTS.md`.

## Minimal Workflow

1. Decide whether the capability needs independent invocation or only a reference. Done when every intended entry path has one owner.
2. Write one trigger for each distinct routing branch and state the boundary with adjacent skills. Done when every intended route is represented once and no phrase describes workflow instead of invocation.
3. Map execution branches. Keep instructions shared by every run in the entrypoint; move branch-specific detail behind a pointer that names its trigger. Keep each concept's rules and caveats together. Reference Routing holds branch-conditional references; a reference read on every run sits in its step. Done when every reference has one pointer with a trigger.
4. State a checkable completion criterion. Use ordered steps where sequence matters; give sections that serve the same function the standard names, in order: Overview, When to Use, When Not to Use, Minimal Workflow, Reference Routing, Failure modes, and Provenance last. Skill-specific sections may sit between them. Done when every step or step set ends on a criterion.
5. Preserve existing guarantees and user-authored preferences unless the user authorizes a change. A stronger model alone is no reason to discard a style, safety, or domain rule. Done when every guarantee of the previous version has a home in the new one.
6. Keep the entrypoint small. For new skills, aim for about 100 lines when practical. Reserve strict absolutes for safety, permissions, honesty, verification, output contracts, and explicit user rules.
7. Start with the smallest prompt that passes representative evals on the deployed model. State outcomes, evidence, important constraints or permissions, and required output; add process only when order is necessary or an eval exposes a gap.
8. Keep each meaning in one authoritative place. Apply the sentence-level no-op test and delete instructions that do not change routing, execution, or completion behavior. Done when no meaning appears twice and every remaining sentence changes behavior.
9. Test routing, execution, completion, and output shape with representative prompts against the deployed model and configuration. Done when each of the four passes on a representative case.
10. Before declaring a skill change complete, parse frontmatter, resolve local references, and run the source or consuming repository's validators and selected behavioral evals when available. Find commands in that repository's guidance; a globally installed skill does not include its source repository's eval harness. Report unavailable checks or live-eval blockers without claiming behavioral success.
11. Merge overlapping skills when they share an invocation boundary. Preserve separate skills when distinct tasks need independent routing. Done when no two skills share an invocation boundary.

## Reference Routing

- Read [DESCRIPTIONS.md](DESCRIPTIONS.md) when writing a description or when routing clarity is the main problem.
- Read [EVALUATING-SKILLS.md](EVALUATING-SKILLS.md) when validating whether a skill improves agent behavior.
- Read [SESSION-LESSONS.md](SESSION-LESSONS.md) when session evidence, recurring mistakes, or an explicit retrospective may justify a skill change.

## Failure modes

- Replacing an existing check or router while silently dropping one of its guarantees
- Monolithic multi-stage prompts that exceed the instruction budget and skip critical steps unpredictably
- Process-heavy instructions that replace clear outcomes and stop conditions, or generic brevity rules that suppress required artifacts
- Skills that only work when the user knows special phrasing to force the right sequence
- One artifact trying to do factual research, design alignment, structure, and tactical execution all at once
- Preserving stale platform-specific assumptions in supposedly portable skills
