# Rust Coding Style

> Read this when the active question is code shape: control flow, matching, naming, comments, or review-level idioms.
> Keep repo-local conventions ahead of any generic preference in this file.

Complete style rules for idiomatic Rust.

## Control Flow: Use `for` Loops

Write `for` loops with mutable accumulators instead of iterator chains.

```rust
// DO
let mut results = Vec::new();
for item in items {
    if item.is_valid() {
        results.push(item.process());
    }
}

// DON'T
let results: Vec<_> = items
    .iter()
    .filter(|item| item.is_valid())
    .map(|item| item.process())
    .collect();

// DO
let mut total = 0;
for value in values {
    total += value.amount();
}

// DON'T
let total: i64 = values.iter().map(|v| v.amount()).sum();

// DO
let mut found = None;
for item in items {
    if item.matches(query) {
        found = Some(item);
        break;
    }
}

// DON'T
let found = items.iter().find(|item| item.matches(query));
```

## Early Returns: Use `let ... else`

Extract values and exit early on failure. Keeps happy path unindented.

```rust
// DO
let Some(user) = get_user(id) else {
    return Err(Error::NotFound);
};
let Ok(session) = user.active_session() else {
    return Err(Error::NoSession);
};
// continue with user and session

// DON'T
if let Some(user) = get_user(id) {
    if let Ok(session) = user.active_session() {
        // deeply nested code
    } else {
        return Err(Error::NoSession);
    }
} else {
    return Err(Error::NotFound);
}

// DO: in loops
let Some(value) = maybe_value else { continue };
let Ok(parsed) = input.parse::<i32>() else { continue };
```

## Pattern Matching: Minimize `if let`

Use `if let` only when the `Some`/`Ok` branch is short and there's no else branch.

```rust
// ACCEPTABLE: short action, no else
if let Some(callback) = self.on_change {
    callback();
}

// DO: use let-else when you need the value
let Some(config) = load_config() else {
    return default_config();
};

// DO: use match for multiple cases
match result {
    Ok(value) => process(value),
    Err(Error::NotFound) => use_default(),
    Err(e) => return Err(e),
}
```

## Variable Naming: Shadow, Don't Rename

Shadow variables through transformations. Avoid prefixes like `raw_`, `parsed_`, `trimmed_`.

```rust
// DO
let input = get_raw_input();
let input = input.trim();
let input = input.to_lowercase();
let input = parse(input)?;

// DON'T
let raw_input = get_raw_input();
let trimmed_input = raw_input.trim();
let lowercase_input = trimmed_input.to_lowercase();
let parsed_input = parse(lowercase_input)?;

// DO
let path = args.path;
let path = path.canonicalize()?;
let path = path.join("config.toml");

// DON'T
let input_path = args.path;
let canonical_path = input_path.canonicalize()?;
let config_path = canonical_path.join("config.toml");
```

## Comments: Don't Write Them

- No inline comments explaining what code does
- No section headers or dividers (`// --- Section ---`)
- No TODO comments (use issue tracker)
- No commented-out code (use version control)

**Exception**: Doc comments (`///`) on public items are required.

```rust
// DON'T
// Check if user is valid
if user.is_valid() {
    // Update the timestamp
    user.touch();
}

// --- Helper functions ---

// TODO: refactor this later
fn helper() { }

// Old implementation:
// fn old_way() { }

// DO
if user.is_valid() {
    user.touch();
}

fn helper() { }
```

## Type Safety: Newtypes Over Primitives

Wrap strings/integers in newtypes for semantic meaning.

```rust
// DO
struct UserId(String);
struct Email(String);

fn send_email(to: Email, from: UserId) { }

// DON'T
fn send_email(to: String, from: String) { }
```

## Type Safety: Enums Over Bools

Use enums with meaningful variant names instead of `bool` parameters.

```rust
// DO
enum Visibility {
    Public,
    Private,
}

fn create_repo(name: &str, visibility: Visibility) { }

// DON'T
fn create_repo(name: &str, is_public: bool) { }

// DO
enum Direction {
    Forward,
    Backward,
}

fn traverse(dir: Direction) { }

// DON'T
fn traverse(forward: bool) { }
```

## Pattern Matching: Never Use Wildcards

Always match all variants explicitly to get compiler errors when variants are added.

```rust
// DO
match status {
    Status::Pending => handle_pending(),
    Status::Active => handle_active(),
    Status::Completed => handle_completed(),
}

// DON'T
match status {
    Status::Pending => handle_pending(),
    _ => handle_other(),
}
```

If a wildcard seems necessary, **ask the user before using it**.

## Pattern Matching: Avoid `matches!` Macro

Use full `match` expressions. Full matches provide better compiler diagnostics when the matched type changes.

```rust
// DO
let is_ready = match state {
    State::Ready => true,
    State::Pending => false,
    State::Failed => false,
};

// DON'T
let is_ready = matches!(state, State::Ready);
```

## Destructuring: Always Use Explicit Destructuring

Destructure structs and tuples explicitly to get compiler errors when fields change.

```rust
// DO
let User { id, name, email } = user;
process(id, name, email);

// DON'T
process(user.id, user.name, user.email);

// DO
for Entry { key, value } in entries {
    map.insert(key, value);
}

// DON'T
for entry in entries {
    map.insert(entry.key, entry.value);
}
```

## Error Handling

- Prefer `Result<T, E>` over panicking
- Use `?` for propagation
- Keep functions short to help lifetime inference
- Add `.context("description")` for error context (with `anyhow`)

```rust
// DO
pub fn load_config(path: &Path) -> Result<Config> {
    let content = fs::read_to_string(path)
        .context("failed to read config file")?;
    let config = toml::from_str(&content)
        .context("failed to parse config")?;
    Ok(config)
}

// DON'T
pub fn load_config(path: &Path) -> Config {
    let content = fs::read_to_string(path).unwrap();
    toml::from_str(&content).unwrap()
}
```
