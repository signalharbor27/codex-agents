# Dependency-frontier grilling

Use this procedure whenever `grill-me` is selected, or when inspection under the current primary skill reveals several interdependent consequential choices that belong to the user and block safe progress. Keep one approval inline, keep routine choices agent-owned, and resolve factual uncertainty through the relevant research, review, or debugging workflow instead of manufacturing a decision.

The session is interactive and read-only. Inspect evidence, but do not change code, plans, artifacts, branch state, external services, or live state.

## Workflow

1. Establish the subject, agreed scope, and authority. Inspect the plan and directly relevant sources read-only; separate facts from genuine decision gaps.
2. Build a design tree containing only consequential user-owned decisions, their prerequisites, and dependent branches. Prune branches made irrelevant by settled answers.
3. If no consequential user-owned decision remains, say there is nothing material to grill and why. If discussion cannot settle a question, name the research, prototype, or other evidence needed and stop or seek a separately authorized transition; do not perform that work during the grill.
4. If the subject cannot fit one healthy session, propose a bounded subject and list the rest as explicit follow-up topics before asking the frontier. If continuity requires another session or a durable artifact, stop and request separate authorization for a handoff; do not silently write one or keep grilling into degraded context.
5. Find environmental facts from authoritative evidence. For independent or noisy factual prerequisites, use the minimum bounded set of read-only subagents, at most one per distinct track; never delegate user decisions. A pending fact closes only its dependent branches, so ask the unaffected frontier now.
6. Compute the frontier: every unsettled decision whose prerequisites are settled. Ask the whole frontier in one round by default. If the user explicitly requests sequential questioning, ask only the root-most eligible decision, breaking ties by downstream impact.
7. Make each question atomic. Assign stable session-wide IDs (`Q1`, `Q2`); label choices with their question (`Q1-A`, `Q1-B`) and keep both IDs unchanged if repeated. The user may answer outside the offered choices.
8. Give every question a recommendation and its key tradeoff:

   ```text
   ❓ **Q1. <title>**: <one decision question>
   - **Q1-A.** <option and material consequence>
   - **Q1-B.** <option and material consequence>
   ➡️ **Recommendation: Q1-A.** <reason and key tradeoff>
   ```

9. Stop after the round and wait. A question that depends on another question still open in this round belongs to a later round.
10. After each reply, record the decisions answered, retain unanswered IDs, and recompute the tree, frontier, options, and recommendations. The frontier is informed judgment, not a computed graph; if an answer exposes same-round coupling, defer or reopen the affected question in the next round. If an earlier answer changes, reopen or prune every affected descendant before the next round.
11. When the frontier is empty and no factual prerequisite is pending, summarize settled decisions, rejected consequential alternatives, material facts or blockers, verification expectations, and remaining explicit assumptions. Ask the user to confirm shared understanding; do not act on the outcome before confirmation, and do not treat confirmation alone as implementation authority.
12. If the user explicitly ends or replaces the grill, stop this procedure and route the new request under its own skill and authority. If a message only suggests scope expansion, identify the boundary and ask whether to add it; never expand the tree silently.

## Failure modes

- Asking one question by default instead of the whole settled frontier
- Asking downstream decisions before prerequisites settle, renumbering repeated questions, or mixing option labels
- Omitting recommendations or failing to recompute the tree after answers change
- Asking the user to find facts, launching duplicate or unbounded subagents, or blocking unaffected questions on one pending fact
- Continuing an oversized grill into degraded context instead of narrowing it or requesting an authorized handoff
- Grilling routine choices, manufacturing questions for an ungrillable task, or expanding scope silently
- Mutating state or acting before the confirmation and authority gates
