---
name: codebase-investigation
description: "Use when explaining how a codebase works or investigating why a design was chosen. Excludes direct symbol lookups, defect diagnosis, implementation requests, and architecture audits."
---

# Codebase investigation

Answer a concrete question about current behavior or recorded design rationale. Investigation is read-only unless the user separately authorizes changes. Keep implementation with engineering, unknown failures with debugging, and architecture audits with their review owner.

## Answer what was asked

Answer the explicit question first. Propose a design, plan, or product idea only when the user asks for one; a stated interest such as "I want something similar" is context, not a new task. When the request sets an acceptance bar, such as replicate, verify, or match a reference exactly, run to that bar or name the single blocker.

## Inventory the evidence

Before answering, list every evidence source that could bear on the question, then read each one or rule it out with a reason: unavailable, outside the question, or unable to change the answer.

- Code: trace the entrypoint end to end through calls, data, state ownership, and external boundaries, plus the callers, consumers, tests, and configuration that change the meaning.
- Runtime and data: logs, metrics, production or analytics data, and vendor dashboards reachable through available read-only tools or credentials. Read production data only through bounded, plain read-only queries within existing authority.
- External documentation: the vendor's or library's docs and guides for the version in use, read in full for the relevant section. A search excerpt locates a source; it does not count as reading it.
- History: commits, pull requests, issues, and design notes when rationale matters.

A direct location or symbol question usually needs only a local lookup. Substantial independent angles may justify an explorer; external documentation or historical records may justify a librarian. Give each a bounded question and required evidence. Keep synthesis with the main agent. Avoid fixed panels and delegation that adds no independent evidence.

Distinguish:

- Current behavior supported by code or a relevant executed observation.
- Recorded intent supported by contemporaneous documents or discussion.
- Inferences, with their supporting facts and remaining alternatives.
- Unknowns or contradictions that the available sources cannot resolve.

Cite concrete paths and symbols for code claims, and permalinks or identifiers for external records. Include the relevant revision or date when a source may describe a different state. Reading a test establishes its expectations; claim it passes only with applicable execution evidence.

## Conditional depth

- For historical rationale, disputed intent, or previous failed approaches, read [historical-evidence.md](references/historical-evidence.md).
- For a requested walkthrough or teaching explanation, read [teaching.md](references/teaching.md).

## Completion

Done when every inventoried source is read or ruled out and each claim is supported or labeled as inference or unknown. Lead with the answer, then the shortest supporting trace and any material caveat. End with an evidence line: what was read (files, doc pages with versions, queries, data sources) and what was ruled out and why. Report a skimmed or partial read as partial.

Preserve unresolved contradictions. Do not turn a plausible explanation into recorded intent or a repair recommendation into an authorized edit. Name the next source or observation only when it could materially resolve the remaining uncertainty.

## Provenance

Inspired by pstack's [how](https://github.com/cursor/plugins/blob/6ed0f7a9504f577d7529064103cecce9be7dfc5e/pstack/skills/how/SKILL.md), [why](https://github.com/cursor/plugins/blob/6ed0f7a9504f577d7529064103cecce9be7dfc5e/pstack/skills/why/SKILL.md), and [teach](https://github.com/cursor/plugins/blob/6ed0f7a9504f577d7529064103cecce9be7dfc5e/pstack/skills/teach/SKILL.md), v0.15.2. Adapted as one Codex investigation owner.
