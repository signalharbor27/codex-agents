# Retro analyst brief

Fill in the bracketed fields and send the same brief to every analyst. Each analyst gets one batch of digests. Balance the batches by digest size, and give the largest sessions an analyst of their own.

---

Goal: find how the agent environment should change so that future sessions go better. This is not a review of product code.

Environment that owns the fixes: [global instruction sources and where they generate to; skill roots; agent roles; hooks and settings; project `AGENTS.md` files and their docs; memory indexes; tooling, CLIs, and MCP servers].

Inputs: [digest directory]. Your batch: [sNNN list]. Each digest has header stats, the user's messages with timestamps, hook and guard blocks, and a sample of tool errors. Each entry cites `L<n>`, a line in the raw log named on the digest's `file:` line. `index.tsv` has one row per session.

Reading rules:
- Read every assigned digest in full.
- When a digest hints at a problem, open the raw log around the cited line with bounded commands: `sed -n 'a,bp' <file> | cut -c1-1500`, or `grep -n <phrase> <file> | head -20`. Problem hints include the user correcting, repeating, overriding, or showing frustration ("why did you", "I told you", "stop", the same request again), runs of errors, hook hits, and repeated compactions.
- Never print a whole raw log; some exceed 100 MB. Read one file at a time; the host may be shared or serve production.
- You are read-only. The only file you write is your findings file.

Categories, in fix priority (prefer the highest one that can hold the fix):
1. Automated checks and hooks: a mechanical mistake that a lint rule, test, pre-commit hook, CI job, or PreToolUse hook could catch. This includes an existing check that is unwired, broken, or slow.
2. Coding standards: a judgement-call violation that review missed. Standards belong to review, not to implementer guidance.
3. Navigation: the agent struggled to find a file or fact that one pointer would have led to.
4. Information access: the agent lacked logs, read-only access, or third-party data, or rebuilt the same access by hand.
5. Tool economy: token-heavy outputs, repeated failing commands, slow loops, or oversized subagent fan-out.
6. Pruning: steering that changed nothing, steering that caused over-asking or ceremony, stale sediment, and always-loaded bloat.
User corrections are evidence. Map each to the fix that would have prevented it.

Output: write [digest directory]/findings-[batch].md, one entry per candidate:
- category, severity (high, med, or low, by time or risk cost), one-line finding
- evidence: session id, timestamp, and `L<n>`, plus a quote of at most two lines. At least one per entry, each marked verified (you read the raw line) or inferred
- the proposed change and its owner (file, skill, check, or hook), and whether it adds or removes always-loaded text

Merge duplicates within your batch and note recurrences ("3 sessions"). Skip one-off product bugs unless the environment would have prevented them. If the extractor misreports something (a false error or a missed block), list it under "Extractor notes". Zero findings is a valid result.

Final message: a summary of the top findings in at most 200 words.
