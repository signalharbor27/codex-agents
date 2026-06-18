---
name: writing-software
description: Shape implementation/refactor work with minimal scope and clear module boundaries. Use when building a feature, changing an interface, planning a prototype or decision map, or reducing complexity. Not for test strategy, debugging, Rust, or storage architecture.
---

# Writing Software

## Overview

Use this as the default software-engineering skill when no narrower skill dominates.
It should keep changes small, reversible, and easy to reason about, with research and short planning made explicit for non-trivial work.
Use a more exploratory path for greenfield work and a more conservative path for brownfield work.
For larger unclear work, separate fact-finding, design alignment, structure, and tactical planning instead of collapsing them into one monolithic plan step.
Use decision rules, not process scripts: make the key outcome, risk, and verification choices explicit, then let the implementation path stay efficient.
Producer standard: code shaped by this skill should not create new findings for `improve-codebase-architecture` on the touched surface unless the tradeoff is explicit. For high-risk work, treat this as a blocking pre-edit gate, not a handoff checklist.

## When to Use

- Designing or reshaping a code change before editing
- Starting a new subsystem, service, workflow, or greenfield project
- Refactoring complexity, duplication, or interface problems
- Deciding naming, validation, or compatibility boundaries
- Planning a larger change into small vertical slices
- Creating a durable implementation or refactor plan from a known requirement
- Stress-testing a plan with challenge mode

## When Not to Use

- Use `testing-software` for test selection or suite design
- Use `systematic-debugging` for root-cause investigation
- Use `writing-rust` for Rust-specific API or ownership decisions
- Use `INTERFACE-DESIGN.md` for pattern-vs-no-pattern or module-shape debates
- Use `designing-data-intensive-systems` for workload, storage, or consistency questions

## Minimal Workflow

1. After required routing skills are loaded, read directly mentioned files first, then inspect the current code, callers, local conventions, and relevant domain/decision docs such as `CONTEXT.md`, `CONTEXT-MAP.md`, or ADRs when present.
2. State the real problem and the risk boundary.
3. Pick the path explicitly:
   - New feature: inspect callers and current seams, design the public interface from caller examples, then slice vertically.
   - Greenfield: name the domain, sketch the first deep modules, and build a tracer bullet before locking architecture.
   - Brownfield: inspect existing seams, invariants, callers, migrations, and compatibility pressure before proposing change.
   - Existing complex codebase: find characterization seams, preserve behavior, then make the smallest safe change.
   - New feature in an existing complex codebase: use existing-complex-codebase safety posture, then new-change vertical slicing.
   - Unfamiliar area: zoom out first when ownership, callers, entrypoints, or verification commands are unknown.
   - Refactor: verify the pain in code, define in/out scope, and plan tiny behavior-preserving steps.
4. For non-trivial work, write a short outcome-first plan before editing: current-state findings, durable decisions, vertical slices, verification, and the architecture no-regression assumption.
5. Apply the touched-surface architecture gate before editing: preserve or improve module boundaries, navigability, seam quality, testability, complexity drag, domain naming, decision memory, and failure/operability handling where relevant.
6. For high-risk work, run the producer preflight before editing:
   - classify risk domains: money/credits, auth/security/privacy, external services, live side effects, schema/migrations, webhooks/events/queues/workers/schedulers, concurrency/idempotency, generated public contracts, or 3+ modules/slices
   - name the intended deep module or application boundary and what callers should not know
   - write 2-3 caller examples for each material interface
   - map state transitions, durable records, side effects, retries, duplicate handling, reconciliation, and compatibility pressure; for money/credits include replay, external-success/local-failure, double-charge/no-access, cancel/void, scheduler races, and date bounds
   - define the test matrix with `testing-software`; list likely architecture/test-suite review findings and fix the shape now or record accepted debt
7. If no clean boundary exists, do a small shaping/refactor slice first or explicitly preserve the bad seam without worsening it.
8. If the smallest safe change must preserve a bad seam, state why it is out of scope and avoid making it worse.
9. For large or ambiguous work, split planning into staged artifacts:
   - research questions: what must be learned
   - factual research: current reality only
   - design discussion: decisions and patterns to follow
   - structure outline: vertical slices and checkpoints
   - tactical plan: execution details only after the prior choices are stable
