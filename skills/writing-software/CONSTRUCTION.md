# Code Construction

Read this when naming, function shape, parameter count, or comment quality is the active decision.

## Contents
- Naming
- Functions
- Variables
- Formatting
- Comments

---

## Naming

### General Principles

**Say what it means**: Name describes what it is or does, not how.

**Appropriate length**:
- Loop counters: `i`, `j` OK
- Local variables: short-medium
- Instance variables: medium
- Global/public: longer, fully descriptive

**Avoid**:
- Abbreviations (except universal: `id`, `url`, `http`)
- Single letters (except loops, lambdas)
- Generic names (`data`, `info`, `temp`, `result`)
- Negatives (`notFound` → `missing`)

### Naming Conventions by Element

**Variables** - noun or noun phrase:
```
// Good
userCount, validOrders, connectionPool

// Bad
cnt, valid, pool  // too abbreviated
```

**Booleans** - predicate form:
```
// Good
isActive, hasPermission, shouldRetry, canExecute

// Bad
active, permission, retry  // ambiguous
```

**Functions** - verb + noun:
```
// Good
calculateTotal(), validateInput(), sendNotification()

// Bad
total(), input(), notification()  // nouns, not actions
```

**Classes** - noun, singular:
```
// Good
OrderProcessor, UserRepository, PaymentGateway

// Bad
ProcessOrders, Users, Payments  // verbs or plurals
```

**Constants** - describes value, not usage:
```
// Good
MAX_RETRY_ATTEMPTS = 3
DEFAULT_TIMEOUT_SECONDS = 30

// Bad
THREE = 3  // describes literal, not meaning
```

### Naming Opposites

Use conventional pairs:
| Pair | Usage |
|------|-------|
| `begin/end` | Ranges, boundaries |
| `first/last` | Sequences |
| `start/stop` | Processes |
| `open/close` | Resources |
| `get/set` | Accessors |
| `add/remove` | Collections |
| `create/destroy` | Lifecycle |
| `acquire/release` | Resources |
| `show/hide` | Visibility |
| `enable/disable` | Features |

---

## Functions

### Size and Complexity

**Length**: 20 lines ideal. Over 50, look for extraction opportunities.

**Parameters**: 
- 0-1: Ideal
- 2-3: Acceptable
- 4+: Consider parameter object

**Nesting**: Max 3 levels. Extract to functions.

### Single Responsibility

Each function does ONE thing.

**Test**: Can you describe it without "and"?
```
// Bad: "validates AND saves the user"
// Good: "validates user data"
```

### Naming Functions

**Commands** (do something):
```
saveUser(), deleteOrder(), sendEmail()
```

**Queries** (return something):
```
getUser(), calculateTotal(), findMatchingOrders()
```

**Predicates** (return boolean):
```
isValid(), hasPermission(), canExecute()
```

**Don't mix**: Commands shouldn't return values. Queries shouldn't change state (CQRS principle).

### Parameter Guidelines

**Order**: Required before optional. Input before output.

**Avoid flag parameters**: Two booleans? Split into separate functions.
```
// Bad
render(document, isPrintMode, showHeader)

// Good
renderForScreen(document)
renderForPrint(document)
```

**Avoid output parameters**: Return values instead.
```
// Bad
void appendFooter(StringBuilder report)

// Good
String createFooter()
```

### Guard Clauses

Handle edge cases at the top, then main logic.
```
function processOrder(order) {
    if (!order) return null           // guard
    if (order.isEmpty) return []      // guard
    
    // main logic, not nested in else
    return order.items.map(...)
}
```

---

## Variables

### Declaration Principles

**Declare close to first use**: Minimize live time.

**Initialize at declaration**: Uninitialized = potential bug.

**One purpose per variable**: Don't reuse for different meanings.

### Scope

**Minimize scope**: Smaller scope = less to track.

```
// Bad: loop variable visible after loop
let i
for (i = 0; i < items.length; i++) { ... }
// i still accessible here

// Good: scoped to loop
for (let i = 0; i < items.length; i++) { ... }
```

### Live Time

**Live time**: Lines between first and last use.

**Keep short**: Long live time = more chances for bugs.

```
// Bad: total lives 20 lines
let total = 0
// ... 20 lines of other code ...
total = calculateTotal()

// Good: declare where used
// ... other code ...
let total = calculateTotal()
```

### Magic Numbers

**No literals in logic**: Extract to named constants.

```
// Bad
if (retryCount > 3) { ... }

// Good
const MAX_RETRIES = 3
if (retryCount > MAX_RETRIES) { ... }
```

**Exceptions**: 0, 1, -1 when meaning is obvious.

---

## Formatting

### Vertical Formatting

**File length**: 200-500 lines ideal. Over 1000, split.

**Ordering** (top to bottom):
1. Imports/dependencies
2. Constants
3. Public interface
4. Private helpers
5. Called functions below callers

**Vertical spacing**: Blank lines between concepts.
```
// Related code: no blank line
const firstName = user.firstName
const lastName = user.lastName

// New concept: blank line
const fullName = `${firstName} ${lastName}`
```

### Horizontal Formatting

**Line length**: 80-120 characters.

**Indentation**: Consistent (spaces preferred, 2 or 4).

**Whitespace**:
```
// Around operators
total = price + tax

// After commas
calculate(a, b, c)

// Not inside parens
calculate(a, b, c)  // not calculate( a, b, c )
```

### Consistency

**Most important rule**: Match existing codebase style.

Project conventions > personal preferences.

---

## Comments

### When to Comment

**Intent**: Why this approach?
```
// Use insertion sort for small arrays (faster than quicksort under 10 elements)
if (array.length < 10) insertionSort(array)
```

**Clarification**: Explain non-obvious code.
```
// Format: YYYY-MM-DD required by legacy API
const dateStr = date.toISOString().slice(0, 10)
```

**Warning**: Alert to consequences.
```
// WARNING: This mutates the input array
function sortInPlace(array) { ... }
```

**TODO**: Track technical debt.
```
// TODO(JIRA-123): Replace with new payment API
```

### When NOT to Comment

**Don't explain what**: Code should be self-documenting.
```
// Bad
// increment i by 1
i++

// Bad
// loop through users
for (const user of users) { ... }
```

**Don't keep history**: Use version control.
```
// Bad
// Modified by John on 2024-01-15
// Previously returned null
```

**Don't comment out code**: Delete it. Git remembers.

### Documentation Comments

**Public APIs**: Document purpose, parameters, return values, exceptions.

```
/**
 * Calculates the total price including tax.
 *
 * @param items - Array of items with price property
 * @param taxRate - Tax rate as decimal (e.g., 0.08 for 8%)
 * @returns Total price with tax applied
 * @throws InvalidTaxRateError if taxRate is negative
 */
function calculateTotal(items: Item[], taxRate: number): number
```

**Internal code**: Lighter touch. Trust readers to understand code.
