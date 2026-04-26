# Agent-Friendly Codebase Review

Use this when the task is to review a codebase or subsystem and produce a practical architecture-improvement plan.

Treat the friction you hit while trying to understand the codebase as evidence, not noise.

## Review Axes

- module boundaries: deep modules, simple public interfaces, low change amplification
- navigability: obvious entrypoints, consistent naming, clear ownership, low surprise
- seam quality: boundaries where behavior can be tested or replaced without wide edits
- testing shape: boundary-focused tests, fast trustworthy proof, low mock theater
- complexity drag: indirection, duplicated policy, speculative helpers, dead branches
- domain fit: code names, workflows, and module ownership match the business language
- decision memory: durable tradeoffs are captured in docs or ADRs instead of rediscovered
- operability: timeouts, retries, idempotency, backpressure, observability, and recovery are explicit where failure matters
- workflow fit: whether the repo supports research, planning, delegation, and verification cleanly

## What Good Output Looks Like

Keep it short and critical.

1. Current-state findings
2. Highest-cost problems
3. Preserved constraints and invariants
4. Target architecture shape
5. Phased plan
6. Verification approach

Be opinionated: recommend a strongest target shape, not just a menu of options.
If the target shape is genuinely unclear, compare 2-3 realistic shapes first, then recommend the strongest one.

For each phase, include:

- goal
- scope
- dependencies
- verification
- expected payoff

## Good Review Questions

- Which modules are shallow wrappers instead of deep boundaries?
- Where does understanding one concept require bouncing across too many files, types, or helper layers?
- Which interfaces leak internal choices into too many callers?
- Where do tests lock down internals instead of behavior at the seam?
- Which conventions make the repo harder for an agent to inspect and change safely?
- Which improvements are high leverage versus just cleanup theater?
- Which domain terms conflict across code, docs, and user language?
- Which decisions should be captured because future agents will otherwise re-litigate them?
- Which failure modes are treated as happy-path exceptions instead of designed states?

## Domain and Decision Capture

Use existing domain docs first: `CONTEXT.md`, `CONTEXT-MAP.md`, `docs/adr/`, architecture notes, or equivalent repo-local files.

Create or update durable docs only when useful:

- add a term when it resolves a real naming ambiguity
- add an ADR when the choice is hard to reverse, surprising without context, and based on a real tradeoff
- for local handoff, capture current behavior, desired behavior, key interfaces, acceptance criteria, and out-of-scope in the exec plan instead of a GitHub issue
- avoid documenting implementation trivia that will go stale faster than the code

Good architecture plans should leave future agents with better names, clearer entrypoints, and fewer repeated discovery loops.

## Delegation Fit

For larger repos, delegate bounded evidence gathering by subsystem.

In monorepos, split the review along real ownership and seam boundaries rather than package count alone.
Typical tracks are frontend, backend, shared contracts or packages, and build or CI workflow.

Good subagent tracks:

- test-surface audit
- frontend or backend subsystem review
- shared package or contract review
- build and verification pain-point inventory
- duplication and boundary mapping

Keep main-thread ownership of synthesis, prioritization, and the final phased plan.

## Monorepo Synthesis

Do not return separate disconnected mini-plans.
Merge findings into one phased plan that makes cross-boundary dependencies explicit.

Call out:

- which problems are local versus systemic
- which frontend and backend seams depend on shared contracts
- which shared-package fixes should come before downstream cleanup
- which build or CI changes unblock safer parallel work later

## Avoid

- greenfield rewrites by default
- giant architecture essays
- broad “adopt pattern X” advice without concrete problem mapping
- forcing a single target shape when the best boundary is still genuinely ambiguous
- test expansion that does not improve trust at a real seam
