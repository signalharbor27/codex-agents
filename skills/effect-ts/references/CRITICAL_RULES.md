# Critical rules for Effect-TS

These rules cover common Effect mistakes and explain the idiomatic alternative.

## Ineffective: try-catch in Effect.gen

Do not use `try-catch` inside `Effect.gen` to handle Effect failures. Effect failures return as exits rather than JavaScript exceptions; `try-catch` sees only synchronous throws from non-Effect code.

**Problematic:**

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

**Correct:**

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

## Avoid type assertions

Avoid `as never`, `as any`, and `as unknown` assertions. They bypass TypeScript's checks and conceal the actual mismatch. Fix the generic, constructor, import, or function signature that caused the error instead.

**Patterns to avoid:**

```typescript
const value = something as any;
const value = something as never;
const value = something as unknown;
```

**Correct approach:**

- Use proper generic type parameters
- Import correct types from Effect
- Use proper Effect constructors and combinators
- Adjust function signatures to match usage

Note: This is general TypeScript guidance. Occasional assertions may be justified when interfacing with poorly-typed
external libraries, but document the reason.

## Recommended: return `yield*` for errors

Use `return yield*` for errors or interrupts in `Effect.gen`. A failed yield halts with or without `return`, but the explicit return shows that the branch terminates and avoids unreachable-code warnings.

**Recommended:**

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

**Acceptable but less clear:**

```typescript
Effect.gen(function* () {
  if (someCondition) {
    yield* Effect.fail("error message");
    // Runtime halts here, but looks like code might continue
  }
});
```

## Null versus Option<T>

**Use `Option<T>` internally, `T | null` at boundaries.**

- Internal Effect computations → `Option<T>`
- React state/props → `T | null`
- JSON serialization → `T | null` or `T | undefined`
- External API responses → normalize to `Option<T>` at boundary

See `OPTION_NULL.md` for detailed patterns.
