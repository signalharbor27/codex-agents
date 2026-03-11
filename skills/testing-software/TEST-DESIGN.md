# Test Design Techniques

Read this when you already know the test level and need better cases: partitions, boundaries, combinations, or state transitions.

Systematic approaches to designing effective tests.

## Contents
- Equivalence Partitioning
- Boundary Value Analysis
- Decision Tables
- State Transition Testing
- Combinatorial Testing

---

## Equivalence Partitioning

### Concept

Divide inputs into groups (partitions) where all values in a partition should behave the same.

**Principle**: Test one value from each partition. If one works, all should.

### Identifying Partitions

**Valid partitions**: Inputs that should be accepted.
**Invalid partitions**: Inputs that should be rejected.

### Example: Age Validation

```
Age field accepts 0-120

Partitions:
├── Invalid: age < 0 (e.g., -1)
├── Valid: 0 ≤ age ≤ 120 (e.g., 25)
└── Invalid: age > 120 (e.g., 121)

Test cases:
- age = -1 → reject
- age = 25 → accept
- age = 121 → reject
```

### Example: Username

```
Username: 3-20 alphanumeric characters

Partitions by length:
├── Invalid: length < 3 (e.g., "ab")
├── Valid: 3 ≤ length ≤ 20 (e.g., "alice")
└── Invalid: length > 20 (e.g., 21 chars)

Partitions by characters:
├── Valid: alphanumeric (e.g., "user123")
├── Invalid: special chars (e.g., "user@name")
└── Invalid: spaces (e.g., "user name")
```

---

## Boundary Value Analysis

### Concept

Bugs cluster at boundaries. Test at and around boundary values.

**Test values**:
- Exactly at boundary
- Just below boundary
- Just above boundary

### Example: Age (0-120)

```
Boundaries: 0 and 120

Test values:
├── -1 (below lower boundary) → reject
├── 0 (at lower boundary) → accept
├── 1 (above lower boundary) → accept
├── 119 (below upper boundary) → accept
├── 120 (at upper boundary) → accept
└── 121 (above upper boundary) → reject
```

### Common Boundary Types

| Type | Boundary Values |
|------|-----------------|
| Numeric range | min-1, min, min+1, max-1, max, max+1 |
| String length | 0, 1, max-1, max, max+1 |
| Array/list | empty, one item, full, overflow |
| Date | min date, max date, leap year, month boundaries |
| File size | 0, 1 byte, max-1, max, max+1 |

### Boundary + Partition Combined

```
Age: 0-120

Equivalence + Boundary test set:
├── -1 (invalid, boundary)
├── 0 (valid, boundary)
├── 60 (valid, middle representative)
├── 120 (valid, boundary)
└── 121 (invalid, boundary)
```

---

## Decision Tables

### Concept

Systematically test combinations of conditions and their outcomes.

### Structure

```
           | Rule 1 | Rule 2 | Rule 3 | Rule 4 |
-----------+--------+--------+--------+--------+
Conditions |        |        |        |        |
  Cond 1   |   T    |   T    |   F    |   F    |
  Cond 2   |   T    |   F    |   T    |   F    |
-----------+--------+--------+--------+--------+
Actions    |        |        |        |        |
  Action 1 |   X    |        |        |        |
  Action 2 |        |   X    |   X    |        |
  Action 3 |        |        |        |   X    |
```

### Example: Loan Approval

```
Conditions:
- Good credit (Y/N)
- High income (Y/N)
- Existing customer (Y/N)

           | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 |
-----------+----+----+----+----+----+----+----+----+
Good credit|  Y |  Y |  Y |  Y |  N |  N |  N |  N |
High income|  Y |  Y |  N |  N |  Y |  Y |  N |  N |
Existing   |  Y |  N |  Y |  N |  Y |  N |  Y |  N |
-----------+----+----+----+----+----+----+----+----+
Approve    |  X |  X |  X |  X |  X |    |    |    |
Review     |    |    |    |    |    |  X |  X |    |
Reject     |    |    |    |    |    |    |    |  X |
```

### Simplifying Decision Tables

If outcome doesn't depend on a condition, use "-" (don't care).

