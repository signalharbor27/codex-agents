# Browser E2E

## Keep the test narrow

- Cover a critical user journey or browser-only integration, not every rule.
- Start from a clean, isolated account or fixture and make parallel execution safe.
- Prefer role, label, and stable user-facing selectors; use test IDs only where semantics are insufficient.
- Wait for visible state or network/application postconditions, never arbitrary sleeps.
- Assert the user-observable result and important persistence or navigation outcome.

Use API or fixture setup for irrelevant preconditions, but drive the behavior under test through the UI. Push rule and edge-case coverage down to cheaper seams.

## Visual evidence

A screenshot alone is not a test. Pair it with an assertion, a reviewed baseline comparison, or an explicit visual QA observation that states what was checked. Keep snapshots stable and intentional.

## Failure evidence

Capture the smallest useful trace, screenshot, console/network error, and final observed state. Let deterministic failures fail; a retry that hides one is a defect. Quarantine is temporary and must preserve an owner and removal condition.

When API details are version-sensitive, consult the installed Playwright version's current official documentation.
