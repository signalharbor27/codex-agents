# Proof

Load this only when the trustworthy proof is not obvious or the change has material failure modes.

## Choose the cheapest trustworthy seam

Start from the claim, then select the lowest-cost evidence that can falsify it:

- pure rule or transformation: focused unit/property test;
- module or provider contract: contract/component test with the real boundary shape;
- persistence or transaction behavior: integration test with the real database or faithful local substitute;
- user-critical wiring: narrow end-to-end or smoke path;
- unclear requirement: bounded exploratory check before automating;
- performance: repeatable measurement against a baseline;
- deployability: build/migration/dry-run plus the relevant runtime observation.

Prefer existing repository tests and commands. Test through public or stable interfaces and keep the dependency under test real. Fake slow or uncontrollable edges; mock only the external boundary whose protocol is already understood.

## Avoid false confidence

- Derive expected results from an independent oracle: a specification example, literal worked result, invariant, trusted fixture, or independent implementation.
- Ground consequential inputs and setup in the real producer, contract, or observed behavior. Check stored formats, external responses, clock and deadline semantics, permissions, filesystem layout, and concurrency where they affect the claim. A correct expected value cannot rescue a fixture that bypasses the failure.
- For material behavior, identify a plausible broken implementation and the observation that rejects it. Use an existing reproduction, replay, boundary case, or negative control where sufficient; observe the failure before trusting a regression fix when practical. Run a targeted fault or mutation only when it resolves a remaining proof gap.
- When safety depends on dependency behavior, inspect the resolved version and applied patches, then exercise the relevant contract. A declared version range or current upstream documentation may describe different behavior. Trace indirect consumers when they rely on the changed contract.
- Cover the changed failure mode, not an exhaustive matrix.
- Keep incident tests unless stronger evidence subsumes the same contract.
- Screenshots, successful acknowledgements, typechecks, and mocked calls prove only their own narrow claim.

## Completion

Run focused proof and the smallest required surrounding checks. Read the output and inspect the final diff. Reuse earlier evidence after confirming the tested code, inputs, dependencies, and relevant runtime state are unchanged. A new turn alone does not invalidate proof. Repeat or broaden checks for affected edits, failures, changed state, missing evidence, or unresolved risks. Report what passed and any material proof gaps.

An existing reproduction, replay, or runtime observation may supply the regression signal. Add a persistent test when it adds durable protection; avoid checks that merely repeat implementation details.

## Source basis

- Gerard Meszaros, *xUnit Test Patterns*: test doubles, smells, and maintainable verification.
- Steve Freeman and Nat Pryce, *Growing Object-Oriented Software, Guided by Tests*: tests through meaningful boundaries.
- Michael Feathers, *Working Effectively with Legacy Code*: characterization tests and safe change.
- Kent Beck, *Test-Driven Development: By Example*: short red-green-refactor loops.
