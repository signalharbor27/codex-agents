# Review roles and delegation

Read this before assigning review tracks. Independent subagents perform review and simplification; a `refiner` applies clear Standards fixes; the main agent owns the review/fix loop, coverage accounting, and completion decisions.

## Select the role

- The main agent runs `review-and-simplify-changes`, assigns each material check, collects reviewer results, resolves findings, and coordinates authorized fixes and verification. Every initial, fix, and integration review requires independent subagent coverage.
- Use `reviewer` for delegated correctness, contract, Standards/Intent, or architectural judgment. For defect review, give it the host's `review-agent` skill as described below.
- Use `design_reviewer` on the first full pass for the second model family's review of abstractions, boundaries, interface depth, and simplification; it still reports correctness defects. It does not review fix or delta passes.
- Use `oracle` (both seats) and `judge` when the lane or a stuck review calls for them, as described below.
- Use `fast_reviewer` for bounded mechanical evidence such as unused code, dependency cycles, or stale comments. It does not substitute for substantive review.
- Use `refiner` only to apply accepted `fix: clear` Standards findings of either origin. It never reviews, and its edits always get a delta review from a different read-only reviewer.
- Use `verifier` for command-backed acceptance evidence. A passing command does not close source-review findings or uncovered requirements; honor the task's mutation limits when choosing checks.

For each substantive review, assign correctness, simplification, and Standards/Intent checks to `reviewer` subagents per the lane chosen in `SKILL.md`. One instance covers a coupled change; use separate instances only for independent tracks, alongside relevant mechanical checks when capacity permits. Give affected risk tracks explicit invariants and failure paths to inspect:

- Permission enforcement, trust boundaries, or tenant isolation.
- Financial calculations, balances, billing entitlements, or invariants that prevent lost, duplicated, or misattributed money.
- Concurrent or retried state transitions where ordering, atomicity, idempotency, or recovery determines correctness.
- Material proof risks where implementation and tests could share a wrong assumption about inputs, setup, or the observed event. Assign the reviewer to challenge that assumption using `engineering/references/proof.md`.
- Destructive migrations, data recovery, rollback guarantees, or compatibility while old and new versions coexist.
- A material correctness dispute that remains unresolved after ordinary review despite concrete competing evidence.

For the large-change lane, brief one `design_reviewer` for `improve-codebase-architecture` and one `reviewer` for `improve-test-suite`, each with the skill's host path, the touched subsystems as the boundary, read-only authority, and the Standards scope and tags. Each returns supported findings, not a plan, and does not delegate.

Choose risk tracks from changed behavior and contracts. Directory names or display wording alone do not create financial or security review work. Low-risk changes still need an independent reviewer. A task explicitly limited to mechanical evidence or command execution uses its corresponding role and does not establish substantive review coverage.

On follow-ups, send fixes and affected contracts back to the selected `reviewer`; preserve valid earlier coverage. Launch each role as its brief (`~/.agents/briefs/<role>.md`) describes, with a fresh or bounded assignment, so its model family and effort apply. If the role's model is unavailable, follow the global instructions' unavailable-model rule: no other model substitutes, and the seat's coverage is blocked; `design_reviewer` never runs on a GPT model. Do not automatically upgrade to Oracle. Report blocked coverage if no suitable reviewer is available; main-agent review cannot close it. Reviewers do not dispatch further agents.

Use `oracle` when the lane in `SKILL.md` calls for it, when the user explicitly requests it, or when investigation or ordinary review remains stuck on a concrete blocker. Launch both seats in parallel with the same assignment; neither sees the other's answer. For a stuck review, include the unresolved question, attempted checks, and conflicting evidence. Size or complexity alone does not require an Oracle. A `judge` reconciles the two answers whenever they disagree and always on a one-way door: it checks each disputed or single-seat claim against repository evidence and returns it as accepted, rejected, or unproven. The main agent still judges the results as findings.

## Run the `design_reviewer` pass

