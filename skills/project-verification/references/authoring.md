# Author a runnable recipe

Start with existing project guidance, launch scripts, representative tests, and the public surface being verified. Trace only enough implementation to establish the setup and expected effects. Resolve missing commands from repository evidence before inventing a wrapper.

Choose one representative path that crosses the actual application boundary. Record its input, expected visible result, and relevant persisted or downstream effect. A process starting successfully is sufficient only when startup itself is the requested behavior.

## Instance and state

Document how the runner proves that the instance belongs to this run and uses the intended build. Use evidence appropriate to the project: launcher-owned handles, process start identity and workspace, a run-specific token, or build metadata tied to the launched artifact. A PID alone can be reused; a revision string alone can omit local edits or a stale build. Include relevant dirty inputs or artifact identity when they affect the claim.

Use a unique state directory, database namespace, account, or equivalent existing isolation facility. Derive runtime endpoints from the owned launch when possible. A collision or identity mismatch must produce a useful failure without driving or killing the unknown instance. Recheck identity before cleanup when ownership could have changed.

Bound readiness waits and capture startup failure output. Specify required credentials by their approved source or variable name, never their value. A missing service or credential yields a blocked path with the exact prerequisite.

## Project artifact

Use the repository's established format. Include executable commands or tool actions, observable assertions, evidence locations, and cleanup instructions. References to existing project scripts avoid copying their internals. For a feature map, associate each claimed behavior with its recipe and execution status; leave inferred coverage explicitly unexercised.

Capture evidence before cleanup in a location the cleanup does not remove. Include exit status, relevant output, instance/build identity, and any screenshot or state observation needed to support the result. Limit artifacts to necessary data and redact credentials. Verify that the evidence remains readable after cleanup.

Exercise the representative path through the fresh-agent check in the entrypoint. Also probe material hazards introduced by the recipe, such as attaching to the wrong instance or cleaning up after launch failure. Use isolated fixtures when a real dependency is unavailable, and name the limits of what those fixtures prove.
