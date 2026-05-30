# API Compatibility

Read this when public interfaces, SDKs, web APIs, events, schemas, or cross-service contracts are touched.

## Core Concepts

- Backward compatibility beats internal cleanliness for published contracts.
- Error shape, status codes, pagination, idempotency, and nullability are API surface.
- Additive changes are safer than changing meaning in place.
- Version or expand/contract when consumers may already depend on old behavior.
- Internal contracts count when other modules, jobs, generated artifacts, support workflows, or stored data depend on them.

## Agentic Coding Use

- Prevents silent public-contract regressions.
- Forces agents to inspect callers and consumers before editing interfaces.
- Keeps generated examples, docs, and tests aligned with real behavior.

## Checklist

- Who consumes this interface?
- What fields, errors, ordering, or retry semantics are observable?
- Is the change additive, breaking, or ambiguous?
- What compatibility test or fixture proves the contract?
- Are RPC/tRPC/GraphQL inputs, webhook events, queue messages, enum values, metadata keys, CLI flags, generated docs, or config names affected?
- Can old and new producers/consumers run together during deploy?
- Does stored data created by the old code still read correctly?
- If the public name changes, what alias, migration, or deprecation path protects existing consumers?
