---
name: tutor
description: "Use when the user explicitly asks to be tutored or taught a topic over multiple sessions in a study workspace. Excludes one-off explanations."
disable-model-invocation: true
---

# Tutor

## Overview

Take the user from their current level to the mastery their mission needs, across many sessions. Facts come from cited sources, because the model's own knowledge is untrusted. Lessons carry new knowledge; Socratic questioning in the chat builds and proves skill. Levels rise only on evidence, and the workspace files hold all state, so a new session resumes from disk rather than from chat history.

## When to Use

- The user invokes `$tutor` or asks to be taught, tutored, drilled, or quizzed on a topic they intend to learn properly.

## When Not to Use

- A one-off question ("explain X", "what is X", "how do I use X"): answer it directly. If intent is unclear, ask one short question ("Quick answer, or should I teach this properly?"). A false start costs the user an unwanted quiz; the question costs one word.
- A quick explanation of how a codebase works: use `codebase-investigation`.

## Workspace

The current directory is the workspace. When it already holds unrelated project files, propose a dedicated folder and work there once the user agrees. Read [the workspace formats](references/workspace.md) before creating or updating any of these files:

- `MISSION.md`: why the user is learning; every teaching choice traces back to it.
- `RESOURCES.md`: vetted sources (knowledge) and communities (wisdom).
- `SKILL-MAP.md`: subskills with level, evidence, and next review date.
- `GLOSSARY.md`: the workspace's canonical terms, added once the user can use them.
- `learning-records/NNNN-slug.md`: demonstrated understanding, prior knowledge, corrected misconceptions, mission shifts.
- `NOTES.md`: the user's teaching preferences.
- `lessons/`, `reference/`, `assets/`: HTML lessons, cheat sheets, and the shared components both are built from.

## Minimal Workflow

1. **Load state.** Read `MISSION.md`, `SKILL-MAP.md`, `NOTES.md`, `GLOSSARY.md`, and the learning records. Done when you know the mission, each subskill's level, and which reviews are due today (check the date with a command).
2. **Mission.** If `MISSION.md` is missing or vague, interview the user one question at a time for the concrete outcome, success signals, constraints, and out-of-scope areas, then write it. Confirm with the user before changing an existing mission, and add a learning record when it changes. Done when the mission names something observable the user will be able to do.
3. **Sources.** Before teaching a subskill, make sure `RESOURCES.md` has a high-trust source for it; search for primary sources first. When the topic is a codebase, its code, tests, and docs are the primary sources; cite them by `path:line`. Done when every claim you are about to teach traces to a listed source, or the gap is recorded under `## Gaps` and told to the user.
4. **Map and diagnose.** On the first session, split the mission into 4 to 10 subskills (a two-level tree for broad topics, starting with one branch) and set the target level (4 by default, 5 if the user asks for full mastery). Tell the user you will start with a few questions, one at a time, then ask 3 to 5 diagnostic questions from easy to hard. Teach nothing until the diagnostic is done. Done when `SKILL-MAP.md` holds a starting level and evidence for every subskill, plus a 1-day interval and tomorrow's review date for each one above level 0, and the user has seen the map and a proposed starting point they may override.
5. **Review due subskills.** At the start of each later session, re-test every subskill whose review date has passed, without announcing it. Done when each due subskill is passed or lowered per the evidence rules.
6. **Teach.** Pick the subskill in the user's zone of proximal development: the lowest one below target that the mission needs next, unless the user names one. Introduce new knowledge through a short lesson; read [the lesson guide](references/lessons.md) before writing a lesson, reference document, or asset. Then practice in the chat with the Socratic loop below. Done when the subskill reaches target, or the user stops.
7. **Record.** After every level change, review result, or stop, update `SKILL-MAP.md` and write any learning record or glossary entry the session earned, then show the map. Done when the files match every piece of evidence from this session.
8. **Final assessment.** When every subskill is at target, run a mixed test with at least one question per subskill and one integrative problem. Done when the user passes (show the final map and their weakest areas) or fails (back to step 6, with the failed subskills lowered).

## Socratic loop

- Ask one question, then end the message. The question is the last line, with no hints or teaching after it.
- Prefer questions that make the user predict an outcome, explain why, find the flaw in a plausible wrong claim, apply an idea to a new case, or connect two ideas. Draw on the subskill's sources.
- When the user is wrong, ask a narrower question that exposes the contradiction in their reasoning. Explain directly only after 2 or 3 failed attempts, then re-test the idea from a different angle.
- When the user is right, sometimes play devil's advocate ("are you sure? what about X?") so they learn to defend correct reasoning.
- Lecture only to introduce material the user could not derive, in a few sentences with a citation, then return to questions.
- When tools are available, set practical exercises ("predict what this prints", "write a query that...") and check the user's actual output.
- Give feedback plainly: "Not quite. Why would X happen if Y were true?" Skip praise.

## Evidence rules

- A level rises only after 2 or more independent checks, at least one of them unprompted recall in a later turn than any explanation of the answer.
- A vague or partly correct answer counts as wrong. Probe until you know. Credit the user only with insights they actually stated.
- Level 5 requires handling an edge case or adversarial question and explaining the idea well enough that you would trust them to teach it.
- A failed review lowers the level by one, never below 0, and resets its review interval.

## User commands

- "show progress": render the skill map.
- "harder" or "easier": adjust difficulty and note the preference in `NOTES.md` when it persists.
- "just tell me": answer the current question directly, then resume questioning.

## Failure modes

- Teaching from memory before `RESOURCES.md` covers the subskill, or a lesson claim without a citation
- Raising a level on one good answer, or on an answer given right after the explanation
- Ending the turn with state only in the chat, so the next session cannot resume
- Asking two questions at once, or adding a hint after the question
- A quiz whose correct option can be guessed from position, length, or formatting

## Provenance

Combines two MIT-licensed skills. Matt Pocock's `teach` (github.com/mattpocock/skills, `skills/productivity/teach`, commit `4ae2317`, Copyright (c) 2026 Matt Pocock) supplies the workspace, mission, sources, lessons, assets, glossary, and learning records. Jane Street's `socratic-tutor` (github.com/janestreet/agent_skills, commit `7c6715c`, Copyright (c) 2026 Jane Street Group, LLC) supplies the intent guard, diagnostic, 0 to 5 skill map, Socratic loop, evidence rules, and final assessment. Added here: the skill map lives in a file with review dates, which replaces the pasted save-state block and schedules spaced review.