When the lane in `SKILL.md` calls for it, launch one `design_reviewer` on the first full pass alongside the `reviewer` subagents, with the same pinned snapshot, Intent digest, both Standards paths, and the `review-agent` path. Assign it abstractions, boundaries, interface depth, duplicated knowledge, needless layers, and simplification; it reports any correctness defect it finds as well. It supplements the `reviewer` coverage and cannot replace it; if its named model cannot run or the pass fails, report design coverage as blocked. Delta and fix passes go to `reviewer` only.

## Run the blast-radius pass

On a one-way door or hot path, brief the one-way `reviewer` (or a separate `reviewer`) to follow the installed `blast-radius` skill's SKILL.md: name the one fact the change is safe because of, then prove it, by running code where possible and otherwise by tracing every caller, writer, and deploy state it depends on. An unproven safety fact is an open finding.

## Dispatch

Discover active subagent capacity before dispatch. Start independent reviewers together when slots are available; otherwise run bounded waves. Dispatch reviewers in the background and keep working on independent tasks: verification gates, PR description, UI evidence, the next slice. Collect every result before commit or handoff. If no suitable independent agent is available, report blocked review coverage.

Reviewers return after their assigned pass. The parent coordinates fixes; `verifier` runs acceptance checks. Do not keep reviewers polling writers or managing the fix loop. Reuse a reviewer while its context helps; when it becomes dominated by old work, start a fresh reviewer with the current delta, unresolved findings, and a concise record of valid coverage.

## Delegate the selected track

- Give defect reviewers the `review-agent` skill and read it before dispatch. When the reviewer does not preload it, pass the host's actual path; do not hard-code a home directory. If the host lacks it, give an available reviewer equivalent read-only instructions from this brief.
- Assign reviewers who did not implement the changes or fixes they judge. A verifier supplies command evidence separately.
- Supply intent, applicable rules, exact base and reviewed snapshot, the current target, owned paths or concern, prior findings and dispositions, and required evidence. For follow-ups, provide the delta since the previous reviewed snapshot and enough original context to verify fixes and affected contracts. Keep review inputs stable or isolate a snapshot; later writes remain unreviewed.
- Include the original requested outcome, consequential interpretations, material contracts and assumptions, and what the supplied proof establishes or leaves uncertain. Give reviewers paths or excerpts from original evidence so they can challenge the implementer's summary. Distinguish an experiment's limits from conclusions about the requested outcome.
- Include the assigned checklist topics, both Standards paths (`references/coding-standards.md` at its host path and the repo-root `CODING_STANDARDS.md` when present, repo winning on conflict), and relevant skill/reference paths in each brief. Standards scope and finding tags follow `coding-standards.md` under "Classify each finding". Require complete coverage of that track, with findings or an explicit account of checks completed and proof gaps.
- Require each substantive reviewer to classify the change's Merge danger (door and blast radius) from `describe-pr/references/merge-danger.md` at its host path and report it with the deciding effect, independent of any PR footer.
- Require inspection of the complete assigned diff and affected callers and tests. Return every concrete, actionable defect introduced by the target change, including a fix that failed to resolve an earlier defect. Confirm scenarios from code and distinguish intentional behavior from regressions. Continue after the first finding; omit speculative concerns and style nits.
- Reviewers stay read-only and do not delegate or invoke the orchestration gate. Use the built-in's severity-ordered findings format when available. Each finding gives file and symbol, checklist topic or standard, issue, recommended fix, confidence, evidence, and validation needed; each Standards finding also carries its `origin` and `fix` tags. `No findings.` is valid after completing the assigned coverage; retain its proof gaps.
- The built-in owns defect review. Explicitly assign simplification and Standards/Intent checks to suitable subagents too, including missing requirements that have no changed line to cite. Collect their coverage separately; the main agent accounts for it. A defect-only `No findings.` does not close these topics.
- Reuse a reviewer for fix follow-ups when its earlier context helps. Use fresh independent review when material risk or invalidated assumptions justify it. Collect all required tracks, reconcile findings, apply supported fixes centrally, and dispatch the next scoped pass.
