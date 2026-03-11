Read this when the hard part is designing a module or API surface.

Compare:
- a no-pattern baseline
- one simplified interface optimized for the common case
- one alternative only if it is materially different

Judge them on:
- method count and parameter complexity
- what the interface hides internally
- ease of correct use
- misuse risk
- compatibility with existing callers
