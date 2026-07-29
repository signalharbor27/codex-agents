# Test Selection

Load this when the proof layer, doubles, oracle, or case matrix is consequential.

## Pick the Seam

- Pure domain rule: unit or property test.
- Module/provider contract: contract or component test.
- Persistence, transaction, migration, or query: integration test with the real database or faithful substitute.
- Cross-process critical path: narrow end-to-end test.
- Broad input/state space: property or state-machine test.
- Existing behavior without trustworthy tests: characterization test.
- Unclear requirement: exploratory session before automation.

Choose the lowest layer that observes the real risk. Add a higher layer only for wiring it uniquely proves.

## Doubles

- Real: fast, deterministic, and central to the claim.
- Fake: controllable substitute with meaningful behavior, such as an in-memory clock or local provider.
- Stub: fixed response when only downstream handling matters.
- Mock: last resort for an understood external interaction whose call contract is the claim.

Do not mock the unit’s own collaborators merely to assert implementation choreography.

## Cases and Oracles

Partition inputs and state transitions; test boundaries and representative invalid states. For policy matrices, use decision tables. For combinatorial inputs, add pairwise or property coverage only when interactions are plausible.

Expected values must come from a source capable of disagreeing with production logic. Prefer literal examples, specifications, invariants, trusted fixtures, or an independent implementation.

Source basis: Gerard Meszaros, *xUnit Test Patterns*; Lee Copeland, *A Practitioner’s Guide to Software Test Design*; and Freeman/Pryce, *Growing Object-Oriented Software, Guided by Tests*.
