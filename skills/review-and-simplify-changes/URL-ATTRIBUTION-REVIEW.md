Read this only when the reviewed diff changes URLs, links, campaign attribution, analytics canonicalization, or CTA helpers.

- Keep one allowlist, predicate, or parser authoritative for which URLs may be mutated; inline scripts and typed helpers should share the same contract.
- Preserve valid non-HTTP schemes such as `mailto:` and `tel:`, protocol-relative URLs, relative URLs, malformed URLs, and hash-only links.
- Keep analytics canonicalization and attribution mutation aligned on the same URL contract.
- When multiple layers handle links, test parity between DOM patchers, typed utilities, and public helpers.
