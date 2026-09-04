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
- Make regression loops red-capable: observe the failure before trusting the fix when practical.
- Cover the changed failure mode, not an exhaustive matrix.
- Keep incident tests unless stronger evidence subsumes the same contract.
- Screenshots, successful acknowledgements, typechecks, and mocked calls prove only their own narrow claim.

## Completion

Run focused proof and the smallest required surrounding checks. Read the output and inspect the final diff. Reuse current-turn evidence while the tested code and relevant state remain unchanged. Repeat or broaden checks only for new edits, failures, changed state, or unresolved risks. Report what passed and any material proof gaps.

An existing reproduction, replay, or runtime observation may supply the regression signal. Add a persistent test when it adds durable protection; avoid checks that merely repeat implementation details.

## Source basis

- Gerard Meszaros, *xUnit Test Patterns*: test doubles, smells, and maintainable verification.
- Steve Freeman and Nat Pryce, *Growing Object-Oriented Software, Guided by Tests*: tests through meaningful boundaries.
- Michael Feathers, *Working Effectively with Legacy Code*: characterization tests and safe change.
- Kent Beck, *Test-Driven Development: By Example*: short red-green-refactor loops.
