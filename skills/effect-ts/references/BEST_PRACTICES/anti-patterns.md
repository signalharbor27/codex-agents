# Effect boundary review guide

Treat these as strong defaults for Effect-native application code, not universal bans. Follow current official Effect documentation and established repo conventions. Apply each warning only at the boundary named in its heading. Interoperability, bootstrap, test, and intentionally unrecoverable paths may warrant exceptions.

## Avoid running Effects inside Effect-native services

```typescript
export class UserService extends Effect.Service<UserService>()("UserService", {
    effect: Effect.gen(function* () {
        const findById = (id: UserId) => {
            // Running effects synchronously breaks composition
            const user = Effect.runSync(repo.findById(id))
            return user
        }
        return { findById }
    }),
}) {}
```

**Why:** This breaks Effect's composition model, bypasses error handling, cannot be tested, and loses tracing.

**Correct:**
```typescript
const findById = Effect.fn("UserService.findById")(function* (id: UserId) {
    return yield* repo.findById(id)
})
```

## Prefer typed failures inside Effect.gen

```typescript
yield* Effect.gen(function* () {
    const user = yield* repo.findById(id)
    if (!user) {
        throw new Error("User not found") // Bypasses Effect error channel
    }
    return user
})
```

**Why:** Throws bypass Effect's error channel, cannot be caught with `catchTag`, and weaken type safety.

**Correct:**
```typescript
yield* Effect.gen(function* () {
    const user = yield* repo.findById(id)
    if (!user) {
        return yield* Effect.fail(new UserNotFoundError({ userId: id, message: "Not found" }))
    }
    return user
})
```

## Preserve error information in broad handling

```typescript
yield* someEffect.pipe(
    Effect.catchAll((err) =>
        Effect.fail(new GenericError({ message: "Something failed" }))
    )
)
```

**Why:** Loses specific error information, makes debugging harder, prevents specific error handling downstream.

**Correct:**
```typescript
yield* someEffect.pipe(
    Effect.catchTags({
        DatabaseError: (err) => Effect.fail(new ServiceUnavailableError({ message: err.message })),
        ValidationError: (err) => Effect.fail(new BadRequestError({ message: err.message })),
    }),
)
```

## Decode untrusted data instead of casting

```typescript
const data = someValue as any
const result = (await fetch(url)) as unknown as MyType
```

**Why:** Completely bypasses type safety, can cause runtime errors, loses Effect's type guarantees.

**Correct:**
```typescript
// Use Schema for parsing unknown data
const result = yield* Schema.decodeUnknown(MyType)(someValue)

// Or explicit type guards
if (isMyType(someValue)) {
    // Now safely typed
}
```

## Keep Effect-native service signatures composable

```typescript
export class UserService extends Effect.Service<UserService>()("UserService", {
    effect: Effect.gen(function* () {
        return {
            findById: async (id: UserId): Promise<User> => {
                // Using Promise instead of Effect
            }
        }
    }),
}) {}
```

**Why:** Loses Effect's error handling, can't compose with other Effects, loses tracing/metrics.

**Correct:**
```typescript
const findById = Effect.fn("UserService.findById")(
    function* (id: UserId): Effect.Effect<User, UserNotFoundError> {
        // ...
    }
)
```

## Use the repo's logging boundary

```typescript
console.log("Processing order:", orderId)
console.error("Error:", error)
```

**Why:** Not structured, not captured by Effect's logging system, lost in production telemetry.

**Correct:**
```typescript
yield* Effect.log("Processing order", { orderId })
yield* Effect.logError("Operation failed", { error: String(error) })
```

## Normalize environment configuration at the boundary

```typescript
const apiKey = process.env.API_KEY
const port = parseInt(process.env.PORT || "3000")
```

**Why:** No validation, no type safety, fails silently if missing, hard to test.

**Correct:**
```typescript
const config = yield* Config.all({
    apiKey: Config.redacted("API_KEY"),
    port: Config.integer("PORT").pipe(Config.withDefault(3000)),
})
```

## Replace deprecated Config.secret

```typescript
const secretConfig = Config.all({
    apiKey: Config.secret("API_KEY"),
    dbPassword: Config.secret("DB_PASSWORD"),
})
```

**Why:** `Config.secret` is deprecated. Use `Config.redacted` instead, which provides the same functionality with better naming and can wrap any config type.

