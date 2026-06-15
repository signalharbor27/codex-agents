# Playwright E2E Tests

Use Playwright for a small number of high-value browser behaviors that cheaper tests cannot prove. Prefer focused tests that verify one user story through public UI and network-visible outcomes.

## What To Test

- Test critical flows, permissions, payment states, navigation, and browser-only integration behavior.
- Do not use Playwright as broad text snapshot coverage. Assert copy only when exact copy is a product contract or regression target.
- Push pure pricing math, parsers, state machines, URL builders, validation, and reconciliation logic down to unit or integration tests.
- For UI/UX claims, pair screenshots with explicit visual observations, accessibility checks, or concrete assertions.

## Selectors

- Prefer user-facing locators: `getByRole`, `getByLabel`, `getByPlaceholder`, `getByText` when text is the contract, and scoped locators.
- Use `getByTestId` for ambiguous controls, generated content, repeated cards, hidden implementation details that still represent a stable product contract, or when translated copy makes role/name brittle.
- Avoid CSS classes, DOM depth, framework-generated IDs, and private component structure.
- Scope selectors to stable regions such as a modal, plan card, table row, or named form before choosing child controls.

## Assertions

- Use web-first assertions such as `toBeVisible`, `toHaveURL`, `toHaveText`, `toBeEnabled`, and `toHaveAttribute`.
- Avoid fixed sleeps. Wait on visible UI, URL changes, network-observable completion, or known app state.
- Assert the user-observable outcome, not internal call order.
- Keep assertions narrow: enough to prove behavior, not enough to make harmless layout/copy edits painful.

## Isolation And Parallelism

- Each test must create or own its user, account, email inbox/token state, DB rows, browser storage, and external fixtures.
- If tests share static users, global mail directories, Stripe fixtures, seeded DB records, or cleanup routines, keep that group serial until isolation exists.
- Parallelize only specs with independent state. If a suite mixes both, split the runner into a parallel-safe phase and a serial shared-state phase.
- Prefer per-worker fixtures or deterministic unique IDs over global resets.
- Do not let one test depend on another test's side effects, order, or cleanup.

## Flow Shape

- Keep signup/payment/subscription flows vertical and short: enter from a realistic page, take the decisive action, verify the account or billing state shown to the user.
- Cover failure or recovery states only when they are core to the risk, not by expanding every happy-path E2E.
- Name the story in user terms, not implementation terms.
- When adding local-only test bypasses, assert they are gated to local/test environments and unreachable in production config.

## Review Checklist

- Does this test prove a behavior that cheaper tests cannot?
- Would it survive a component refactor with the same UX?
- Are selectors stable and user-oriented?
- Is every mutable dependency isolated per test or explicitly serialized?
- Could it run in parallel without races? If not, is the serial boundary documented in the runner?
- Does it avoid asserting non-contract text or implementation trivia?
