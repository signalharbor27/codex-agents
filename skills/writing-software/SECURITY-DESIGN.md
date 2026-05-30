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
- What replay, duplicate submission, brute force, quota abuse, trial abuse, payment abuse, invitation abuse, or webhook forgery path exists?
- What binding proves the request belongs to this user/account/resource and has not already been consumed?
- Are timestamps, signatures, nonces, idempotency keys, amounts, recipients, filenames, URLs, and redirect targets validated at the boundary?
- Are privileged operations least-privilege and isolated from user-controlled parameters?
- What error/log output could leak internals?
- Does the failure mode deny safely?
