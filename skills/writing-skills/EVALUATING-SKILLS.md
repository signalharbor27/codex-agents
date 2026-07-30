Read this when validating whether a skill actually improves agent behavior.

Start with the smallest prompt that passes representative routing and behavior checks. Run against the deployed model and configuration; for this repo, that currently means GPT-5.6 (`gpt-5.6` routes to `gpt-5.6-sol`).

Evaluate with representative prompts:
- routing: does the right skill fire?
- compactness: does the answer stay focused?
- overlap: do sibling skills conflict?
- drift: are there stale tool or platform assumptions?
- information hierarchy: does `SKILL.md` hold only the steps every run needs, with branch-specific reference behind clear pointers?
- completion criterion: can the agent tell when each required unit of work is done, or can it stop early without noticing?
- branch disclosure: does each run load shared instructions plus only the branch-specific references it needs?
- final completeness: are every required artifact, decision, evidence item, caveat, and next action present?
- implementation economy: once behavior and proof pass, is every changed file or boundary necessary?

Compare meaningful prompt changes with the previous version or a no-skill baseline on the same cases. Track task success and required evidence first; then final completeness, tokens, latency, and cost. Fewer calls or shorter answers count as improvements only when the required quality bar still passes.

For implementation-producing skills, pair ready-to-code prompts: one bounded case that should stay with the existing owner, and one variant where correctness requires another boundary or artifact. Judge behavior and evidence before economy. Reject an otherwise passing result when it adds unexplained files or boundaries, speculative hooks, redundant proof, or unrelated cleanup. Treat changed-line and file counts as scope-growth signals to investigate, not hard caps; stop when the requested outcome passes and every changed boundary is justified.

Apply a sentence-level no-op test: remove or vary one instruction, rerun representative cases, and keep it only when it changes routing, execution, completion, or an explicit invariant. Treat leading words and invocation phrasing as hypotheses to test, not portable guarantees.

Structural checks should also confirm:
- `SKILL.md` stays small enough to scan quickly
- required sections remain present and in the expected shape
- descriptions stay trigger-oriented instead of turning into workflow summaries
- leading words such as `critical`, `exhaustive`, `read-only`, or `one-at-a-time` have behavioral evidence and are not decorative
- repeated no-op guidance is pruned or moved behind a sharper reference pointer

Use the local suite:
- `skills/evals/check-skill-surface.sh`
- `skills/evals/routing-cases.json`

Structural checks support behavioral evals; they do not replace them. Prefer a small eval set that catches real failures over giant pressure-test theater.
