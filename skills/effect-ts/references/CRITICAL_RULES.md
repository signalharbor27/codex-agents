# Critical rules for Effect-TS

## Handle failures with Effect combinators inside Effect.gen

Inside `Effect.gen`, handle Effect failures with Effect combinators. A failed Effect returns as an exit, not a JavaScript exception, so `try-catch` there sees only synchronous throws from non-Effect code.

Problematic:

```typescript
Effect.gen(function* () {
  try {
    const result = yield* someEffect;
  } catch (error) {
    // This catches synchronous throws only, NOT Effect failures
    // Effect failures bypass this entirely
  }
});
```

Correct:

```typescript
Effect.gen(function* () {
  const result = yield* Effect.result(someEffect);
  if (result._tag === "Failure") {
    // Handle error case
  }
});
```

Alternative patterns:

- `Effect.catchAll` / `Effect.catchTag` for error recovery
- `Effect.result` to inspect success/failure
- `Effect.tryPromise` / `Effect.try` for wrapping external code

## Fix the type instead of asserting it

Fix the generic type parameter, constructor or combinator, import, or function signature that caused a type error. `as never`, `as any`, and `as unknown` bypass TypeScript's checks and hide the mismatch.

Patterns to replace:

```typescript
const value = something as any;
const value = something as never;
const value = something as unknown;
```

This is general TypeScript guidance. An assertion can be justified at a poorly typed external library; document the reason beside it.

## Use `return yield*` for errors and interrupts

Use `return yield*` for errors or interrupts in `Effect.gen`. A failed yield halts with or without `return`, but the explicit return shows that the branch terminates and avoids unreachable-code warnings.

Recommended:

```typescript
Effect.gen(function* () {
  if (someCondition) {
    return yield* Effect.fail("error message");
  }

  if (shouldInterrupt) {
    return yield* Effect.interrupt;
  }

  const result = yield* someOtherEffect;
  return result;
});
```

Acceptable but less clear:

```typescript
Effect.gen(function* () {
  if (someCondition) {
    yield* Effect.fail("error message");
    // Runtime halts here, but looks like code might continue
  }
});
```

## Null versus Option<T>

`OPTION_NULL.md` holds the boundary rule and its normalization patterns.
