# URL and attribution review

- Keep one authoritative allowlist, predicate, or parser for URLs that may be mutated. Inline scripts and typed helpers should share that contract.
- Preserve valid non-HTTP schemes such as `mailto:` and `tel:`, protocol-relative URLs, relative URLs, malformed URLs, and hash-only links.
- Apply the same URL contract to analytics canonicalization and attribution mutation.
- When multiple layers handle links, test parity between DOM patchers, typed utilities, and public helpers.
