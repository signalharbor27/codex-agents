# Durable plan

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
- execution-ready vertical slices with observable outcomes, ownership boundaries, implementation blockers, integration dependencies, shared contracts, acceptance criteria, and verification;
- parallel groups, shared-contract owners, and integration checks;
- current status, ready slices, blockers, and residual risk.

## Build the plan

1. Record the destination, verified facts, durable decisions, explicit exclusions, and current blockers.
2. When the destination is clear but the route is not, build a discovery frontier. A decision belongs on it only when the question is precise and its prerequisites are settled.
3. Resolve repository facts by inspection. Ask the user only for consequential choices they own.
4. Keep questions that cannot yet be phrased precisely under `not-yet-specifiable`. Keep ruled-out work under `out-of-scope`. Neither category may silently become an execution slice.
5. Materialize the next production-complete slices when no unresolved consequential decision blocks them and evidence or conventions settle routine choices. Mark which can run concurrently, which depend on earlier work, and which share writes and must be serialized. Keep later uncertain work coarse.
6. Update the plan when a decision, frontier, slice status, scope, or blocker changes. Link to authoritative ADRs, issues, diffs, or documents instead of copying their detail.
7. Create an ADR only for a surprising, durable choice that is hard to reverse.

The plan is ready for execution when each dispatched slice has an owner, resolved implementation blockers, agreed shared contracts, observable acceptance criteria, and verification. Parallel groups need compatible write ownership; keep acceptance that depends on unfinished integration open until the final end-to-end proof passes. Do not turn uncertainty into premature tickets or the plan into a file-by-file script, architecture essay, issue-tracker workflow, or substitute for code review. Commit it only when the user requested that artifact or it has agreed team value.
