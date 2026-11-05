---
name: project-verification
description: "Use when creating, auditing, or repairing a project's repeatable verification runbook, harness, or feature map, including when a change adds behavior no recipe covers. Excludes routine check execution, product fixes, and test design."
---

# Project verification

## Overview

Build or maintain project-local instructions that another agent can execute and check. Keep reusable decision rules here; put commands, selectors, ports, credential requirements, expected effects, and feature coverage in the consuming repository.

Audit requests stay read-only. Authoring and maintenance requests authorize scoped, reversible runbook or harness changes and their verification.

## When to Use

- Making a feature's verification repeatable by another agent: authoring or maintenance.
- Engineering's verification gate found no recipe covering a change's behavior: authoring or maintenance for that behavior.
- Checking whether an existing runbook, harness, or feature map still matches the project: audit.

## When Not to Use

- Product repairs: use `engineering` or `debugging`, under the user's existing authorization.
- Designing test coverage: use `test-design`.
- Running an established recipe: use the verifier role, without rewriting the recipe.

## Minimal Workflow

1. Choose the branch (audit, authoring, or maintenance) and read its reference under Reference Routing. Done when the branch and its permitted changes are named.
2. Find the project's existing launchers, test tools, and documentation locations, and build on them. Add a harness only for a demonstrated gap. Keep one source of truth for commands already owned by project tooling. Done when every command the recipe needs points at existing project tooling or at a demonstrated gap.
3. Measure each recipe against the [required result](#required-result). In an audit, compare and propose repairs; in authoring or maintenance, write or repair the recipe. Driving shared services, installing host software, publishing changes, or deploying requires the applicable authorization; a request to make verification repeatable does not grant it. Keep secrets out of recipes and captured evidence. Done when an audit names each required-result gap with a proposed repair, or every authored or maintained runnable recipe covers each required-result item.
4. Before calling a generated or materially changed recipe ready, have a fresh agent execute a representative path from the written instructions against isolated state. Give it repository guidance, the recipe, the acceptance goal, and authorized access, without private setup hints. Check its artifacts and command evidence, repair omissions, and repeat the affected portion. If a fresh agent or required environment is unavailable, report the recipe as drafted or partially verified. Done when a fresh agent's run passes from the written instructions alone, or the recipe is reported as drafted or partially verified.
5. Report the artifact locations, exercised coverage, remaining gaps, evidence retained after cleanup, and any product defect or authority blocker. An audit finishes with findings; an authored recipe finishes with demonstrated execution and honest coverage limits. Done when each item is present or marked none.

## Required result

Every runnable recipe identifies:

- Prerequisites, working directory, configuration, and isolated test state.
- Launch or attachment instructions with observable readiness, expected build, and instance ownership checks before driving it.
- A real user, API, or CLI path with concrete inputs and observable success and failure criteria.
- Evidence paths that survive cleanup, plus the revision, configuration, commands, and results needed to interpret them.
- Cleanup limited to resources owned by this run, including recovery after a partial failure.

A listening port or healthy response alone proves neither ownership nor build identity. Refuse to drive or terminate an instance whose identity cannot be established. Give concurrent workers isolated state; assign one driver when they must share mutable application state.

Keep a feature map proportionate to the request. Distinguish executed paths, failed paths, blocked paths, and unexercised paths. A working launch or one successful path does not validate the rest of the map.

## Reference Routing

- Read [authoring.md](references/authoring.md) when creating or extending a recipe.
- Read [maintenance.md](references/maintenance.md) when auditing drift or repairing an existing recipe.

## Provenance

Inspired by pstack's [create-verification-skill](https://github.com/cursor/plugins/blob/6ed0f7a9504f577d7529064103cecce9be7dfc5e/pstack/skills/create-verification-skill/SKILL.md) and [maintain-verification-skill](https://github.com/cursor/plugins/blob/6ed0f7a9504f577d7529064103cecce9be7dfc5e/pstack/skills/maintain-verification-skill/SKILL.md), v0.15.2. Adapted for Codex and project-local tooling.
