# Merge danger classification

Read this when writing or updating the Merge danger footer. Classify from the final diff and what merging and deploying it does, not from its size. A one-line template change that emails every customer is a one-way door.

## Footer

End the PR body with exactly this section; the reason is one plain sentence naming the deciding effect:

```markdown
## Merge danger

Door: two-way
Blast radius: localized
Reason: Copy change on the pricing page; a revert restores the old text.
```

## Door

`one-way` when a revert would not undo an effect of merging or deploying. Any one of these makes the PR one-way:

- Data loss or an irreversible migration: dropped or rewritten columns, destructive backfills, retention or deletion jobs.
- Mass external sends: emails, notifications, webhooks, or posts to many recipients, including sends a scheduled job or default-on flag starts later.
- Money movement or billing state: charges, refunds, payouts, subscriptions, plan or price records.
- Auth or permission changes: who can sign in, access, or act, including API keys and roles.
- Production host or infrastructure config: deploy units, proxies, DNS, secrets wiring, database settings.
- Public API or protocol contract changes that clients already depend on.

`two-way` otherwise: a revert and redeploy restore the previous behavior with no lasting effect. When the evidence leaves a one-way trigger possible, classify one-way and say what is uncertain.

## Blast radius

Pick the widest radius the change can reach if it goes wrong:

- `localized`: failure stays inside the changed surface, such as one page's copy or styling, docs, tests, an internal script, or agent tooling.
- `service`: a running service, shared library, build, or CI path can fail or slow down.
- `customers`: behavior customers see or rely on across flows, such as sign-up, delivery, notifications, or API responses.
- `data`: durable stored data can be written, rewritten, or lost.

## Examples

| Change | Door | Blast radius |
|---|---|---|
| Copy-only edit on one marketing page | two-way | localized |
| Migration that drops a column | one-way | data |
| Two-line template fix in a job that emails all users | one-way | customers |
| CI workflow timeout change | two-way | service |
| New WebSocket envelope field clients must parse | one-way | customers |
| Refactor of a runtime module with unchanged behavior | two-way | service |

## After classifying

Reviewers in `review-and-simplify-changes` classify the change independently against this file; where their classification and the footer differ, the more severe value of each wins (one-way over two-way; for blast radius, localized < service < customers < data), and the review record carries it as `door` and `blast_radius`. `finishing-a-development-branch` merges under a standing grant only when the footer and that record both say two-way and localized. Reclassify after each follow-up commit so the footer matches the final diff.
