# Maintain verification evidence

Compare the requested part of the map with current entrypoints, launch tooling, and expected behavior. Reuse evidence only after checking that the relevant revision, configuration, dependencies, and state remain applicable. Source inspection can identify likely coverage; label it separately from execution.

Classify a failure before editing:

- Documentation drift: the product's intended behavior still works, but the recipe names a stale command, selector, prerequisite, or observation. Update the instructions and execute the affected path.
- Harness gap: setup, isolation, ownership checks, observation, or cleanup prevents trustworthy verification. Repair the harness within scope and demonstrate both the failure it catches and normal execution.
- Product regression: the real path violates its intended contract. Preserve the failing evidence and report or route the repair under existing authority. Do not lower the recipe's expectation to make the regression pass.

Use the smallest discriminating observation when the category is uncertain. A timeout may mean a changed selector, an unavailable dependency, or broken behavior. Record uncertainty until evidence settles it.

For audit-only requests, return proposed changes and evidence without editing files or mutating application state. For authorized maintenance, change the affected recipe or harness, retain surviving evidence, and use the entrypoint's fresh-agent check for material changes. Unreachable paths remain blocked; missing coverage remains unexercised.

Finish with the changed coverage, remaining failures, and evidence invalidation conditions. Keep durable history in the project's existing artifact when needed; avoid creating a separate reporting system for a small repair.
