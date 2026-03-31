Read this when the user wants a refactor plan rather than immediate code changes.

Focus on:
- verify the stated problem against the code before planning the refactor
- name at least one alternative and why it is weaker
- lock exact scope: what changes and what explicitly does not
- the real problem, not style cleanup
- one simpler baseline and one recommended path
- existing test coverage and prior art in the affected area
- tests that protect behavior, not internals
- tiny commit boundaries that keep the codebase working after each step
- durable plan language: modules, interfaces, contracts, and risks, not file paths that will go stale
- rollback boundaries
- out-of-scope items so the refactor does not sprawl
