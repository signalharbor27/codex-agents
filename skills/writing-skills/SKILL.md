---
name: writing-skills
description: "Create or revise skills for clearer routing and predictable behavior. Use when writing SKILL.md files, editing descriptions, splitting references, pruning context load, or adding routing/eval cases. Not for ordinary software implementation."
---

# Writing skills

## Overview

Design skills that route predictably, disclose only the relevant detail, and make completion observable. The `description` is the routing signal available before the skill loads: it states what the skill does and when it applies. The entrypoint owns steps shared by every run; precise pointers lead to branch-specific references.

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

1. Decide whether the capability needs independent invocation or only a reference. Finish this choice when every intended entry path has one owner.
2. Write one trigger for each distinct routing branch and state the boundary with adjacent skills. The description is done when every intended route is represented once and no phrase describes workflow instead of invocation.
3. Map execution branches. Keep instructions shared by every run in the entrypoint; move branch-specific detail behind a pointer that names its trigger. Keep each concept's rules and caveats together.
4. Give each ordered step a checkable completion criterion. Replace vague endpoints such as "understand the code" with evidence the agent can observe.
5. Preserve existing guarantees when replacing a skill, script, or check unless one is explicitly retired and justified.
6. Keep the entrypoint small. For new skills, aim for about 100 lines when practical. Reserve strict absolutes for safety, permissions, honesty, verification, output contracts, and explicit user rules.
7. Start with the smallest prompt that passes representative evals on the deployed model. State outcomes, evidence, important constraints or permissions, and required output; add process only when order is necessary or an eval exposes a gap.
8. Keep each meaning in one authoritative place. Apply the sentence-level no-op test and delete instructions that do not change routing, execution, or completion behavior.
9. Test routing, execution, completion, and output shape with representative prompts against the deployed model and configuration.
10. Before declaring a skill change complete, parse frontmatter and run the repository's skill-surface check and selected behavioral evals. For this skill repository, use `skills/evals/check-skill-surface.sh`. Read current results; report unavailable checks or live-eval blockers without claiming behavioral success.
11. Merge or delete overlapping skills instead of preserving every niche router.

## Reference Routing

- Read [DESCRIPTIONS.md](DESCRIPTIONS.md) for description-writing and routing rules.
- Read [EVALUATING-SKILLS.md](EVALUATING-SKILLS.md) for behavioral evaluation patterns.

## Failure modes

- Descriptions that summarize workflow instead of trigger conditions
- Replacing an existing check or router while silently dropping one of its guarantees
- Keeping every niche router instead of merging overlapping skills
- Oversized `SKILL.md` files that should have become references
- Branch-specific references without a pointer that says when to load them
- Ordered steps without checkable completion criteria
- Monolithic multi-stage prompts that exceed the instruction budget and skip critical steps unpredictably
- Process-heavy instructions that replace clear outcomes and stop conditions, or generic brevity rules that suppress required artifacts
- Skills that only work when the user knows special phrasing to force the right sequence
- One artifact trying to do factual research, design alignment, structure, and tactical execution all at once
- Duplicated meanings and sentence-level no-ops that add context without changing behavior
- Preserving stale platform-specific assumptions in supposedly portable skills
