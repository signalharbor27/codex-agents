# Durable Plan

Load this only after the user requests or authorizes an in-repo plan that must survive sessions or agents. Keep ordinary plans inline.

Suggested target-repo locations:

- active: `docs/exec-plans/active/`
- completed: `docs/exec-plans/completed/`

Keep one terse source of truth containing:

- destination, scope, and explicit exclusions;
- verified current state and facts;
- durable decisions and rejected consequential alternatives;
- precise open decisions with their dependencies;
- in-scope work that is not yet specifiable, kept as coarse uncertainty rather than invented tasks;
- execution-ready vertical slices with owner, dependencies, observable acceptance, and verification;
- current status, next slice, blockers, and residual risk.

Use a discovery frontier when the destination is clear but the route is not. A decision belongs on the frontier only when its question is precise and its prerequisites are settled. Resolve repository facts by inspection; put only consequential user-owned choices to the user. Keep questions that cannot yet be stated precisely under not-yet-specifiable, and keep ruled-out work under out-of-scope so neither silently becomes an execution slice.

Materialize or update execution slices when no unresolved consequential decision blocks the next production-complete slice and routine choices can be resolved from evidence or conventions. Update the plan only when a decision, frontier, slice status, scope, or blocker changes. Do not duplicate detail already authoritative in an ADR, issue, diff, or document; link to it. Create an ADR only for a surprising, durable, hard-to-reverse decision.

Do not turn uncertainty into premature tickets, or the plan into a file-by-file script, architecture essay, issue-tracker workflow, or substitute for code review. Commit it only when the user requested that artifact or it has agreed team value.
