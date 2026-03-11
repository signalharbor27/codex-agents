Read this when validating whether a skill actually improves agent behavior.

Evaluate with representative prompts:
- routing: does the right skill fire?
- compactness: does the answer stay focused?
- overlap: do sibling skills conflict?
- drift: are there stale tool or platform assumptions?

Use the local suite:
- `skills/evals/check-skill-surface.sh`
- `skills/evals/routing-cases.json`

Prefer a small eval set that catches real failures over giant pressure-test theater.
