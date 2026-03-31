Read this after drafting any real plan.

Challenge mode means:
- walk the decision tree branch by branch
- resolve one branch at a time instead of spraying unrelated questions
- name assumptions explicitly
- ask what would break the recommendation
- if a question can be answered by inspecting the codebase, inspect the codebase instead of asking the user
- identify the missing evidence that would change the decision
- tighten scope until the implementation path is obvious
- resolve dependencies and slice order one-by-one
- force at least one rejected alternative for non-trivial choices
- do not leave with unresolved branch decisions or hidden open questions

Intensity:
- light grill: small plans, check assumptions and verification only
- normal grill: most plans, resolve assumptions, dependencies, and rejected alternative
- hard grill: large, risky, or ambiguous plans, interview the plan relentlessly until you reach shared understanding, then walk each branch of the design tree and resolve dependencies one-by-one before execution
