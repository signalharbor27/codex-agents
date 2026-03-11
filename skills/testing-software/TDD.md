Read this when the user explicitly wants TDD or when a bug fix or behavior change has a cheap trustworthy failing test.

Use TDD as a tool, not a religion.

Rules:
- do a short planning pass first: confirm the behavior slice, interface, and observable signal
- test one behavior slice at a time
- verify behavior through public interfaces
- good tests describe WHAT the system does, not HOW it is implemented
- good tests survive internal refactors when behavior stays the same
- prefer integration-style tests over internal mock choreography
- do not mock internal collaborators just to assert calls or argument shape
- do not verify behavior through the wrong seam, such as direct DB queries when the interface result is what matters
- a failing test must prove a real behavior gap, not an imagined implementation detail
- do not write all tests first and all code later
- use a vertical loop: one failing test, minimal implementation, then repeat
- refactor only after the slice is green
- stop using TDD when a different proof is cheaper and more trustworthy

Red flags:
- test breaks on harmless refactor with unchanged behavior
- test asserts private helper output, mock call counts, or data structure shape
- test bypasses the public interface to inspect storage or internals
- test only passes because the test was rewritten to fit the implementation
