Read this when validating whether a skill actually improves agent behavior.

Start with the smallest prompt that passes representative routing and behavior checks.

Evaluate with representative prompts:
- routing: does the right skill fire?
- compactness: does the answer stay focused?
- overlap: do sibling skills conflict?
- drift: are there stale tool or platform assumptions?
- information hierarchy: does `SKILL.md` hold only the steps every run needs, with branch-specific reference behind clear pointers?
- completion criterion: can the agent tell when each required unit of work is done, or can it stop early without noticing?

Structural checks should also confirm:
- `SKILL.md` stays small enough to scan quickly
- required sections remain present and in the expected shape
- descriptions stay trigger-oriented instead of turning into workflow summaries
- leading words such as `critical`, `exhaustive`, `read-only`, or `one-at-a-time` actually change behavior and are not decorative
- repeated no-op guidance is pruned or moved behind a sharper reference pointer

Use the local suite:
- `skills/evals/check-skill-surface.sh`
- `skills/evals/routing-cases.json`

Prefer a small eval set that catches real failures over giant pressure-test theater.
