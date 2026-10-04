# External skills

Installed unmodified and hidden from automatic routing. When a pressure below is present, read the installed `<name>` skill's SKILL.md by path (`~/.agents/skills/<name>/SKILL.md`) and apply its method inside the current skill's workflow. Our skills own the workflow and our instructions win on conflict: authority, approval, scope, and Git rules never loosen because an external skill says so. Each line is trigger, then skill.

## Engineering

- Non-trivial edits, migrations, or analyses a script, codemod, or generator could do or prove: `principle-build-the-lever`
- Sweeps, runs of similar edits, or stacking commits and PRs: `principle-sequence-verifiable-units`
- Sequencing an addition or rewrite onto code with dead paths or redundant validators: `principle-subtract-before-you-add`
- Diff size, a tempting abstraction, layer, or threaded signal: `principle-laziness-protocol`
- A new internal API while old callers remain: `principle-migrate-callers-then-delete-legacy-apis`
- Planned rewrite or migration tempted to keep throwaway intermediate compatibility: `principle-outcome-oriented-execution`
- Commands, lifecycle steps, or loops that must survive crash, restart, or retry: `principle-make-operations-idempotent`
- Concurrent actors writing one file, branch, key, or state object: `principle-separate-before-serializing-shared-state`
- Placing validation, error handling, or framework adapters: `principle-boundary-discipline`
- The same instruction written twice, or a recurring correction: `principle-encode-lessons-in-structure`
- What a change could break beyond the diff: `blast-radius`
- Reading or editing `.ts` or `.tsx` files: `typescript-best-practices`

## Debugging

- Any defect: reproduce, trace to the root cause, and fix it there instead of guarding the symptom: `principle-fix-root-causes`
- Two or more fixes sharing one premise failed the same gate: `principle-attack-the-premise`

## Testing and proof

- Writing, changing, or keeping a test: `principle-test-behavior-not-implementation`
- Before declaring done: check the real artifact, not a proxy: `principle-prove-it-works`
- Trusting, reporting, or acting on a measured number: `principle-explain-the-number`
- Running a benchmark or reporting a measured speedup or regression: `benchmark-checklist`

## Design

- Choosing core types and data structures, or what concurrent actors share: `principle-foundational-thinking`
- Stateful logic, heavy branching, or one shape assumption repeated across files: `principle-model-the-domain`
- Designing types or signatures in a statically typed language: `principle-type-system-discipline`
- Fitting a new requirement into an existing design: `principle-redesign-from-first-principles`
- A novel interaction or architecture with no precedent in the codebase: `principle-exhaust-the-design-space`
- Product, UX, or feature-scope tradeoffs: `principle-experience-first`
- Code that is hard to trace through layers or hidden state: `principle-minimize-reader-load`

## Runs and communication

- Large unattended or multi-phase runs a human reviews later: `figure-it-out` for the playbook, `show-me-your-work` for the decision log
- Context filling with large outputs, long files, or fan-out: `principle-guard-the-context-window`
- Tempted to ask permission for reversible work: `principle-never-block-on-the-human`
- Open decisions the user answers asynchronously: `to-questionnaire`
- The user did not follow an output: `wait-what`
