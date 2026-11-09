# Workspace formats

Formats and upkeep rules for the files in a tutoring workspace. Create each file and directory only when it first gets content. Update entries in place when understanding changes; stale entries steer later sessions wrong.

## MISSION.md

```md
# Mission: {topic}

## Why
{1 to 3 sentences: the real-world outcome the user is chasing.}

## Success looks like
- {Something specific and observable the user will be able to do}

## Constraints
- {Time, budget, commitments, learning preferences}

## Out of scope
- {Adjacent topics the user does not want to chase now}
```

- One mission per workspace. Two unrelated topics are two workspaces.
- Push for the concrete outcome: "ship a Rust CLI to my team" over "learn Rust". A vague mission is worse than none, so keep interviewing until it is concrete.
- Keep it to one screen.

## RESOURCES.md

```md
# {Topic} resources

## Knowledge
- [Title, author](https://example.com)
  What it covers. Use for: {subskills or questions}.

## Wisdom (communities)
- [Community](https://example.com)
  Why it is trustworthy. Use for: {judgement questions, critique}.

## Gaps
- {Area the mission needs with no good source yet}
```

- High-trust only: primary sources, recognized experts, peer-reviewed work, well-moderated communities. Leave out marketing dressed as education.
- Annotate every entry with one line on what it covers and when to use it.
- Remove a source that proved wrong, shallow, or off-mission. Five sharp sources beat thirty mediocre ones.
- For a question that needs judgement or real-world practice, give your best answer, then point the user to a community from this file. If the user has opted out of communities, note it here and stop proposing them.

## SKILL-MAP.md

```md
# Skill map: {topic}

Target: 4/5

## {subskill}
- Level: 3/5
- Evidence: 2026-11-09 predicted the output of a closure exercise unprompted; 2026-11-07 explained hoisting after one narrower question
- Interval: 4 days
- Next review: 2026-11-13
```

Levels: 0 unaware, 1 heard of it, 2 can follow along, 3 can do with help, 4 can do independently, 5 can teach it and handle edge cases.

Evidence lines are dated and say what the user did, so a later session can judge whether the level still holds.

Review schedule (expanding intervals, as in the Leitner system): when a subskill gains a level or passes a review, set the interval to 1 day if it had none, otherwise double it, and set the next review date from today. A subskill placed above level 0 by the diagnostic starts at 1 day. A failed review lowers the level by one, never below 0, and resets the interval to 1 day. A subskill at level 0 has no review date until it gains a level.

In the chat, render the map as ASCII with U+2588 and U+2591 bars, the current focus marked, and the overall percentage (sum of levels over sum of targets):

```text
Topic: SQL joins                      overall: ██████░░░░ 58%
------------------------------------------------------------
inner joins           [████████░░]  4/5  independent
outer joins           [██████░░░░]  3/5  <- current focus
self joins            [██░░░░░░░░]  1/5  review due
------------------------------------------------------------
```

## GLOSSARY.md

```md
# {Topic} glossary

## Terms

**Progressive overload**:
Systematically increasing the demand on a muscle over time, through load, volume, or intensity.
_Avoid_: pushing harder, levelling up
```

- Add a term once the user can use it correctly. The glossary records compressed knowledge; it is not a dictionary to learn from.
- Pick one word per concept and list the others under _Avoid_. Use glossary terms everywhere, including inside other definitions, lessons, and records.
- Define what the term is in one or two sentences. Note how the workspace resolves a term the field uses loosely.

## Learning records

`learning-records/0001-slug.md`, numbered one past the highest existing record:

```md
# {What was learned or established}

{1 to 3 sentences: what is now known and why it changes what to teach next.}
```

Write one when the user demonstrates understanding of something non-trivial, discloses prior knowledge (record the depth claimed), corrects a misconception, or shifts the mission. Coverage alone, term definitions already in the glossary, and session logs do not qualify. Optional lines: `Status: superseded by LR-NNNN` when a later record replaces this one (keep the old record), `Evidence:`, and `Implications:` when non-obvious.

## NOTES.md

Free-form notes on how the user wants to be taught: pace, difficulty, formats they like or dislike, time per session. Read it before every lesson.
