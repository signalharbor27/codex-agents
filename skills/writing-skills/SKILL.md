---
name: writing-skills
description: Create or revise skills with clear routing, small entrypoints, and progressive disclosure. Use when building or editing Codex skills, references, and bundled guidance. Not for ordinary software implementation tasks.
---

# Writing Skills

## Overview

Use this skill to design skills as routers first and references second.
Keep the entrypoint short, the description trigger-focused, and the deep material offloaded into references.
Treat the `description` as the only routing signal available before the skill loads: it must say what the skill does and when to use it.

## When to Use

- Creating a new skill
- Refactoring an oversized or overlapping skill
- Rewriting descriptions for clearer routing
- Demoting router-like skills into reference docs

## When Not to Use

- Ordinary code changes that do not alter skill behavior
- One-off repo conventions better placed in `AGENTS.md`
- Pure implementation work with no routing or progressive-disclosure question

## Minimal Workflow

1. Decide whether the capability deserves a top-level router or only a reference.
2. Write the description for routing, not for workflow narration.
3. Preserve existing guarantees when replacing a skill, script, or check, unless you explicitly retire one and justify it.
4. Keep the entrypoint small, ideally near 100 lines for new skills when practical, and move heavy material into references.
5. Follow GPT-5.5 prompt guidance: define outcomes, success evidence, constraints, and output shape; avoid process-heavy scripts unless order is required.
6. Use strict absolutes only for real invariants: safety, permissions, honesty, verification, output contracts, and explicit user rules.
7. If the workflow has distinct stages, use explicit control flow and stage docs instead of one monolithic prompt blob.
8. Avoid skills that depend on magic words to trigger critical behavior; make the important steps explicit in the workflow.
9. Test the routing and output shape with representative prompts.
10. Merge or delete overlapping skills instead of preserving every niche router.

## Reference Routing

- Read [DESCRIPTIONS.md](DESCRIPTIONS.md) for description-writing and routing rules.
- Read [EVALUATING-SKILLS.md](EVALUATING-SKILLS.md) for behavioral evaluation patterns.

## Failure Modes

- Descriptions that summarize workflow instead of trigger conditions
- Replacing an existing check or router while silently dropping one of its guarantees
- Keeping every niche router instead of merging overlapping skills
- Giant `SKILL.md` files that should have become references
- Monolithic multi-stage prompts that exceed the instruction budget and skip critical steps unpredictably
- Process-heavy instructions that replace clear outcomes and stop conditions
- Skills that only work when the user knows special phrasing to force the right sequence
- One artifact trying to do factual research, design alignment, structure, and tactical execution all at once
- Preserving stale platform-specific assumptions in supposedly portable skills
