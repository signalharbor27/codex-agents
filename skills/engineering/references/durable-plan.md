# Durable Plan

Load this only after the user requests or authorizes an in-repo plan that must survive sessions or agents. Keep ordinary plans inline.

Suggested target-repo locations:

- active: `docs/exec-plans/active/`
- completed: `docs/exec-plans/completed/`

Keep one terse source of truth containing:

- scope and explicit exclusions;
- verified current state;
- durable decisions and rejected consequential alternatives;
- vertical slices with owner, dependencies, observable acceptance, and verification;
- current status, next slice, blockers, and residual risk.

Update it only when a decision, slice status, scope, or blocker changes. Do not duplicate detail already authoritative in an ADR, issue, diff, or document; link to it. Create an ADR only for a surprising, durable, hard-to-reverse decision.

Do not turn the plan into a file-by-file script, architecture essay, or substitute for code review. Commit it only when the user requested that artifact or it has agreed team value.
