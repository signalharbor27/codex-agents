# Legacy Code

Read this when safe change is hard because the code is poorly understood, under-tested, tightly coupled, or business-critical.

Source family: Michael Feathers, *Working Effectively with Legacy Code*.

## Core Concepts

- Legacy code is code without trustworthy tests.
- Find seams where behavior can be observed or dependencies can be replaced.
- Add characterization tests before changing behavior.
- Break dependencies only enough to make the next safe change.
- Prefer sprout/wrap/extract moves over rewrites.

## Agentic Coding Use

- Prevents agents from replacing scary code with plausible new code.
- Gives a path when tests are missing: characterize first, then change.
- Keeps refactors behavior-preserving and reviewable.

## Checklist

- What behavior must not change?
- Where is the cheapest seam to observe it?
- What dependency blocks testing or inspection?
- Can the change be a wrap/sprout/extract instead of a rewrite?
