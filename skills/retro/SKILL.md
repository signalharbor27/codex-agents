---
name: retro
description: "Use when the user explicitly asks for a retrospective on agent sessions or PR reviews to find environment fixes such as checks, hooks, standards, pointers, access, or pruning. Not for reviewing a code diff."
disable-model-invocation: true
---

# Retro

## Overview

A retrospective turns evidence from past sessions and PR reviews into changes to the agent **environment**: checks, hooks, coding standards, navigation pointers, information access, tooling, and always-loaded instructions. It is not a review of product code. The output is a ranked list of candidate fixes, each with evidence and an owner. Zero lessons is a valid result.

Work is read-only: reading logs and PR data and writing digests and the report outside the repositories. Implementing candidates needs the user's authorization for the specific changes.

## Steps

1. Load the `writing-for-agents` skill when available, and read [session lessons](../writing-skills/SESSION-LESSONS.md). Together they decide where a lesson belongs and how it is phrased.
2. Pin the **window** and **sources** before reading anything. Default: the last 7 days of top-level sessions under `~/.claude/projects` and `~/.codex/sessions`. Use the current session alone when the user says "this session". Include PR reviews in the window's repositories unless the user opts out. State the window, roots, and repositories in one line. Read [sources](references/sources.md) for extractor usage, bounded raw-log reads, and PR review queries.
3. **Inventory** the environment that owns the fixes: global instructions, project `AGENTS.md` files, memory indexes, the skill catalog, hooks and settings, and each repository's check commands (package scripts, CI workflows, pre-commit). Record the word count of every always-loaded file. Read a destination before you recommend an edit to it.
4. Extract bounded digests with `scripts/extract.py`. Raw logs are read only through the digests' `L<n>` line pointers. On a shared or production host, run it under `nice -n 19` with the default memory cap.
5. Analyze every digest in the window. When the window holds more than about 15 sessions or 300 KB of digests, fan out read-only analysts over size-balanced batches, using [the analyst brief](references/analyst-brief.md). Personally verify each high-severity claim against its raw-log line.
6. Shape each **candidate**:
   - category and severity (high, med, or low, by time or risk cost)
   - one-line finding and recurrence count ("4 sessions")
   - evidence as session id, timestamp, and a short quote, marked verified or inferred
   - owner file, check, or hook
   - the change, and whether it adds or removes always-loaded text (roughly how many words)

   Merge duplicates across batches. Two analysts who read the same evidence count as one source. Drop candidates that would change no consequential decision, action, or completion claim.
7. Write `<out>/RETRO.md` with the window, the method, the always-loaded budget, candidates by severity, and a suggested order. Present the candidates to the user by severity. The step is complete when every digest has been read and every candidate names its evidence, owner, and load delta.

## Categories, in fix priority

Prefer the highest category that can hold the fix.

1. **Automated checks and hooks.** A mechanical mistake (a fixed pattern, a banned call, a file-location rule, a destructive command) gets a deterministic check: a lint rule, a test, a pre-commit hook, a CI job, or a PreToolUse hook. Check the repository's existing commands first. An existing check that is unwired, broken, or slow is the finding. So is a repository with no guardrail at all.
2. **Coding standards.** A judgement-call violation that review missed goes into the repository's `CODING_STANDARDS.md`, or into the global [coding standards](../review-and-simplify-changes/references/coding-standards.md) when it holds across repositories. Clarify or delete rules that misfire. Standards are read during review, never in implementer briefs or `AGENTS.md`: the implementer carries the most context pressure, while the reviewer works from a diff, so review catches what implementation cannot.
3. **Navigation.** The agent spent a long time finding a file, fact, or hidden dependency. Add one pointer line in `AGENTS.md` or in the doc that should have led there.
4. **Information access.** The agent lacked logs, read-only access, dashboards, or third-party data, or rebuilt the same access by hand in several sessions. Add a script or documented access path.
5. **Tool economy.** Token-heavy outputs, repeated failing commands, slow wait loops, or subagent fan-out larger than the task needed. Fix the tool, its defaults, or the guidance that causes it.
6. **Pruning.** Steering that changed nothing (no-ops), steering that caused over-asking or ceremony the user pushed back on, stale sediment, and always-loaded bloat. Move it to a check, doc, or skill, or delete it.

Corrections from the user (repeating, overriding, "I told you") are evidence. Map each one to the category of the fix that would have prevented it.

## Owners

- `AGENTS.md` and global instructions load on every turn. Keep them for navigation pointers and rules that apply to every task.
- `CODING_STANDARDS.md` is read only by review.
- Docs hold reference material and are reached through pointers. Look for an existing doc before writing a new one.
- Skills hold workflows. Every description costs catalog context, so a rarely used skill should become user-invoked or be removed.
- Memory files carry the user's cross-cutting preferences. Subsystem incident notes belong in docs.

## Failure modes

- Reading raw logs whole instead of through digests and line pointers
- Candidates without session and timestamp evidence, or without an owner
- Writing a prose rule for a mistake a check could catch
- Putting coding standards into implementer guidance
- Inventing lessons to fill the report, or counting repeated analyst claims as independent
- Editing environment files before the user authorizes the specific change

Source basis: Matt Pocock's `retro` skill (github.com/mattpocock/skills, `skills/engineering/retro`, commit `d81f3a1`, MIT License, Copyright (c) 2026 Matt Pocock). Adapted, not copied: categories reordered by fix priority, multi-session extraction and analyst fan-out added, and evidence, owner, and load-delta required per candidate. The extraction and batching method comes from the user's 2026-10-02 retrospective.
