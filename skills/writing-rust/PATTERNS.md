# Data Modeling and Implementation Patterns

> Read this when the main decision is type shape, ownership, trait boundaries, or impl organization.
> Use it to compare alternatives; do not import a pattern without naming the constraint it solves.

Patterns for designing data structures, traits, and impl organization.

## Choosing Data Structures

### Struct

Use when you have multiple related fields that together form a concept.

```rust
#[derive(Debug, Clone)]
pub struct User {
    pub id: UserId,
    pub name: String,
    pub email: Option<Email>,
    pub created_at: DateTime<Utc>,
}
```

### Enum

Use for mutually exclusive states or state machines. Prefer over boolean flags.

```rust
// DO: enum for states
pub enum ConnectionState {
    Disconnected,
    Connecting { attempt: u32 },
    Connected { session_id: SessionId },
    Reconnecting { last_error: Error },
}

// DON'T: multiple booleans
pub struct Connection {
    is_connected: bool,
    is_connecting: bool,
    is_reconnecting: bool,  // invalid states possible
}
```

### Newtype

Wrap primitives for type safety and semantic meaning.

```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct UserId(String);

#[derive(Debug, Clone)]
pub struct Email(String);

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Milliseconds(u64);

// Prevents: send_email(user_id, email) vs send_email(email, user_id)
```

## Ownership Decisions

### `&str` vs `String`

```rust
// Borrowed: for read-only access, no allocation
fn greet(name: &str) { println!("Hello, {name}"); }

// Owned: when storing or modifying
struct User { name: String }
```

### Slices vs `Vec`

```rust
// Borrowed slice: for read-only iteration
fn sum(values: &[i32]) -> i32 { values.iter().sum() }

// Owned vec: when building or storing
fn collect_even(values: &[i32]) -> Vec<i32> {
    values.iter().copied().filter(|x| x % 2 == 0).collect()
}
```

### `Arc<T>` for Shared Ownership

```rust
// When data is shared across threads or has multiple owners
use std::sync::Arc;

struct SharedState {
    data: Arc<Data>,
}

impl Clone for SharedState {
    fn clone(&self) -> Self {
        Self { data: Arc::clone(&self.data) }
    }
}
```

### `Cow<'a, T>` for Flexible Ownership

```rust
use std::borrow::Cow;

// Avoids allocation when input doesn't need modification
fn normalize(input: &str) -> Cow<'_, str> {
    if input.contains(' ') {
        Cow::Owned(input.replace(' ', "_"))
    } else {
        Cow::Borrowed(input)
    }
}
```

## Impl Organization

Place `impl` blocks immediately below the struct/enum.

```rust
#[derive(Debug, Clone)]
pub struct User {
    id: UserId,
    name: String,
}

impl User {
    // 1. Constructors
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            id: UserId::generate(),
            name: name.into(),
        }
    }

    pub fn with_id(id: UserId, name: impl Into<String>) -> Self {
        Self { id, name: name.into() }
    }

    // 2. Getters
    pub fn id(&self) -> &UserId { &self.id }
    pub fn name(&self) -> &str { &self.name }

    // 3. Mutation methods
    pub fn set_name(&mut self, name: impl Into<String>) {
        self.name = name.into();
    }

    // 4. Domain logic
    pub fn is_admin(&self) -> bool {
        self.id.is_admin_id()
    }

    // 5. Helpers (private)
}

// Standard trait implementations
impl Display for User {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} ({})", self.name, self.id)
    }
}
```

## Standard Trait Implementations

### Conversion Traits

```rust
// From: infallible conversion
impl From<String> for UserId {
    fn from(s: String) -> Self {
        Self(s)
    }
}

// TryFrom: fallible conversion
impl TryFrom<&str> for Email {
    type Error = EmailError;

    fn try_from(s: &str) -> Result<Self, Self::Error> {
        if s.contains('@') {
            Ok(Self(s.to_string()))
        } else {
            Err(EmailError::MissingAt)
        }
    }
}
```

### Display and Debug

```rust
// Debug: for developers (derive when possible)
#[derive(Debug)]
pub struct Config { ... }

// Display: for users
impl Display for UserId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "user:{}", self.0)
    }
}
```

### Default

```rust
impl Default for Config {
    fn default() -> Self {
        Self {
            timeout: Duration::from_secs(30),
            retries: 3,
            verbose: false,
        }
    }
}
```

## Builder Pattern

Use when constructors have many optional parameters.

```rust
#[derive(Debug, Clone)]
pub struct Request {
    url: String,
    method: Method,
    headers: HashMap<String, String>,
    timeout: Duration,
}

#[derive(Debug, Default)]
pub struct RequestBuilder {
    url: Option<String>,
    method: Method,
    headers: HashMap<String, String>,
    timeout: Option<Duration>,
}

impl RequestBuilder {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn url(mut self, url: impl Into<String>) -> Self {
        self.url = Some(url.into());
        self
    }

    pub fn method(mut self, method: Method) -> Self {
        self.method = method;
        self
    }

    pub fn header(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.headers.insert(key.into(), value.into());
        self
    }

    pub fn timeout(mut self, timeout: Duration) -> Self {
        self.timeout = Some(timeout);
        self
    }

    pub fn build(self) -> Result<Request, BuilderError> {
        Ok(Request {
            url: self.url.ok_or(BuilderError::MissingUrl)?,
            method: self.method,
            headers: self.headers,
            timeout: self.timeout.unwrap_or(Duration::from_secs(30)),
        })
    }
}
```

## Module Organization

- Organize by ownership and domain boundaries
- Use `pub(crate)` over `pub` when possible
- Keep APIs small; avoid leaking internal types

```rust
// lib.rs
pub mod user;       // public API
pub mod config;     // public API

mod internal;       // private implementation
mod utils;          // private helpers

pub use user::User;
pub use config::Config;
```

## Invariants with Types

Model invariants explicitly using types.

```rust
use std::num::NonZeroU32;

// Can't be zero - enforced by type system
pub struct Pagination {
    pub page: NonZeroU32,
    pub per_page: NonZeroU32,
}

// Can't be empty - enforced at construction
pub struct NonEmptyVec<T>(Vec<T>);

impl<T> NonEmptyVec<T> {
    pub fn new(first: T) -> Self {
        Self(vec![first])
    }

    pub fn from_vec(vec: Vec<T>) -> Option<Self> {
        if vec.is_empty() {
            None
        } else {
            Some(Self(vec))
        }
    }

    pub fn first(&self) -> &T {
        // Safe: invariant guarantees non-empty
        &self.0[0]
    }
}
```
