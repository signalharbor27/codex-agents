# Domain Modeling

Read this when terms, ownership, boundaries, lifecycle rules, or business invariants are unclear.

Source family: Eric Evans and Vaughn Vernon on domain-driven design.

## Core Concepts

- Ubiquitous language: code should use the same terms as the domain.
- Bounded context: the same word can mean different things in different parts of the system.
- Aggregate: consistency boundary for related state changes.
- Context map: how subsystems translate or share concepts.

## Agentic Coding Use

- Prevents agents from merging similar-looking concepts that should stay separate.
- Reduces repeated rediscovery by naming boundaries explicitly.
- Makes future changes easier because invariants live near the model that owns them.
- Gives future agents durable language without forcing GitHub issues or external workflow state.

## Checklist

- What domain term is central to this change?
- Which context owns it?
- What invariant must hold after the operation?
- Is this shared model real, or just convenient coupling?

## Local Artifact Rules

- Read existing `CONTEXT.md`, `CONTEXT-MAP.md`, `docs/adr/`, or equivalent repo docs before inventing terms.
- If `CONTEXT-MAP.md` exists, use it to find the owning context. If multiple contexts fit and ownership matters, ask.
- Create or update `CONTEXT.md` lazily only when a term, relationship, alias, or ambiguity will guide future changes.
- Keep definitions one sentence. Define what the term is, not implementation details.
- Record aliases to avoid when competing names caused confusion.
- Record relationships and invariants when they prevent invalid merges or wrong ownership.
- Flag unresolved ambiguities explicitly instead of smoothing them over.
- Add an ADR only when the decision is hard to reverse, surprising without context, and based on a real tradeoff.

Active domain modeling means changing or sharpening the model, not merely reading existing docs.
Reading `CONTEXT.md` is passive context gathering; active modeling challenges terms against code, user language, edge cases, and competing names, then records the term only when future work would otherwise rediscover the ambiguity.

`CONTEXT.md` format:
- title the context and give a one- or two-sentence scope
- define only project-specific terms, grouped when natural
- for each term, write one tight definition and optional `_Avoid_:` aliases
- include relationships or invariants only when they prevent wrong ownership or invalid merges

`CONTEXT-MAP.md` format:
- list each context and where its glossary lives
- describe relationships such as events, shared identifiers, ownership, or translation between contexts
- when multiple contexts fit the current change and ownership affects code shape, ask before writing

ADR format:
- create `docs/adr/NNNN-short-slug.md` lazily when the first real ADR is needed
- first paragraph states context, decision, and why in 1-3 sentences
- optional sections only when useful: status, considered options, consequences
- ADRs are for decisions that are hard to reverse, surprising without context, and based on a real tradeoff; skip obvious or easy-to-reverse choices
