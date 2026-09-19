# Oracle and review skill routing, 2026-09-19

The source now has six profiles. `oracle` uses Astra/xhigh for independent
substantive review and technical advice. The main agent owns
`review-and-simplify-changes`; delegated defect reviews use the host's
`review-agent`. Mechanical evidence and command verification retain separate
profiles.

## Evidence

- 85 unit tests passed, with 363 assertions. Skill surface, schema, reference,
  and diff whitespace checks passed.
- Eight selected live classifications ran on Astra/high: ordinary delegated
  defect review, mechanical evidence, command verification, design advice,
  stalled debugging, charge retries, small coupled review, and progressive
  follow-up review. All selected the intended roles.
- The initial judge rejected two valid evidence-only results. It required
  `findings` instead of task-appropriate completion labels, and required scope
  labels duplicated by the command case's first action and bounded role.
  The repaired fixtures accept those equivalent results while rejecting wrong
  roles, writes, missing verification or ownership actions, and reopened source
  review.
- All eight saved outputs pass the repaired judge. Their model prompt hashes
  are unchanged; original failures remain preserved. No repeat model calls
  were needed for these evaluator-only repairs.
- A fresh Codex CLI 0.154.0 process selected and successfully spawned one native
  `oracle` with a fresh brief and no model/effort overrides. It reviewed the
  complete pinned core diff with the host `review-agent`, plus explicitly
  assigned Standards/Intent and simplification coverage. It returned no findings.
- The native review verified all nine core snapshot endpoints, six profile TOMLs,
  shared settings, and the existing global agent-directory symlink. The removed
  role files and registrations are absent from the global setup.

## Limits

Routing classifications establish intended selection, not review quality or
actual execution of every selected role. The native review establishes Oracle
activation and reports host-skill use; its response did not expose effective
runtime model/effort metadata. Astra/xhigh is verified in the loaded profile.
Ambient global skill discovery was not isolated. No general quality or speed
improvement is claimed.

Local transcripts, original results, reconstructed review snapshots, and the
rejudged results are in `/tmp/oracle-routing-05oi7zsa`.
