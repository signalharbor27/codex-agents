# Agent-Friendly Codebase Review

Use this when the task is to review a codebase or subsystem and produce a practical architecture-improvement plan.

Treat the friction you hit while trying to understand the codebase as evidence, not noise.

Agent-friendly means an agent can start from a real runtime or task entrypoint, reason locally through clear domain ownership and deep module interfaces, see consequential side effects, reach a trustworthy proof seam, and hand off that bounded evidence without making the next agent rediscover the system.

This rubric collects that evidence; it is not a separate architecture doctrine. The owning skill routes the engineering references that define boundary design, state and effects, and trustworthy proof.

## Review Axes

- real entrypoints: runtime, command, event, or task paths lead to the changed behavior without relying on guessed folder structure
- local reasoning: the relevant policy, invariants, callers, and failure behavior fit within a bounded trace instead of requiring repo-wide rediscovery
- domain ownership: names and owners match the business concept, with shared contracts owned at a real boundary
- interface depth: public surfaces hide meaningful policy and volatile detail rather than spreading caller knowledge
- explicit effects: consequential state changes, external calls, retries, and recovery are visible in the trace
- proof seams: focused commands or tests can falsify the behavior claim through a stable boundary
- bounded handoff: evidence can be summarized as entrypoint, owner, interface, effects, proof, and residual unknowns
- complexity drag: indirection, duplicated policy, speculative helpers, and dead branches do not inflate the reasoning path
- operability: timeouts, idempotency, backpressure, observability, and recovery are explicit where failure matters
- decision memory: durable, surprising tradeoffs are captured without documenting implementation trivia
- workflow fit: repository commands and ownership boundaries support efficient research, delegation, integration, and verification

## Good Review Questions

- Which modules are shallow wrappers instead of deep boundaries?
- From which real entrypoint does each important behavior begin, and where does its domain owner become clear?
- Where does understanding one concept require bouncing across too many files, types, or helper layers?
- Which interfaces leak internal choices into too many callers?
- Which side effects or failure states stay implicit until deep implementation reading?
- Where do tests lock down internals instead of behavior at a trustworthy proof seam?
- Can another agent continue from a bounded evidence packet, or must it repeat discovery?
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

Require each track to return a bounded evidence packet: real entrypoint, domain owner, interface crossed, consequential effects, proof seam, and residual unknowns where applicable.
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
