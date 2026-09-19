Read this reference to validate whether a skill improves agent behavior.

Start with the smallest prompt that passes representative routing and behavior checks. Test the model and configuration that consume the skill. Record model, reasoning effort, instruction revision, catalog, and harness version; use the same runner and cases for baseline and candidate comparisons.

Use representative prompts to evaluate:
- routing: does the right skill fire for positive cases and stay inactive for near-negative cases? Can the model select no skill when none applies?
- compactness: does the answer stay focused?
- overlap: do sibling skills conflict?
- drift: are there stale tool or platform assumptions?
- information hierarchy: does `SKILL.md` hold only the steps every run needs, with branch-specific reference behind clear pointers?
- completion criterion: can the agent tell when each required unit of work is done, or can it stop early without noticing?
- branch disclosure: does each run load shared instructions plus only the branch-specific references it needs?
- final completeness: are all required artifacts, decisions, evidence items, caveats, and next actions present?
- implementation economy: once behavior and proof pass, is every changed file or boundary necessary?

Compare meaningful prompt changes with the previous version or a no-skill baseline on the same cases. Measure task success and required evidence first, followed by final completeness, tokens, latency, and cost. Fewer calls or shorter answers are improvements only when they still meet the required quality bar.

For skills that produce implementations, pair ready-to-code prompts. Use one bounded case that should stay with the existing owner and one variant where correctness requires another boundary or artifact. Judge behavior and evidence before economy. Reject an otherwise passing result if it adds unexplained files or boundaries, speculative hooks, redundant proof, or unrelated cleanup. Treat changed-line and file counts as signs of scope growth to investigate, not hard caps. Stop when the requested outcome passes and every changed boundary is justified.

Apply a sentence-level no-op test to suspected process overhead: remove or vary one instruction and rerun representative cases. Preserve explicit user requirements and invariants. Treat leading words and invocation phrasing as hypotheses to test. Include the full installed catalog when available; label simulated crowded or truncated catalogs as synthetic stress tests.

Structural checks should also confirm:
- `SKILL.md` stays small enough to scan quickly
- required outcomes, permissions, and completion conditions remain discoverable without enforcing exact headings or sentences
- descriptions stay trigger-oriented instead of turning into workflow summaries
- leading words such as `critical`, `exhaustive`, `read-only`, or `one-at-a-time` have behavioral evidence and are not decorative
- repeated no-op guidance is pruned or moved behind a sharper reference pointer

Use the source or consuming repository's documented validation suite when present. Check installed reference resolution too, especially sibling-skill dependencies. Do not assume repository-level scripts are distributed with an individual installed skill.

Routing classification checks skill selection and intended actions. It does not prove execution, permission handling, verification stopping, or response to steering. Use bounded execution cases for those claims: authorized continuation, read-only limits, a real approval boundary with a complete reviewable artifact and exact skill citation, proof reuse and justified rechecks, project-native commands, preservation of unrelated changes, and follow-ups that preserve the original objective. Label between-turn continuation separately from actual mid-turn steering. Judge artifacts and tool evidence; test that plausible incomplete results fail the judge.

Structural checks support behavioral evals but do not replace them. Prefer a small set that catches real failures. Require explicit live selection; keep execution fixtures isolated from the working repository and shared services.
