# Delivery

Read this when the task includes deployability, migrations, rollbacks, CI gates, or multi-step rollout.

Source family: continuous delivery, Accelerate/DORA, and expand-contract migration practice.

## Core Concepts

- Small batches reduce risk.
- Deployment and release are different decisions.
- Prefer reversible changes and explicit rollback paths.
- Expand/contract migrations avoid mixed-version breakage.
- Gates should prove the risk, not just run every command.

## Agentic Coding Use

- Keeps long-running agents focused through implementation, gates, and handoff.
- Prevents partial completion claims after code edits but before proof.
- Makes migration and rollout risk explicit before live changes.

## Checklist

- What gate proves this specific risk?
- Can old and new code run together?
- For schema/data migrations, is the change expand/contract when mixed versions or shared environments exist?
- If the migration has not reached a shared environment, should branch-local migration churn be collapsed before merge?
- If the migration has reached a shared environment, is the next change append-only with a repair/rollback path?
- What is the rollback or disable path?
- What config, secret, cron, worker, queue, external service, or manual runbook step must exist before release?
- What smoke, dry-run, or production observation proves release readiness?
- What exact evidence is needed before calling it shipped?
