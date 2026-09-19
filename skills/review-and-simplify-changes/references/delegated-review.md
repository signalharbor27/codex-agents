# Review roles and delegation

Read this before choosing local or delegated review. The main agent owns the review/fix loop, coverage, and completion decisions.

## Select the role

Dispatch `oracle_reviewer` without waiting for a request when changed behavior or a data contract affects any of these:

- Permission enforcement, trust boundaries, or tenant isolation.
- Financial calculations, balances, billing entitlements, or invariants that prevent lost, duplicated, or misattributed money.
- Concurrent or retried state transitions where ordering, atomicity, idempotency, or recovery determines correctness.
- Destructive migrations, data recovery, rollback guarantees, or compatibility while old and new versions coexist.
- A material correctness dispute that remains unresolved after ordinary review despite concrete competing evidence.

Name the affected invariant and assign one bounded oracle track to that risk, even for a small diff. Use `reviewer` for ordinary correctness and contracts, and `fast_reviewer` only for mechanical evidence. Repository size, a finance/auth directory name, display-only changes, or a passing mention of these topics do not trigger oracle review. When a risk is discovered during standard review, escalate that track and continue independent work.

On follow-ups, send fixes and affected contracts back to the selected reviewer; preserve valid earlier coverage. If the named role is unavailable, use an independent read-only agent with equivalent capability and effort and disclose the fallback. Report blocked coverage if no suitable reviewer is available. Reviewers do not dispatch further agents.

## Delegate the selected track

- Discover the built-in `review-agent` skill in the current host and give defect reviewers its actual path. Read it before dispatch. It is host-provided; do not assume this repository installs it or hard-code a home directory. If unavailable, give an available reviewer equivalent read-only instructions from this brief.
- Assign a reviewer who did not implement the substantial slice being judged. A verifier supplies command evidence separately.
- Supply intent, applicable rules, exact base and reviewed snapshot, the current target, owned paths or concern, prior findings and dispositions, and required evidence. For follow-ups, provide the delta since the previous reviewed snapshot and enough original context to verify fixes and affected contracts. Keep review inputs stable or isolate a snapshot; later writes remain unreviewed.
- Require inspection of the complete assigned diff and affected callers and tests. Return every concrete, actionable defect introduced by the target change, including a fix that failed to resolve an earlier defect. Confirm scenarios from code and distinguish intentional behavior from regressions. Continue after the first finding; omit speculative concerns and style nits.
- Reviewers stay read-only and do not delegate or invoke the orchestration gate. Use the built-in's severity-ordered findings format when available; retain evidence, a precise changed location, and material test gaps. `No findings.` is valid after completing the assigned coverage.
- The built-in owns defect review. Account separately for simplification and Standards/Intent coverage, including missing requirements that have no changed line to cite. Assign those concerns explicitly or cover them in the main agent. A defect-only `No findings.` does not close uncovered topics.
- Reuse a reviewer for fix follow-ups when its earlier context helps. Use fresh independent review when material risk or invalidated assumptions justify it. Collect all required tracks, reconcile findings, apply supported fixes centrally, and dispatch the next scoped pass.
