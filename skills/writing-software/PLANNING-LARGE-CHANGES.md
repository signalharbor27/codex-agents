Read this when the change is too large to hold in one pass and needs a compact implementation plan.

Rules:
- start by documenting current reality before debating what to change
- choose the mode early:
  - greenfield: prototype or tracer-bullet unclear workflow, UX, or integration choices first
  - brownfield: inspect seams, invariants, migration order, and compatibility pressure first
- if design choices are genuinely unclear, resolve them before writing implementation steps
- plan in vertical slices, not layer-by-layer batches
- use inline plans for ordinary work; use a file-backed exec plan for large, multi-session, or multi-agent work
- grill the plan before execution:
  - light grill for small plans
  - hard grill for large, risky, or ambiguous plans
- make each phase independently verifiable where practical
- for each slice, capture: goal, owner (`main` or delegated), scope/files, dependencies, verification, and commit boundary when commits are expected
- make delegation explicit when tracks are independent enough to run in parallel
- capture decisions, interfaces, risks, and verification
- if the task is being committed, prefer one logical commit per completed slice or coherent checkpoint
- name what is explicitly out of scope so the plan does not sprawl
- avoid scripting every 2-5 minute action
- prefer stable contracts over file-by-file guesswork
- verify user corrections against code before updating the plan
- after drafting the plan, run [CHALLENGE-MODE.md](CHALLENGE-MODE.md) and revise before execution
