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
