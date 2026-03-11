# Defensive Programming

Read this when choosing validation, assertions, recoverability, or exception semantics.

Protecting code against invalid inputs and programmer errors.

## Contents
- Error Handling Strategy
- Assertions
- Exceptions
- Validation
- Barricades

---

## Error Handling Strategy

### Error Categories

| Category | Cause | Response |
|----------|-------|----------|
| User error | Invalid input | Validate, return friendly error |
| Programmer error | Bug in code | Assert, fail fast |
| External error | Network, disk, service | Handle gracefully, retry/degrade |
| Resource error | Out of memory/disk | Release resources, report |

### Choose Response Strategy

```
Is this a programming error?
  → Assert / panic (fail fast)

Can the caller recover?
  → Return error value or Result

Is retry likely to succeed?
  → Retry with backoff

Is degraded mode acceptable?
  → Fall back to default behavior

None of the above?
  → Throw exception with context
```

### Error Response Options

| Option | When to Use |
|--------|-------------|
| Return neutral value | Benign, can continue (empty list, zero) |
| Return same as previous | Cached data acceptable |
| Return closest legal value | Clamping (max(0, input)) |
| Log and continue | Error is reportable but not fatal |
| Return error code | Caller expects to handle errors |
| Throw exception | Caller should handle but might not |
| Abort/crash | Continuing would cause worse problems |

---

## Assertions

### When to Use

Assertions document and verify programmer assumptions.

**Assert for**:
- Input parameter ranges (internal functions)
- Values that "can't happen"
- Post-conditions of methods
- Class invariants

**Don't assert for**:
- User input (validate instead)
- Expected error conditions
- Conditions that can legitimately occur

### Assertion Guidelines

**Use for impossible conditions**:
```
switch (status) {
    case PENDING: return handlePending()
    case COMPLETE: return handleComplete()
    default:
        assert(false, `Unknown status: ${status}`)
}
```

**Document assumptions**:
```
// This function assumes array is sorted
assert(isSorted(array), "Input must be sorted")
```

**Check pre/post conditions**:
```
function sqrt(x) {
    assert(x >= 0, "sqrt requires non-negative input")
    const result = Math.sqrt(x)
    assert(result * result ≈ x, "sqrt postcondition failed")
    return result
}
```

### Assertions vs Errors

| Aspect | Assertion | Error Handling |
|--------|-----------|----------------|
| Purpose | Catch programmer errors | Handle runtime conditions |
| Production | May be disabled | Must remain |
| Recovery | Not expected | Should be possible |
| Input type | Internal/trusted | External/untrusted |

---

## Exceptions

### When to Throw

Throw exceptions for:
- Conditions caller should handle but might forget
- Errors that can't be communicated via return value
- Constructor failures (can't return error)

Don't throw for:
- Normal control flow
- Conditions that are easily avoidable
- Every possible error (be pragmatic)

### Exception Guidelines

**Include context**:
```
// Bad
throw new Error("Not found")

// Good
throw new NotFoundError(`User ${userId} not found in database ${dbName}`)
```

**Throw at appropriate abstraction**:
```
// Bad: leaking implementation details
function getUser(id) {
    throw new SQLException("...")  // Caller shouldn't know about SQL
}

// Good: domain-level exception
function getUser(id) {
    throw new UserNotFoundError(id)
}
```

**Don't catch and ignore**:
```
// Terrible
try {
    doThing()
} catch (e) {
    // swallow
}

// If you must continue, at least log
try {
    doThing()
} catch (e) {
    logger.error("doThing failed", e)
    // continue with fallback
}
```

### Exception Anti-patterns

**Don't use for control flow**:
```
// Bad
try {
    return users[id]
} catch (IndexError) {
    return defaultUser
}

// Good
if (id < users.length) return users[id]
return defaultUser
```

**Don't catch too broadly**:
```
// Bad: catches everything including bugs
try {
    complexOperation()
} catch (e) {
    return default
}

// Good: catch specific expected errors
try {
    complexOperation()
} catch (NetworkError e) {
    return cachedResult
}
```

---

## Validation

### Input Validation

**Validate at boundaries**:
- API endpoints
- File parsing
- User input
- External service responses

**Validate completely**:
```
// Bad: partial validation
function createUser(name, age) {
    if (!name) throw new Error("Name required")
    // age not validated - can be negative
}

// Good: complete validation
function createUser(name, age) {
    if (!name || name.trim().length === 0) {
        throw new ValidationError("Name required")
    }
    if (age == null || age < 0 || age > 150) {
        throw new ValidationError("Age must be 0-150")
    }
}
```

**Fail with specifics**:
```
// Bad
throw new Error("Invalid input")

// Good
throw new ValidationError("Email must contain @", { field: "email", value: input })
```

### Validation Strategies

| Strategy | Example | Use When |
|----------|---------|----------|
| Whitelist | Only allow known-good | Security critical, limited valid values |
| Blacklist | Reject known-bad | Many valid values, few bad |
| Sanitize | Clean/transform input | Data can be cleaned safely |
| Escape | Encode special characters | Output to different context (HTML, SQL) |

### Type-Based Validation

Use types to make invalid states unrepresentable.

```
// Bad: string can be anything
function sendEmail(to: string) { ... }

// Better: validated type
class EmailAddress {
    constructor(address: string) {
        if (!isValidEmail(address)) throw new Error("Invalid email")
        this.address = address
    }
}
function sendEmail(to: EmailAddress) { ... }
```

---

## Barricades

### The Barricade Pattern

Create a boundary between "dirty" and "clean" data.

```
┌────────────────────────────────────────┐
│            External World              │
│     (untrusted, dirty, unvalidated)    │
└────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────┐
│             BARRICADE                  │
│  (validation, sanitization, conversion) │
└────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────┐
│           Internal System              │
│     (trusted, clean, validated)        │
│     (can use assertions, not validation)|
└────────────────────────────────────────┘
```

**Inside barricade**:
- Data is trusted
- Use assertions for programming errors
- Focus on business logic

**At barricade**:
- Validate everything
- Convert to internal types
- Log suspicious input

### Barricade Examples

**API layer**:
```
// At barricade (controller)
function handleCreateUser(request) {
    const userData = validateAndParseUserData(request.body)  // throws if invalid
    return userService.createUser(userData)  // trusted input
}

// Inside barricade (service)
function createUser(userData) {
    assert(userData instanceof ValidatedUserData)  // should never fail
    // business logic
}
```

**File parsing**:
```
// At barricade
function loadConfig(filePath) {
    const raw = fs.readFileSync(filePath)
    const parsed = JSON.parse(raw)
    return validateConfig(parsed)  // returns ConfigObject or throws
}

// Inside barricade
function applyConfig(config: ConfigObject) {
    // Can trust config has valid structure
}
```

---

## Defensive Programming Checklist

**Inputs**:
- [ ] Validate all external inputs
- [ ] Validate at system boundaries
- [ ] Use whitelists over blacklists for security
- [ ] Fail with specific error messages

**Errors**:
- [ ] Distinguish programmer errors from runtime errors
- [ ] Use assertions for "impossible" conditions
- [ ] Include context in error messages
- [ ] Don't swallow exceptions silently

**Design**:
- [ ] Establish clear barricades
- [ ] Use types to prevent invalid states
- [ ] Fail fast - don't let errors propagate
- [ ] Consider what happens if assumptions are wrong
