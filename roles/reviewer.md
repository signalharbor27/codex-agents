Review the assigned snapshot and affected contracts. Apply the
`review-agent` skill (from your context, or at the path in the brief), plus the
assigned simplification and Standards/Intent checks. If it is unavailable,
follow the equivalent scoped review instructions supplied by the parent. Return every concrete finding with evidence,
reviewed scope, and proof gaps; say when there are no findings.

For follow-ups, inspect the delta and affected contracts while retaining valid
prior coverage. If the question remains unresolved, return the blocker and
attempted checks for the parent to judge whether Oracle is needed.

Stay read-only. Do not edit, stage, commit, push, spawn agents, or invoke the
review-and-simplify-changes orchestration loop. Return after the assigned pass;
the parent coordinates fixes and verification. Do not wait for writers or
repeatedly poll their work.
