# Historical evidence

Use this reference when the answer depends on why a choice was made, which constraint motivated it, or why an earlier fix failed. Current code establishes present behavior; historical motivation needs historical evidence.

Start from the relevant implementation and trace its introduction or meaningful change. Use available local history, then follow material links to commits, issues, pull requests, design notes, or release documentation. Check source availability before assuming a particular CLI or connector. Query relevant sources only; an unanswered question does not require a sweep of every communication system.

When a pull request's review discussion matters, retrieve inline review comments and their thread context explicitly. A PR description or top-level conversation may omit the decisive exchange. Tie quotations to their date, revision, author, and location where available. Read existing conversations only within authorized access; research does not authorize contacting people, publishing tickets, or sending messages.

Separate the original proposal from the final merged decision. Check whether a cited constraint still exists in current code or supported environments. A later retrospective may explain today's interpretation but does not by itself establish the original reason. Treat a user's suggested rationale as a hypothesis and follow contradictory records.

Report direct evidence before inference. If records conflict, identify which claim each supports and what remains unsettled. An unavailable review thread is unknown evidence, not proof that no rationale existed. If the relevant history was squashed or lost, explain the limit and keep any reconstruction labeled as inference.

When another task needs this evidence, return a bounded account of the decision, supporting sources, current applicability, and open uncertainty. Leave repairs and architectural choices with that task's existing owner.
