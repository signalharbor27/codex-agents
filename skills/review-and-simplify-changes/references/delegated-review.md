# Review roles and delegation

Read this before assigning review tracks. Independent subagents perform review and simplification; the main agent owns the review/fix loop, coverage accounting, and completion decisions.

## Select the role

- The main agent runs `review-and-simplify-changes`, assigns each material check, collects reviewer results, resolves findings, and coordinates authorized fixes and verification. Every initial, fix, and integration review requires independent subagent coverage.
- Use `reviewer` for delegated correctness, contract, Standards/Intent, or architectural judgment. For defect review, give it the host's `review-agent` skill as described below.
- Use `fast_reviewer` for bounded mechanical evidence such as unused code, dependency cycles, or stale comments. It does not substitute for substantive review.
- Use `verifier` for command-backed acceptance evidence. A passing command does not close source-review findings or uncovered requirements; honor the task's mutation limits when choosing checks.

For each substantive review, assign correctness, simplification, and Standards/Intent checks to `reviewer` subagents. Use separate instances for independent tracks and run them alongside relevant mechanical checks when capacity permits. One instance may cover a small coupled change. Give affected risk tracks explicit invariants and failure paths to inspect:

- Permission enforcement, trust boundaries, or tenant isolation.
- Financial calculations, balances, billing entitlements, or invariants that prevent lost, duplicated, or misattributed money.
- Concurrent or retried state transitions where ordering, atomicity, idempotency, or recovery determines correctness.
- Material proof risks where implementation and tests could share a wrong assumption about inputs, setup, or the observed event. Assign the reviewer to challenge that assumption using `engineering/references/proof.md`.
- Destructive migrations, data recovery, rollback guarantees, or compatibility while old and new versions coexist.
- A material correctness dispute that remains unresolved after ordinary review despite concrete competing evidence.

Choose risk tracks from changed behavior and contracts. Directory names or display wording alone do not create financial or security review work. Low-risk changes still need an independent reviewer. A task explicitly limited to mechanical evidence or command execution uses its corresponding role and does not establish substantive review coverage.

On follow-ups, send fixes and affected contracts back to the selected reviewer; preserve valid earlier coverage. Use a fresh or bounded brief when spawning a custom role so its model and effort settings apply. If the named role is unavailable, use an independent read-only agent with equivalent capability and effort and disclose the fallback; do not automatically upgrade to Oracle. Report blocked coverage if no suitable reviewer is available; main-agent review cannot close it. Reviewers do not dispatch further agents.

Use `oracle` only when the user explicitly requests it or investigation or ordinary review remains stuck on a concrete blocker. Include the unresolved question, attempted checks, and conflicting evidence. Risk or complexity alone does not require an Oracle.

Reviewers return after their assigned pass. The parent coordinates fixes; `verifier` runs acceptance checks. Do not keep reviewers polling writers or managing the fix loop. Reuse a reviewer while its context helps; when it becomes dominated by old work, start a fresh reviewer with the current delta, unresolved findings, and a concise record of valid coverage.

## Delegate the selected track

- Discover the built-in `review-agent` skill in the current host and give defect reviewers its actual path. Read it before dispatch. It is host-provided; do not assume this repository installs it or hard-code a home directory. If unavailable, give an available reviewer equivalent read-only instructions from this brief.
- Assign reviewers who did not implement the changes or fixes they judge. A verifier supplies command evidence separately.
- Supply intent, applicable rules, exact base and reviewed snapshot, the current target, owned paths or concern, prior findings and dispositions, and required evidence. For follow-ups, provide the delta since the previous reviewed snapshot and enough original context to verify fixes and affected contracts. Keep review inputs stable or isolate a snapshot; later writes remain unreviewed.
- Include the original requested outcome, consequential interpretations, material contracts and assumptions, and what the supplied proof establishes or leaves uncertain. Give reviewers paths or excerpts from original evidence so they can challenge the implementer's summary. Distinguish an experiment's limits from conclusions about the requested outcome.
- Include the assigned checklist criteria and relevant skill/reference paths in each brief. Require complete coverage of that track, with findings or an explicit account of checks completed and proof gaps.
- Require inspection of the complete assigned diff and affected callers and tests. Return every concrete, actionable defect introduced by the target change, including a fix that failed to resolve an earlier defect. Confirm scenarios from code and distinguish intentional behavior from regressions. Continue after the first finding; omit speculative concerns and style nits.
- Reviewers stay read-only and do not delegate or invoke the orchestration gate. Use the built-in's severity-ordered findings format when available; retain evidence, a precise changed location, and material test gaps. `No findings.` is valid after completing the assigned coverage.
- The built-in owns defect review. Explicitly assign simplification and Standards/Intent checks to suitable subagents too, including missing requirements that have no changed line to cite. Collect their coverage separately; the main agent accounts for it. A defect-only `No findings.` does not close these topics.
- Reuse a reviewer for fix follow-ups when its earlier context helps. Use fresh independent review when material risk or invalidated assumptions justify it. Collect all required tracks, reconcile findings, apply supported fixes centrally, and dispatch the next scoped pass.
