# Third-party skills

Read this when a skill names Cursor `Task`, `subagent_type`, or `pstack-models.mdc`. Those skills run unmodified; these rules map their Cursor conventions onto our roles. Each role's brief at `~/.agents/briefs/<role>.md` holds its seats, modes, and post-launch check.

- Pick the role by what the call asks the subagent to do: reading or exploring, `explorer`; review, `reviewer` or `design_reviewer`; writing code, `implementer`; judging, `judge`; design, `architect`. Launch it through that role's brief. `readonly` means plan mode, `run_in_background` means async, and `environment: cloud` means local.
- The brief's model wins over a line in `~/.cursor/rules/pstack-models.mdc`. Each line names `<model>-<effort>` slugs, such as `claude-opus-5-5-high`, and in parentheses the role they come from; it agrees with the brief only when the call's function maps to that role. An unavailable model blocks the seat; no other model or role substitutes.
