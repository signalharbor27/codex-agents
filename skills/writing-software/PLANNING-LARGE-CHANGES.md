Read this when the change is too large to hold in one pass and needs a compact implementation plan.

Rules:
- start by documenting current reality before debating what to change
- if design choices are genuinely unclear, resolve them before writing implementation steps
- plan in vertical slices, not layer-by-layer batches
- make each phase independently verifiable where practical
- for each slice, capture: goal, owner (`main` or delegated), scope/files, dependencies, and verification
- make delegation explicit when tracks are independent enough to run in parallel
- capture decisions, interfaces, risks, and verification
- name what is explicitly out of scope so the plan does not sprawl
- avoid scripting every 2-5 minute action
- prefer stable contracts over file-by-file guesswork
- verify user corrections against code before updating the plan
- if the plan still feels ambiguous, run [CHALLENGE-MODE.md](CHALLENGE-MODE.md)
