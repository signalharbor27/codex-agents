# rust-analyzer Structural Search and Replace (SSR)

> Read this when a Rust refactor spans many sites and compiler-assisted, semantic replacement is safer than manual edits.
> Prefer SSR after the target pattern and verification path are explicit.

Semantic code transformations for codebase-wide refactoring. SSR matches by AST structure and semantic meaning, understanding type resolution and path equivalence.

## When to Use

- Refactoring patterns across a codebase (rename, restructure, migrate APIs)
- Converting between equivalent forms (UFCS to method calls, struct literals to constructors)
- Finding all usages of a specific code pattern
- Semantic-aware search that understands type resolution

## Basic Syntax

```
<search_pattern> ==>> <replacement_pattern>
```

Placeholders capture matched code:
- `$name` - matches any expression/type/pattern in that position
- `${name:constraint}` - matches with constraints

## Common Patterns

### Swap function arguments

```
foo($a, $b) ==>> foo($b, $a)
```

### Convert struct literal to constructor

```
Foo { a: $a, b: $b } ==>> Foo::new($a, $b)
```

### UFCS to method call

```
Foo::method($receiver, $arg) ==>> $receiver.method($arg)
```

### Method to UFCS

```
$receiver.method($arg) ==>> Foo::method($receiver, $arg)
```

### Wrap in Result

```
Option<$t> ==>> Result<$t, Error>
```

### Unwrap to expect

```
$e.unwrap() ==>> $e.expect("TODO")
```

### Match only literals

```
Some(${a:kind(literal)}) ==>> ...
```

### Match non-literals

```
Some(${a:not(kind(literal))}) ==>> ...
```

### Change field access

```
$s.foo ==>> $s.bar
```

### Reorder struct fields

```
Foo { a: $a, b: $b } ==>> Foo { b: $b, a: $a }
```

### Generic type transformation

```
Vec<$t> ==>> SmallVec<[$t; 4]>
```

### Convert Option methods

```
$o.map_or(None, Some) ==>> $o
```

## Constraints

| Constraint | Matches |
|------------|---------|
| `kind(literal)` | Literal values: `42`, `"foo"`, `true` |
| `not(...)` | Negates inner constraint |

## How to Invoke

### Via Comment Assist (Interactive)

Write a comment containing an SSR rule, then trigger code actions:

```rust
// foo($a, $b) ==>> bar($b, $a)
```

Actions appear: "Apply SSR in file" or "Apply SSR in workspace"

### Via LSP Command

```json
{
  "command": "rust-analyzer.ssr",
  "arguments": [{
    "query": "foo($a) ==>> bar($a)",
    "parseOnly": false
  }]
}
```

### Via CLI

```bash
rust-analyzer ssr 'foo($a, $b) ==>> bar($b, $a)'
```

## Key Behaviors

**Path Resolution**: Paths match semantically. `foo::Bar` matches `Bar` if imported from `foo`.

**Auto-qualification**: Replacement paths are qualified appropriately for each insertion site.

**Parenthesization**: Automatic parens added when needed (e.g., `$a + $b` becoming `($a + $b).method()`).

**Comment Preservation**: Comments within matched ranges are preserved.

## Macro Handling

SSR can match code inside macro expansions, but with restriction: **all matched tokens must originate from the same source**.

```rust
macro_rules! my_macro {
    ($x:expr) => {
        foo($x, 42)  // "42" comes from macro definition
    };
}

my_macro!(bar);  // "bar" comes from call site
```

The expanded code is `foo(bar, 42)`. Searching for `foo($a, $b)` would **NOT** match because `$a` would capture `bar` (call site) but `$b` would capture `42` (definition site) - these cross the macro boundary.

### What SSR CAN Do With Macros

- Match code entirely within macro arguments
- Match the macro call itself: `my_macro!($x)`
- Match expanded code where all tokens come from call-site arguments

## Limitations

- Constraints limited to `kind(literal)` and `not()`
- Single-identifier patterns may be filtered if ambiguous
- Cannot modify `use` declarations with braces

## Migration Examples

### API Migration

```
// Old API to new API
old_api::fetch($url) ==>> new_api::request($url).send()
```

### Error Handling Migration

```
// Migrate from unwrap to proper error handling
$e.unwrap() ==>> $e.context("operation failed")?
```

### Async Migration

```
// Blocking to async
std::fs::read_to_string($path) ==>> tokio::fs::read_to_string($path).await
```
