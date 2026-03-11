---
name: designing-with-patterns
description: Compare a small number of realistic design shapes against a simpler no-pattern option. Use when abstraction churn, interface mismatch, or behavior variation makes the architecture choice genuinely unclear. Not for ordinary implementation decisions.
---

# Designing With Patterns

## Overview

Use this skill when the real question is which design shape should exist at all.
Keep the discussion grounded in pressure, not pattern vocabulary.

## When to Use

- Multiple architecture shapes are plausible
- Inheritance or interface pressure keeps recurring
- Behavior variation or coordination logic is getting awkward
- A pattern might help, but no pattern might still be best

## When Not to Use

- Use `writing-software` for day-to-day change shaping
- Use `designing-data-intensive-systems` for workload, storage, or consistency decisions
- Use `writing-rust` for Rust-specific ownership or trait questions

## Minimal Workflow

1. State the pressure that makes the design unclear.
2. Compare a no-pattern option with 1-2 realistic alternatives.
3. Judge each option on simplicity, misuse risk, coupling, and hidden complexity.
4. Recommend one shape and name a rejected alternative.

## Reference Routing

- Read [PRINCIPLES.md](PRINCIPLES.md) for composition vs inheritance and deep-module boundaries.
- Read [CREATIONAL.md](CREATIONAL.md) for factories, builders, and construction pressure.
- Read [STRUCTURAL.md](STRUCTURAL.md) for wrapping, adapting, and object graph composition.
- Read [BEHAVIORAL.md](BEHAVIORAL.md) for state, commands, coordination, and behavior variation.

## Failure Modes

- Starting from pattern names instead of verified pressure
- Comparing too many options to avoid making a decision
- Choosing elegance over ease of correct use
