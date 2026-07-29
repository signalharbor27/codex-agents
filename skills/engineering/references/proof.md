# Proof

Load this only when the trustworthy proof is not obvious or the change has material failure modes.

## Choose the Cheapest Trustworthy Seam

Start from the claim, then select the lowest-cost evidence that can falsify it:

- pure rule or transformation: focused unit/property test;
- module or provider contract: contract/component test with the real boundary shape;
- persistence or transaction behavior: integration test with the real database or faithful local substitute;
- user-critical wiring: narrow end-to-end or smoke path;
- unclear requirement: bounded exploratory check before automating;
- performance: repeatable measurement against a baseline;
- deployability: build/migration/dry-run plus the relevant runtime observation.

Prefer existing repository tests and commands. Test through public or stable interfaces and keep the dependency under test real. Fake slow or uncontrollable edges; mock only the external boundary whose protocol is already understood.

## Avoid False Confidence

- Derive expected results from an independent oracle: a specification example, literal worked result, invariant, trusted fixture, or independent implementation.
- Make regression loops red-capable: observe the failure before trusting the fix when practical.
- Cover the changed failure mode, not an exhaustive matrix.
- Keep incident tests unless stronger evidence subsumes the same contract.
- Screenshots, successful acknowledgements, typechecks, and mocked calls prove only their own narrow claim.

## Completion

Run the focused proof, then the smallest relevant surrounding gate. Read the current output and inspect the final diff. Report exactly what passed, what was not proved, and any residual operational validation.

## Source Basis

- Gerard Meszaros, *xUnit Test Patterns*: test doubles, smells, and maintainable verification.
- Steve Freeman and Nat Pryce, *Growing Object-Oriented Software, Guided by Tests*: tests through meaningful boundaries.
- Michael Feathers, *Working Effectively with Legacy Code*: characterization tests and safe change.
- Kent Beck, *Test-Driven Development: By Example*: short red-green-refactor loops.