**Correct:**
```typescript
import { Config, Redacted } from "effect"

const secretConfig = Config.all({
    apiKey: Config.redacted("API_KEY"),           // Returns Redacted<string>
    dbPassword: Config.redacted("DB_PASSWORD"),
})

// Using redacted values
const program = Effect.gen(function* () {
    const { apiKey } = yield* secretConfig
    const key = Redacted.value(apiKey)  // Unwrap when needed
})

// Can wrap any config type
const secretNumber = Config.redacted(Config.integer("SECRET_PORT"))
//    ^? Redacted<number>
```

## Model domain absence deliberately

```typescript
type User = {
    name: string
    bio: string | null
    avatar: string | undefined
}
```

**Why:** Null/undefined handling is error-prone, loses the explicit "absence" semantics.

**Correct:**
```typescript
const User = Schema.Struct({
    name: Schema.String,
    bio: Schema.Option(Schema.String),
    avatar: Schema.Option(Schema.String),
})
```

## Handle Option absence explicitly

```typescript
const user = Option.getOrThrow(maybeUser)
const name = pipe(maybeName, Option.getOrThrow)
```

**Why:** Throws exceptions, bypasses Effect's error handling, fails at runtime instead of compile time.

**Correct:**
```typescript
// Handle both cases explicitly
yield* Option.match(maybeUser, {
    onNone: () => Effect.fail(new UserNotFoundError({ userId, message: "Not found" })),
    onSome: Effect.succeed,
})

// Or provide a default
const name = Option.getOrElse(maybeName, () => "Anonymous")

// Or use Option.map for transformations
const upperName = Option.map(maybeName, (n) => n.toUpperCase())
```

## Choose the service abstraction by repo convention

```typescript
export class UserService extends Context.Tag("UserService")<
    UserService,
    { findById: (id: UserId) => Effect.Effect<User, UserNotFoundError> }
>() {
    static Default = Layer.effect(this, Effect.gen(function* () { ... }))
}
```

**Why:** Requires manual layer creation, no built-in accessors, more boilerplate.

**Correct:**
```typescript
export class UserService extends Effect.Service<UserService>()("UserService", {
    accessors: true,
    dependencies: [...],
    effect: Effect.gen(function* () { ... }),
}) {}
```

## Reserve orDie for defects

```typescript
yield* someEffect.pipe(Effect.orDie)
```

**Why:** Converts recoverable errors to defects (unrecoverable), loses error information.

**Acceptable exceptions:**
- Truly unrecoverable situations (invalid program state)
- After exhausting all recovery options
- In test setup code

**Correct:**
```typescript
// Handle errors explicitly
yield* someEffect.pipe(
    Effect.catchTag("RecoverableError", (err) =>
        Effect.fail(new DomainError({ message: err.message }))
    ),
)
```

## Preserve error discrimination

```typescript
yield* effect.pipe(
    Effect.mapError((err) => new GenericError({ message: String(err) }))
)
```

**Why:** Loses error type information, can't discriminate between error types.

**Correct:**
```typescript
yield* effect.pipe(
    Effect.catchTag("SpecificError", (err) =>
        Effect.fail(new MappedError({ message: err.message }))
    ),
)
```

## Keep composition in one Effect program

```typescript
const result = await someEffect.pipe(
    Effect.runPromise,
).then(data => {
    // Mixing Promise chain with Effect
    return Effect.runPromise(anotherEffect(data))
})
```

**Why:** Loses Effect composition benefits, error handling becomes inconsistent.

**Correct:**
```typescript
const program = Effect.gen(function* () {
    const data = yield* someEffect
    return yield* anotherEffect(data)
})

const result = await Effect.runPromise(program)
```

## Use managed state for shared mutation

```typescript
let counter = 0
const increment = Effect.sync(() => { counter++ })
```

**Why:** Race conditions, not testable, not composable, breaks referential transparency.

**Correct:**
```typescript
const program = Effect.gen(function* () {
    const counter = yield* Ref.make(0)
    yield* Ref.update(counter, (n) => n + 1)
    return yield* Ref.get(counter)
})
```

## Inject time when determinism matters

```typescript
const now = new Date()
const timestamp = Date.now()
```

**Why:** Not testable, introduces non-determinism, hard to mock in tests.

**Correct:**
```typescript
import { Clock } from "effect"

const now = yield* Clock.currentTimeMillis
const date = yield* Clock.currentTimeZone.pipe(
    Effect.map((tz) => new Date())
)
```
