---
name: writing-rust
description: Shape Rust code with sound ownership, clear APIs, and explicit tradeoffs. Use when borrowing, traits, error surfaces, async, or unsafe boundaries materially affect the design. Not for generic code-structure or test-strategy questions.
---

# Writing Rust

## Overview

Use this skill when Rust-specific constraints change what good design looks like.
Keep the entrypoint focused on pressure and route idioms to references.

## When to Use

- Ownership and borrowing affect the API or implementation
- Trait, generic, or typestate design is the main question
- Error surfaces, docs, async, or unsafe boundaries need Rust-specific judgment

## When Not to Use

- Use `writing-software` for generic structure questions
- Use `testing-software` for test selection
- Use `designing-data-intensive-systems` for workload or storage architecture

## Minimal Workflow

1. Inspect the current API and call sites.
2. State the Rust-specific pressure.
3. Prefer the simplest safe shape that keeps invariants obvious.
4. Name the soundness, ergonomics, and API-stability tradeoffs.

## Reference Routing

- Read [STYLE.md](STYLE.md) for naming, visibility, and docs.
- Read [PATTERNS.md](PATTERNS.md) for traits, builders, typestate, and wrapper patterns.
- Read [DOCS.md](DOCS.md) for docs and doctests.
- Read [SSR.md](SSR.md) when SSR or frontend integration matters.

## Failure Modes

- Importing patterns from other languages without Rust-specific justification
- Hiding lifetime or ownership coupling behind “ergonomic” APIs
- Letting `unsafe` sprawl across module boundaries
