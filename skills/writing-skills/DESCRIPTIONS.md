Read this when the main problem is routing clarity.

Description rules:
- sentence 1 says what the skill is for
- sentence 2 says `Use when ...`
- describe trigger conditions, not workflow
- keep it short enough to scan quickly
- keep it roughly within 140-320 characters total
- add only routing context the model is unlikely to infer reliably from the skill name
- include a boundary when overlap exists

Invocation vocabulary:
- model-invoked skills keep a model-facing description so the agent can route to them; this spends context load every turn, so the trigger must earn its place
- user-invoked skills are human-indexed; they spend cognitive load instead of context load, so use them only when human judgment should choose the flow
- context pointer means any short phrase that tells the agent when to load deeper material; sharpen the pointer before inlining a whole reference

Bad descriptions:
- summarize the entire workflow
- say the skill is for "any" task in a broad category
- omit what should route somewhere else
- dump examples, edge cases, or implementation notes into the description
- preserve a no-op phrase that sounds useful but does not change routing, effort, or completion behavior