```
           | R1 | R2 | R3 |
-----------+----+----+----+
Good credit|  Y |  N |  N |
High income|  - |  Y |  N |
-----------+----+----+----+
Approve    |  X |  X |    |
Reject     |    |    |  X |
```

---

## State Transition Testing

### Concept

Test system behavior as it moves between states.

### State Diagram Elements

- **States**: Conditions the system can be in
- **Transitions**: Movement between states
- **Events**: Triggers that cause transitions
- **Guards**: Conditions for transitions
- **Actions**: Activities during transitions

### Example: Order State Machine

```
[New] ──pay──▶ [Paid] ──ship──▶ [Shipped] ──deliver──▶ [Delivered]
  │              │                  │                       │
  │cancel        │cancel            │return                 │return
  ▼              ▼                  ▼                       ▼
[Cancelled]  [Cancelled]       [Returned]               [Returned]
```

### Test Cases from State Diagram

**Cover all transitions**:
1. New → pay → Paid
2. Paid → ship → Shipped
3. Shipped → deliver → Delivered
4. New → cancel → Cancelled
5. Paid → cancel → Cancelled
6. Shipped → return → Returned
7. Delivered → return → Returned

**Invalid transitions** (should be rejected):
- New → ship (can't ship unpaid order)
- Cancelled → pay (can't pay cancelled order)
- Delivered → cancel (too late to cancel)

### State Table

Alternative representation:

| Current State | Event | Next State | Action |
|---------------|-------|------------|--------|
| New | pay | Paid | Process payment |
| New | cancel | Cancelled | Refund if any |
| Paid | ship | Shipped | Send shipment |
| Paid | cancel | Cancelled | Full refund |
| Shipped | deliver | Delivered | Update tracking |
| Shipped | return | Returned | Process return |
| Delivered | return | Returned | Process return |

---

## Combinatorial Testing

### The Problem

Many parameters, many values → explosion of combinations.

```
3 parameters × 3 values each = 27 combinations
5 parameters × 4 values each = 1,024 combinations
10 parameters × 4 values each = 1,048,576 combinations
```

### Pairwise Testing

**Insight**: Most bugs are triggered by interaction of 2 factors, not all factors.

**Pairwise**: Cover every pair of parameter values at least once.

```
Parameters:
- Browser: Chrome, Firefox, Safari
- OS: Windows, Mac, Linux
- Size: Small, Medium, Large

Full: 3 × 3 × 3 = 27 tests
Pairwise: 9 tests (covers all pairs)

| Test | Browser | OS      | Size   |
|------|---------|---------|--------|
| 1    | Chrome  | Windows | Small  |
| 2    | Chrome  | Mac     | Medium |
| 3    | Chrome  | Linux   | Large  |
| 4    | Firefox | Windows | Medium |
| 5    | Firefox | Mac     | Large  |
| 6    | Firefox | Linux   | Small  |
| 7    | Safari  | Windows | Large  |
| 8    | Safari  | Mac     | Small  |
| 9    | Safari  | Linux   | Medium |

Every pair appears: (Chrome, Windows), (Chrome, Mac), (Chrome, Linux),
(Chrome, Small), (Chrome, Medium), (Chrome, Large), etc.
```

### Tools for Pairwise

- PICT (Microsoft)
- Allpairs
- Hexawise
- Various online generators

---

## Choosing Techniques

### When to Use Each

| Technique | Best For |
|-----------|----------|
| Equivalence Partitioning | Reducing test cases for inputs |
| Boundary Value Analysis | Numeric ranges, limits |
| Decision Tables | Complex business rules |
| State Transition | Workflows, lifecycles |
| Pairwise | Configuration testing |

### Combining Techniques

Most effective: Use multiple techniques together.

```
1. Identify input partitions (Equivalence)
2. Add boundary values (Boundary)
3. Create decision table for rules (Decision)
4. Cover state transitions (State)
5. Reduce combinations (Pairwise)
```

### Coverage Criteria

| Level | Description |
|-------|-------------|
| Each partition | At least one value from each partition |
| All boundaries | Every boundary value |
| All transitions | Every valid state transition |
| All pairs | Every pair of parameter values |
| All combinations | Every possible combination (exhaustive) |

**Typical target**: All partitions + boundaries + transitions + pairs.
