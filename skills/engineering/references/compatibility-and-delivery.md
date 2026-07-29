# Compatibility and Delivery

Load this for public contracts, SDK/schema changes, mixed-version deploys, migrations, rollout, or rollback.

## Find the Observable Contract

Inventory consumers and persisted artifacts before changing:

- fields, nullability, ordering, errors, status codes, pagination, and retry semantics;
- events, queue payloads, SDK types, generated clients/docs, CLI/config names;
- stored data written by old versions;
- jobs, support tools, and services that may deploy independently.

Classify the change as additive, breaking, or ambiguous. Prefer additive evolution when consumers cannot move atomically.

## Keep Checkpoints Green

For a wide change, use expand/migrate/contract:

1. add the new form alongside the old;
2. deploy compatible producers and consumers;
3. migrate callers or data in observable batches;
4. prove old usage is gone;
5. remove the old form.

For schema changes, distinguish branch-local migration cleanup from migrations already applied to shared environments. Shared history is append-only unless an explicitly approved repair says otherwise.

## Delivery Evidence

- focused compatibility or migration test;
- mixed-version or old-data read proof where relevant;
- deploy/rollback or feature-disable path;
- required config, secret, worker, queue, or runbook step;
- smoke or runtime observation matched to the changed risk.

## Agent Guardrails

Do not create compatibility shims without an identified consumer and removal condition. Do not run every gate by ritual; select gates that prove the changed contract and repository health.

## Source Basis

- Jez Humble and David Farley, *Continuous Delivery*: small batches, deployability, rollback, and automated evidence.
- Martin Fowler, “Parallel Change”: expand-and-contract evolution.
- *Accelerate* by Nicole Forsgren, Jez Humble, and Gene Kim: small changes and fast, reliable delivery.
