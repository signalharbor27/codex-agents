Read this when the main problem is routing clarity.

Description rules:
- front-load the key use case and trigger words because Codex may shorten descriptions in a large skill catalog
- say what the skill is for and when it should fire
- use explicit `Use when ...` trigger phrasing
- describe trigger conditions, not workflow
- use one trigger per distinct branch; collapse synonyms that describe the same branch
- keep the shortest description that preserves every real trigger and overlap boundary
- add only routing context the model is unlikely to infer reliably from the skill name
- include a boundary when overlap exists

Invocation vocabulary:
- Codex initially catalogs each skill's name, description, and path; every description spends catalog context, so each trigger must earn its place
- model-invoked skills use the description for implicit matching; keep it precise enough to select the skill without swallowing adjacent work
- explicit-only skills set `policy.allow_implicit_invocation: false` in `agents/openai.yaml`; their descriptions remain cataloged, and explicit `$skill` invocation still works
- use explicit-only routing when human judgment should choose the flow and the cost of an implicit false positive is material
- context pointer means any short phrase that tells the agent when to load deeper material; sharpen the pointer before inlining a whole reference

Bad descriptions:
- summarize the entire workflow
- say the skill is for "any" task in a broad category
- omit what should route somewhere else
- dump examples, edge cases, or implementation notes into the description
- repeat synonyms to satisfy an arbitrary character minimum
- preserve a no-op phrase that sounds useful but does not change routing, effort, or completion behavior
