# Test suite review

## Review axes

- behavior fit: Do tests read like behavior specs and prove observable behavior through real code paths and public interfaces?
- brittleness: Which tests would fail on a harmless internal refactor or rename?
- seam quality: Do tests prove the contract, incident, or decision boundary where a real failure would matter? Which missing seam-level tests would let us delete broad or brittle coverage?
- redundancy: Which tests prove the same behavior at several layers, or at higher cost, with no extra signal?
- realism: What stays real versus faked or mocked, and where do mocks hide the real failure boundary?
- fixture grounding: What grounds consequential fixtures and setup in real inputs, and which observation would reject a plausible broken implementation?
- speed and signal: Does the suite give fast, trustworthy feedback?
- TDD fit: Where would a cheap, trustworthy failing path or vertical-slice TDD make future changes and bug fixes safer and cheaper? TDD is optional for config churn and mechanical work.

## Keep or remove

Keep tests that:

- protect user-visible behavior, incident regressions, or important contracts
- prove the seam where a real failure would matter
- stay stable across internal refactors when behavior stays the same

Remove, demote, or rewrite tests that:

- lie in one of the ways the test-lie catalog in `../review-and-simplify-changes/references/coding-standards.md` names: tautological, structure-sensitive, can't-fail, or private-path
- duplicate broader trustworthy coverage without new signal
- are slow or flaky enough that teams stop trusting them
- add maintenance cost without protecting a meaningful risk

Plan replacements seam by seam, naming each seam's payoff.

## Delegation tracks

Useful read-only subagent tracks for a standalone audit:

- frontend or backend test-surface audit
- integration and contract test review
- end-to-end suite signal and redundancy review
- mock and fixture inventory
- incident-regression audit
