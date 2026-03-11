# Skill Evals

This directory holds the lightweight eval suite for the active Codex skill surface.

It covers two things:

- structural checks
  - top-level skill count
  - expected router names
  - required sections
  - banned legacy terms
  - description shape
- routing cases
  - representative prompts
  - expected top-level skill
  - explicitly wrong sibling routes

Run:

```bash
./skills/evals/check-skill-surface.sh
```

Then review:

- `skills/evals/routing-cases.json`

Use the routing cases for manual or agent-driven behavioral checks after major skill edits.
