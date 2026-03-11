Read this when the user explicitly wants TDD or when a bug fix or behavior change has a cheap trustworthy failing test.

Use TDD as a tool, not a religion.

Rules:
- do a short planning pass first: confirm the behavior slice, interface, and observable signal
- test one behavior slice at a time
- verify behavior through public interfaces
- prefer integration-style tests over internal mock choreography
- do not write all tests first and all code later
- use a vertical loop: one failing test, minimal implementation, then repeat
- refactor only after the slice is green
- stop using TDD when a different proof is cheaper and more trustworthy