10. For material interface choices, compare at least two different module shapes before choosing; include caller usage, hidden complexity, and misuse risk.
11. Favor deep modules: small, stable interfaces that hide real complexity and reduce caller knowledge. Delete or inline shallow pass-through modules unless they protect a real seam.
12. For risky, large, or ambiguous plans, run challenge mode before execution. For small plans, do a one-line assumption and verification check.
13. For work with 3+ slices, delegation, schema/API decisions, compaction risk, or expected resume, create or update a local exec-plan file in the target repo.
14. Delegate only independent research, test, docs, fixture, or disjoint code tracks; the main thread owns synthesis, integration, edits when scopes overlap, and verification.
15. When replacing an existing script, check, or code path, preserve current guarantees unless you intentionally remove one and justify it.
16. Choose the smallest reversible change that improves the problem.
17. If the task includes commits or a branch workflow, group work into logical commits along slice boundaries instead of one large mixed commit.
18. Name at least one rejected alternative when the choice is non-trivial.
19. Define what must be verified before claiming the shape is sound.
20. Before handoff, perform a review-regression check: if `improve-codebase-architecture` would flag new debt on the touched surface, fix high-confidence regressions or report the accepted tradeoff.
21. Implementation stops only after focused proof passes, a blocker is recorded, or approval is required.
22. Read the code before trusting the change; plan review helps alignment but does not replace code review.

## Reference Routing

- Read [COMPLEXITY.md](COMPLEXITY.md) for deep modules, change amplification, and information hiding.
- Read [CONSTRUCTION.md](CONSTRUCTION.md) for naming, function shape, and comment discipline.
- Read [DEFENSIVE.md](DEFENSIVE.md) for validation, assertions, and recoverability.
- Read [SMELLS.md](SMELLS.md) to classify the refactor pressure.
- Read [REFACTORINGS.md](REFACTORINGS.md) for concrete behavior-preserving moves.
- Read [PLANNING-LARGE-CHANGES.md](PLANNING-LARGE-CHANGES.md) for vertical-slice planning.
- Read [WORKFLOW-MODES.md](WORKFLOW-MODES.md) to choose behavior for new changes, new codebases, and existing complex codebases.
- Read [LEGACY-CODE.md](LEGACY-CODE.md) when safe change depends on seams, characterization tests, or dependency-breaking.
- Read [DOMAIN-MODELING.md](DOMAIN-MODELING.md) when terms, ownership, bounded contexts, or aggregates are unclear.
- Read [API-COMPATIBILITY.md](API-COMPATIBILITY.md) for public APIs, versioning, idempotency, pagination, and error contracts.
- Read [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md) when timeouts, retries, backpressure, health checks, or observability matter.
- Read [SECURITY-DESIGN.md](SECURITY-DESIGN.md) when trust boundaries, auth, secrets, or attacker paths matter.
- Read [DELIVERY.md](DELIVERY.md) for deploy gates, rollback, migrations, and small-batch delivery.
- Read [PLANNING-ARTIFACTS.md](PLANNING-ARTIFACTS.md) when the work needs staged research/design/outline/plan artifacts instead of one short inline plan.
- Read [EXEC-PLAN-FILES.md](EXEC-PLAN-FILES.md) when the work needs a durable in-repo plan across sessions or agents.
- Read [PARALLELIZATION.md](PARALLELIZATION.md) when a plan may benefit from subagents or split execution.
- Read [TRACER-BULLETS.md](TRACER-BULLETS.md) for greenfield or large-feature first slices.
- Read [PRACTICES.md](PRACTICES.md) for prototypes, reversibility, and broader engineering habits.
- Read [REFACTOR-PLANNING.md](REFACTOR-PLANNING.md) for scoped refactor plans.
- Read [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md) for API and module shape decisions.
- Read [TYPESCRIPT-ADVANCED.md](TYPESCRIPT-ADVANCED.md) when advanced type design is central to the change.
- Read [CHALLENGE-MODE.md](CHALLENGE-MODE.md) to grill the plan before execution; use a light pass for small plans and a hard pass for risky ones.

## Failure Modes

- Skipping directly mentioned inputs and planning from an incomplete picture
- Using greenfield prototype-first behavior on brownfield invariants that require migration discipline
- Skipping a short plan on non-trivial work and discovering the shape mid-edit
- Collapsing research, design, structure, and planning into one giant prompt that only works with special phrasing
- Executing an ungrilled plan with hidden assumption, dependency, or verification gaps
- Letting a large plan live only in chat so it drifts across compactions or handoffs
- Treating review of a long plan file as a substitute for reading the resulting code
- Delegating tightly serial work or failing to delegate obviously independent work
- Batching unrelated slice work into one opaque commit when the task is being committed incrementally
- Replacing existing behavior while silently weakening an enforced invariant
- Broad cleanup that does not solve the real coupling problem
- More abstraction without more leverage
- Plans that script every tiny action instead of making key decisions explicit
- Shallow modules and noisy interfaces where a deeper module boundary would simplify the change
- Interface changes that optimize internals while making callers harder to reason about
- Editing unfamiliar code before zooming out to map ownership, callers, entrypoints, and proof
- High-risk changes that skip state, idempotency, compatibility, production, security, or test-matrix design until review time
