# TypeScript contracts

Load this when schema ownership, inference, semantic IDs, assertions, or exhaustiveness affect the contract. Follow the repository's schema, brand, and Effect conventions; avoid introducing a second validation system.

- Infer types from the schema that owns runtime validation when the existing library supports it. Keep separate transport and domain types when they express different contracts.
- Brand a primitive when confusing its meaning creates a real error, such as passing an order ID where a user ID belongs. Keep validation and construction with its owner. A brand alone does not validate a runtime value.
- Narrow unknown input at ingress. Confine assertions to boundaries with a stated proof; `as`, non-null assertions, and `satisfies` do not perform runtime validation.
- Use a discriminated union for materially different states and check exhaustive handling where missing a variant would break behavior. Types do not establish concurrency or authorization guarantees.
- Treat collection guarantees as ownership claims. A readonly non-empty tuple protects ordinary typed access, but a mutable alias can invalidate it. Copy or otherwise control mutation when the guarantee must persist. An arbitrary numeric index can still be absent with `noUncheckedIndexedAccess`.

## A checked constructor

This standalone example shows a local brand when the project has no existing constructor convention. Its assertion follows a finite, nonnegative runtime check; a plain number brand would also accept negative durations through unchecked casts.

```ts
declare const milliseconds: unique symbol;
type Milliseconds = number & { readonly [milliseconds]: true };

function parseMilliseconds(value: unknown): Milliseconds {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new RangeError("Expected finite, nonnegative milliseconds");
  }
  return value as Milliseconds;
}

function nonEmptyCopy<T>(first: T, ...rest: T[]): readonly [T, ...T[]] {
  const values: [T, ...T[]] = [first, ...rest];
  return Object.freeze(values);
}

const values = nonEmptyCopy("first", "second");
const first: string = values[0];
const maybe: string | undefined = values[Number("2")];
// @ts-expect-error Arbitrary indexed access may be absent.
const certain: string = values[Number("2")];
// @ts-expect-error Construction must pass through the checked boundary.
const unchecked: Milliseconds = -1;
```

Check examples under the consuming project's compiler version and options. These examples compile with TypeScript 5.9.3, `strict`, `noUncheckedIndexedAccess`, and `target: ES2022`; the expected-error comments are functional negative tests. Exercise constructor rejection at runtime too. Freezing this array preserves its length and elements, but does not freeze objects stored inside it.
