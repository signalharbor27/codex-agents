---
name: writing-skills
description: "Create or revise skills for clearer routing and predictable behavior. Use when writing SKILL.md files, editing descriptions, splitting references, pruning context load, or adding routing/eval cases. Not for ordinary software implementation."
---

# Writing Skills

## Overview

Use this skill to design predictable routers with checkable completion criteria and progressive disclosure.
Treat the `description` as the routing signal available before the skill loads: it must say what the skill does and when to use it. Keep shared execution steps in the entrypoint; put branch-specific depth behind precise reference pointers.

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

1. Decide whether the capability needs independent invocation or only a reference; the choice is done when every intended entry path has one owner.
2. Write the description for routing, with one trigger per distinct branch and an overlap boundary where needed.
3. Map branches. Inline what every run needs; move branch-specific detail behind a pointer whose wording says when to load it. Co-locate each concept's rules and caveats.
4. Give each ordered step a checkable completion criterion so the agent can distinguish done from incomplete.
5. Preserve existing guarantees when replacing a skill, script, or check unless one is explicitly retired and justified.
6. Keep the entrypoint small, ideally near 100 lines for new skills when practical. Use strict absolutes only for safety, permissions, honesty, verification, output contracts, and explicit user rules.
7. For GPT-5.6, start with the smallest prompt that passes representative evals. State outcomes, evidence, important constraints or permissions, and required output; add process only when order is necessary or an eval exposes a gap.
8. Keep each meaning in one authoritative place. Apply the sentence-level no-op test and delete instructions that do not change routing, execution, or completion behavior.
9. Test routing, execution, completion, and output shape with representative prompts against the deployed model and configuration.
10. Before claiming a skill change complete, run the skill-surface check plus the selected behavioral evals fresh and read their actual output.
11. Merge or delete overlapping skills instead of preserving every niche router.

## Reference Routing

- Read [DESCRIPTIONS.md](DESCRIPTIONS.md) for description-writing and routing rules.
- Read [EVALUATING-SKILLS.md](EVALUATING-SKILLS.md) for behavioral evaluation patterns.

## Failure Modes

- Descriptions that summarize workflow instead of trigger conditions
- Replacing an existing check or router while silently dropping one of its guarantees
- Keeping every niche router instead of merging overlapping skills
- Giant `SKILL.md` files that should have become references
- Branch-specific references without a pointer that says when to load them
- Ordered steps without checkable completion criteria
- Monolithic multi-stage prompts that exceed the instruction budget and skip critical steps unpredictably
- Process-heavy instructions that replace clear outcomes and stop conditions, or generic brevity rules that suppress required artifacts
- Skills that only work when the user knows special phrasing to force the right sequence
- One artifact trying to do factual research, design alignment, structure, and tactical execution all at once
- Duplicated meanings and sentence-level no-ops that add context without changing behavior
- Preserving stale platform-specific assumptions in supposedly portable skills
