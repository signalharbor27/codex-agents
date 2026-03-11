Read this when the work is large enough that chat alone is not a reliable source of truth.

Use a local exec-plan file for:
- multi-session work
- multi-agent work
- repo-wide review or migration work
- plans likely to survive compaction or handoff

Location:
- active plans: `docs/exec-plans/active/`
- completed plans: `docs/exec-plans/completed/`

Default:
- keep the file local and update it as work progresses
- commit only when the plan has durable team value or is part of the deliverable

Minimum contents:
- scope
- current findings
- durable decisions
- slices with owner, scope, dependencies, verification, and optional commit boundary
- current status
- next slice
- blocked or deferred items

Rules:
- update the file when a slice completes, scope changes, or the work is blocked
- when commits are part of the task, record the intended logical commit boundaries in the plan
- prefer coherent slice commits over large mixed commits
- keep it terse and execution-oriented
- do not turn it into a giant design essay
- make it good enough for a fresh session to resume safely
