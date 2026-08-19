Use this guide when an Effect-facing module owns a third-party SDK boundary.

Follow these rules:
- Expose a single, consistent Effect-facing interface.
- Put raw client access behind an explicit boundary.
- Use the repo's chosen error-mapping style consistently.
- Separate construction from use.
- Keep the raw client private when exposing it would bypass tracing or typed errors.

The wrapper is complete when callers can use the supported operations without importing the raw SDK or bypassing the Effect contract.
