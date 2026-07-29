# TDD

Load this only for explicit TDD or when a cheap trustworthy failing test is the chosen development loop.

Use one vertical loop:

1. Name one observable behavior.
2. Write one test through the public or stable interface.
3. Run it and confirm the expected failure.
4. Make the smallest production change that passes.
5. Run the focused test and relevant neighbors.
6. Refactor only while green.

Stop using TDD when configuration, generated wiring, mechanical migration, exploratory UI shape, or another proof is cheaper and equally trustworthy.

Red flags:

- all tests are written before any integrated behavior;
- the test fails because setup is wrong rather than behavior is absent;
- harmless refactoring breaks the test;
- expected values repeat production calculations;
- production is distorted solely to expose internals;
- the test is rewritten to fit the implementation without reconciling the intended behavior.

Source basis: Kent Beck, *Test-Driven Development: By Example*, and Freeman/Pryce, *Growing Object-Oriented Software, Guided by Tests*.
