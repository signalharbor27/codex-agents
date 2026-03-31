Read this when a change is large or ambiguous enough to need staged planning artifacts instead of one short inline plan.

Keep each artifact small and purpose-specific.

## 1. Research Questions

Goal:
- frame what must be learned about the current codebase

Include:
- current-state questions only
- where it lives
- how it works
- similar patterns
- test surface and verification hooks

Avoid:
- solution ideas
- "how should we build it"
- hidden implementation bias leaking into the questions

## 2. Factual Research

Goal:
- document current reality only

Include:
- entrypoints, boundaries, and flow
- relevant patterns and conventions
- constraints and invariants already present
- current testing shape
- concrete code references when useful

Avoid:
- recommendations unless the task explicitly asks for them
- mixing diagnosis with design choice

## 3. Design Discussion

Goal:
- resolve the important decisions before tactical planning

Include:
- current state in product terms
- current state in code terms
- patterns to follow
- major options with pros and cons
- chosen decisions with rationale
- open questions that still require user judgment
- brief testing direction when already obvious

Use this artifact for the deep review and user alignment step.

## 4. Structure Outline

Goal:
- lock the slice order before writing the full plan

Include:
- durable cross-slice decisions near the top when they are unlikely to change
- short vertical phases, not horizontal layer batches
- per phase: title, what to build, dependencies, verification, and out-of-scope notes
- acceptance criteria stated as observable behavior

Keep it concise. This is the header file, not the implementation.

## 5. Tactical Plan

Goal:
- give the agent an executable sequence after the earlier decisions are stable

Include:
- specific slice steps
- verification commands
- commit boundaries when commits are expected
- concrete implementation notes only when they are stable enough to be useful

Rules:
- no unresolved open questions
- no giant review burden
- deep review happens on the code, not here

## Review Depth

- research questions: quick sanity check
- factual research: spot-check for truth and completeness
- design discussion: deep review
- structure outline: deep review
- tactical plan: spot-check, then save deep review for code
