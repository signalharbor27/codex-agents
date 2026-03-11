Read this when wrapping a third-party SDK inside Effect.

Guidelines:
- expose one consistent Effect-facing interface
- keep raw client access behind an explicit boundary
- choose one error mapping style for the repo and stick to it
- keep construction separate from use
- do not leak the raw client if that bypasses tracing or typed errors
