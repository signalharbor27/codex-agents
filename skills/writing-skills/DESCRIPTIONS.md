# Descriptions and invocation

Description rules:
- put the main use case and trigger words first because Codex may shorten descriptions in a large skill catalog
- state only the conditions under which the model should invoke the skill, with explicit `Use when ...` trigger phrasing
- name the specific triggers; a claim that the skill covers "any" task in a broad category routes nothing precisely
- keep capability summaries, workflow steps, output contracts, examples, edge cases, and implementation notes in the body
- collapse synonyms that describe the same branch into one trigger, and skip synonyms added only to reach a character minimum
- use the shortest description that preserves every real trigger and overlap boundary
- include a boundary when overlap exists, in the form `Use when <triggers>. Excludes <adjacent work that routes elsewhere>.`; a modifier skill that co-loads with a primary skill excludes only work where it never applies, and leaves primary-skill ownership to its body
- add only routing context the model is unlikely to infer reliably from the skill name
- delete a phrase that sounds useful but does not change routing, effort, or completion behavior

Invocation vocabulary:
- Codex initially catalogs each skill's name, description, and path; every description spends catalog context, so each trigger must earn its place
- model-invoked skills use the description for implicit matching; keep it precise enough to select the skill without swallowing adjacent work
- explicit-only skills set `policy.allow_implicit_invocation: false` in `agents/openai.yaml`; their descriptions remain cataloged, and explicit `$skill` invocation still works
- use explicit-only routing when human judgment should choose the flow and the cost of an implicit false positive is material
- a context pointer is a short phrase that tells the agent when to load deeper material; sharpen it before inlining an entire reference
