---
name: writing-rust
description: "Use when Rust ownership, borrowing, traits, errors, async, or unsafe boundaries materially shape an engineering or review task. Acts as a domain modifier; not for generic structure or test strategy."
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

- Use `engineering` as the primary skill for generic implementation structure
- Use `test-design` when test selection is the primary task
- Use `designing-data-intensive-systems` for workload or storage architecture

## Minimal Workflow

1. Inspect the current API and call sites.
2. State the Rust-specific pressure.
3. Prefer the simplest safe shape that keeps invariants obvious.
4. Name the soundness, ergonomics, and API-stability tradeoffs.
5. For guidance or review, finish with the recommended API or ownership shape, material tradeoffs, and verification needed.
6. During implementation, apply these Rust constraints as a modifier inside the primary `engineering` loop and use its fresh-verification stop condition.

## Reference Routing

- Read [STYLE.md](STYLE.md) for naming, visibility, and docs.
- Read [PATTERNS.md](PATTERNS.md) for traits, builders, typestate, and wrapper patterns.
- Read [DOCS.md](DOCS.md) for docs and doctests.
- Read [SSR.md](SSR.md) when a Rust refactor spans many sites and rust-analyzer structural search and replace is safer than manual edits.

## Failure Modes

- Importing patterns from other languages without Rust-specific justification
- Hiding lifetime or ownership coupling behind “ergonomic” APIs
- Letting `unsafe` sprawl across module boundaries
