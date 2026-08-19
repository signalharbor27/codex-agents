# Testing Effect-TS with Vitest

Use this guide to write deterministic Effect-TS tests, especially with `@effect/vitest`.

## `it.effect` uses `TestClock`

`@effect/vitest`'s `it.effect` runs your test with a **TestContext** (including **`TestClock`**).

- Time starts at **0**.
- Time advances only when the test advances it.
- `Effect.sleep(...)`, `Schedule.spaced(...)`, retry backoff, and polling loops stall until you call `TestClock.adjust(...)`.

Use `it.live` when the test requires wall-clock time.

## Use the Effect clock instead of Date.now()

Production code that calls `Date.now()` is difficult or impossible to test deterministically with `TestClock`.

Prefer Effect's clock service:

```ts
import { Clock, Effect } from "effect";

const nowMillis = Clock.currentTimeMillis;

const program = Effect.gen(function* () {
  const now = yield* Clock.currentTimeMillis;
  return now;
});
```

`TestClock` can then control the code's time.

## Replace Effect.sleep with TestClock.adjust under it.effect

Instead of:

```ts
yield * Effect.sleep("50 millis");
```

do:

```ts
import { TestClock } from "effect";

yield * TestClock.adjust("50 millis");
```

If the test must use real timers, such as for Node timer integration, run the whole test with `it.live`.

## Testing retries, backoff, and scheduled loops

Retry schedules and `Schedule.spaced(...)` don't progress under `TestClock` unless you advance time.

Use this pattern:

```ts
import { Effect, Fiber, TestClock } from "effect";

const runWithTime = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  adjust: Parameters<typeof TestClock.adjust>[0] = "1000 millis"
) =>
  Effect.gen(function* () {
    const fiber = yield* Effect.fork(effect);
    yield* TestClock.adjust(adjust);
    return yield* Fiber.join(fiber);
  });
```

Advance enough time for the entire schedule or backoff chain to finish.

## Bound and clean up streams, watches, and background fibers

Most Effect test hangs come from one of these sources:

- A stream that never ends (`Stream.runCollect(stream)` on an infinite stream)
- A watch/polling loop forked and never interrupted
- A scoped resource that never gets finalized because the scope never closes

- Prefer bounded consumption: `Stream.take(stream, n)` / `Stream.takeUntil(...)`.
- If you fork a fiber, ensure it is interrupted on all paths:
  - `yield* Fiber.interrupt(fiber)`
  - or run it inside a `Scope` and let scope finalizers do the cleanup.
- Consider `Effect.timeout(...)` / `Effect.timeoutFail(...)` around anything that could block.

## Effect.fork does not mean the fiber has started

When you write a test like:

- fork two or three fibers
- then immediately `Deferred.succeed(gate, ...)`

This does not guarantee that the forked fibers have reached the code you intend to coordinate, such as `Deferred.await(gate)`.

`Effect.fork` creates a fiber and schedules it, but the scheduler may not run it until later. If you open the gate too early:

- each fiber can observe the gate as already-open
- your “concurrent” test can become **effectively sequential**
- assertions like “underlying effect executed once” can fail intermittently even though the implementation is correct

### Deterministic pattern: started latch and gate

If you need to ensure real overlap, add a second `Deferred` that the underlying effect completes as soon as it begins:

```ts
import { Deferred, Effect, Fiber } from "effect";

Effect.gen(function* () {
  let executions = 0;

  const started = yield* Deferred.make<void>();
  const gate = yield* Deferred.make<void>();

  const underlying = Effect.gen(function* () {
    executions++;
    // Signal we actually started executing (at least one fiber is “in” now)
    yield* Deferred.succeed(started, undefined);
    // Block here to force overlap
    yield* Deferred.await(gate);
    return "ok";
  });

  const f1 = yield* Effect.fork(underlying);
  const f2 = yield* Effect.fork(underlying);

  // Don't open the gate until at least one fiber definitely started
  yield* Deferred.await(started);
  yield* Deferred.succeed(gate, undefined);

  yield* Fiber.join(f1);
  yield* Fiber.join(f2);

  // Now it's safe to assert expectations about overlap / dedup / sharing
  // expect(executions).toBe(1)
});
```

The started latch proves that a fiber reached the coordinated section before the gate opens, so the concurrency assertion cannot pass through accidental sequencing.

## Use it.scoped for scoped resources

If your test (or the code under test) uses `Effect.acquireRelease`, `Stream.asyncScoped`, resourceful Layers, etc.,
prefer `it.scoped` / `it.scopedLive` so finalizers are guaranteed to run when the test completes.

## Stay within the test runtime

Avoid calling `Effect.runPromise(...)` (or similar “run” APIs) _inside_ an `it.effect` program to drive internal logic.
It can accidentally run work on a different runtime (e.g. a live clock), defeating `TestClock` determinism.

Prefer staying inside the Effect you're already running:

- pass `Effect`s around and `yield*` them
- if you truly need a Promise boundary, do it at the test boundary, not mid-program

## Quick choices

- Uses timeouts/sleeps/retries/polling? → `it.effect` + `TestClock.adjust(...)`
- Needs wall clock / Node timers / real delays? → `it.live` (or `it.scopedLive`)
- Allocates resources that must be finalized? → `it.scoped` / `it.scopedLive`
