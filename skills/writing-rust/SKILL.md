---
name: writing-rust
description: "Use when Rust ownership, borrowing, traits, error types, async, public API docs, or unsafe boundaries constrain the design."
---

# Writing Rust

## Overview

This skill is a modifier. Generic implementation work stays in the primary skill, and each run loads only the Rust reference for the current pressure.

## When to Use

- Trait, generic, or typestate design is the main question

## When Not to Use

- Generic implementation structure: use `engineering` as the primary skill.
- Test selection as the primary task: use `test-design`.
- Workload or storage architecture: use `designing-data-intensive-systems`.

## Minimal Workflow

1. Inspect the current API, call sites, owned and borrowed data, error surface, and repository conventions. Done when every call site and owner the change affects is known.
2. State the Rust-specific pressure: ownership, lifetime coupling, trait shape, state modeling, async behavior, or an unsafe boundary. Done when the pressure is tied to a named type, function, or module boundary.
3. Compare safe shapes that keep the invariants explicit, state where their soundness, ergonomics, and API-stability tradeoffs differ, then prefer the one with the simplest ownership story. Done when the chosen shape is justified against at least one alternative.
4. For guidance or review, finish with the recommended API or ownership shape, the material tradeoffs, and the compiler, test, doctest, or lint evidence needed.
5. During implementation, apply these Rust constraints as a modifier inside the primary `engineering` loop and use its fresh-verification stop condition.

## Reference Routing

- Read [STYLE.md](STYLE.md) when the question is code shape: control flow, matching, naming, comments, error propagation, or review-level idioms.
- Read [PATTERNS.md](PATTERNS.md) when the main decision is type shape, ownership, trait implementations, builders, newtypes, state enums, module visibility, or impl organization.
- Read [DOCS.md](DOCS.md) when touching public APIs, crate or module docs, examples, or `# Errors` / `# Panics` / `# Safety` sections.
- Read [SSR.md](SSR.md) when a Rust refactor spans many sites and rust-analyzer structural search and replace is safer than manual edits.

## Failure modes

- Importing patterns from other languages without Rust-specific justification
- Hiding lifetime or ownership coupling behind "ergonomic" APIs
- Letting `unsafe` sprawl across module boundaries
