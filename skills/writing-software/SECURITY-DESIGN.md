# Security Design

Read this when auth, permissions, secrets, external input, payments, webhooks, files, SSRF, or data exposure are involved.

Source family: threat modeling and secure-by-design practices.

## Core Concepts

- Trust boundaries and attacker-controlled input
- Authentication vs authorization
- Least privilege and secure defaults
- Secret handling and redaction
- Fail closed for protected operations

## Agentic Coding Use

- Forces agents to inspect abuse paths, not only expected use.
- Prevents leaking internals through errors, logs, or user-visible responses.
- Keeps safety checks near the boundary they protect.

## Checklist

- Who can call this path?
- What input is attacker-controlled?
- What data or operation needs authorization?
- What error/log output could leak internals?
- Does the failure mode deny safely?
