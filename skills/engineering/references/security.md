# Security

Load this for auth, permissions, secrets, attacker-controlled input, abuse, replay, or sensitive data.

## Draw the Trust Boundary

Name:

- caller identity and authentication evidence;
- resource owner and authorization rule;
- attacker-controlled fields;
- sensitive data or privileged effect;
- replay/duplicate window;
- safe failure and audit signal.

Validate and normalize at the boundary. Bind the request to the authenticated account, resource, amount, recipient, nonce, timestamp, or redirect target that the operation actually authorizes.

## Decision Rules

- Authentication does not imply authorization.
- Prefer deny-by-default and least privilege for protected operations.
- Verify signatures before parsing or acting on trusted webhook fields.
- Make one-time or replay-sensitive operations durably consumable exactly once from the business perspective.
- Keep secrets and sensitive payloads out of logs, errors, URLs, and generated artifacts.
- Use framework/library security primitives instead of custom cryptography or parsers.

Consider concrete abuse relevant to the feature: tenant crossing, IDOR, forged events, replay, quota/payment/trial abuse, brute force, SSRF, path traversal, unsafe redirects, and privilege escalation.

## Agent Guardrails

Do not add generic security infrastructure without a present threat. Do not “fail open” to preserve UX on a privileged path. When security depends on a library or service version, verify its current documented contract.

## Source Basis

- OWASP ASVS and OWASP Cheat Sheet Series: boundary validation, access control, secrets, SSRF, and webhook guidance.
- Jerome Saltzer and Michael Schroeder, “The Protection of Information in Computer Systems”: least privilege, complete mediation, and fail-safe defaults.
