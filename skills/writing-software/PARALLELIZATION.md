Read this when the work is large enough that bounded subagents can preserve context or unblock independent tracks.

Use subagents for isolation and parallelism, not for ceremony.

Good fits:
- context-heavy research that can run while the main thread plans
- independent tracks such as docs, tests, fixtures, or UI polish
- separate code areas with disjoint write scopes
- isolated review of a plan or diff before integration
- grouped research tracks such as "where it lives", "how it works", and "similar patterns"

Bad fits:
- tiny edits
- tightly serial work where the next step depends on the last result
- vague delegation with no clear output
- overlapping write scopes that will create merge churn
- one subagent per question when several questions touch the same area and should be grouped

Before delegating:
- read directly mentioned inputs in the main thread first
- group related questions by code area or purpose instead of 1:1 question-to-agent mapping
- make different agents search different areas or answer different kinds of questions

When planning delegated work, record:
- owner: `main` or delegated
- exact files or module boundary
- expected output
- dependencies on earlier slices
- integration point back into the main thread

The main thread still owns:
- final decisions
- synthesis across delegated findings
- integration
- verification and completion claims
