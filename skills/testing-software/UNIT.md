# Unit Testing

Read this when deciding unit-of-work boundaries, local setup shape, or whether a dependency should stay real, fake, or mocked.

Principles and practices for effective unit tests.

## Contents
- What Makes a Good Unit Test
- Test Structure
- Mocking and Isolation
- Trustworthy Tests
- Naming and Organization

---

## What Makes a Good Unit Test

### Definition

A unit test is an automated piece of code that:
1. Invokes a **unit of work** (function, class, module)
2. Checks a **single assumption** about that unit's behavior
3. Can run **in isolation** from other tests
4. Runs **fast** (milliseconds)

### Properties of Good Tests

| Property | Description |
|----------|-------------|
| Fast | < 100ms, ideally < 10ms |
| Isolated | No shared state, any order |
| Repeatable | Same result every run |
| Self-validating | Clear pass/fail |
| Timely | Written with (or before) code |
| Readable | Intent clear from test |

### Unit of Work

**Not necessarily a function**. A unit of work is behavior with:
- Entry point (what you call)
- Exit point(s) (what you verify)

**Exit point types**:
1. **Return value**: Function returns something
2. **State change**: Object or system state changes
3. **Dependency call**: Calls another component

---

## Test Structure

### Arrange-Act-Assert (AAA)

```typescript
test('should add two numbers', () => {
    // Arrange - setup
    const calc = new Calculator()
    
    // Act - execute
    const result = calc.add(2, 3)
    
    // Assert - verify
    expect(result).toBe(5)
})
```

### One Assert Per Test (Guideline)

**Ideal**: One logical assertion per test.

**Acceptable**: Multiple asserts that verify the same concept.

```typescript
// Good: one concept
test('should parse user data', () => {
    const user = parseUser(data)
    expect(user.name).toBe('Alice')
    expect(user.email).toBe('alice@example.com')
    // Both verify parsing worked
})

// Bad: multiple concepts
test('should handle user', () => {
    const user = parseUser(data)
    expect(user.name).toBe('Alice')
    
    saveUser(user)
    expect(db.users).toHaveLength(1)  // Different concern!
})
```

### Setup and Teardown

**Per-test setup**: Prefer explicit setup in each test for clarity.

**Shared setup**: Use `beforeEach` for expensive, truly common setup.

```typescript
describe('Calculator', () => {
    let calc: Calculator
    
    beforeEach(() => {
        calc = new Calculator()  // Fresh instance each test
    })
    
    test('adds numbers', () => {
        expect(calc.add(2, 3)).toBe(5)
    })
    
    test('subtracts numbers', () => {
        expect(calc.subtract(5, 3)).toBe(2)
    })
})
```

**Avoid `beforeAll`**: Creates shared state, test order dependencies.

---

## Mocking and Isolation

### When to Mock

**Do mock**:
- External services (API, database, file system)
- Non-deterministic behavior (time, random)
- Slow operations
- Things not yet built

**Don't mock**:
- The thing you're testing
- Simple value objects
- Stable, fast, internal code
- Everything (over-mocking)

### Types of Test Doubles

```
         Test Doubles
              │
    ┌─────────┼─────────┐
    │         │         │
  Dummy     Stub      Mock
            / \         │
         Fake  Spy   (verifies
                     behavior)
```

**Stub**: Provides canned answers to calls.
```typescript
const userService = {
    getUser: () => ({ id: 1, name: 'Test User' })  // Stub
}
```

**Mock**: Verifies interactions occurred.
```typescript
const emailService = jest.fn()
// ... do something ...
expect(emailService).toHaveBeenCalledWith('user@email.com')
```

**Fake**: Working simplified implementation.
```typescript
class InMemoryUserRepository {
    private users = new Map()
    save(user) { this.users.set(user.id, user) }
    find(id) { return this.users.get(id) }
}
```

### Injection Patterns

**Constructor injection** (preferred):
```typescript
class UserService {
    constructor(private repo: UserRepository) {}
}

// In test
const service = new UserService(mockRepo)
```

**Method parameter**:
```typescript
function processOrder(order: Order, emailer: Emailer) { ... }

// In test
processOrder(testOrder, mockEmailer)
```

**Seam in module**:
```typescript
// Production: imports real module
// Test: mock the import
jest.mock('./emailService')
```

### Mock Pitfalls

**Over-specification**: Testing too many interactions.
```typescript
// Bad: brittle
expect(repo.save).toHaveBeenCalledWith(
    { id: 1, name: 'Alice', createdAt: expect.any(Date) }
)

// Better: focus on what matters
expect(repo.save).toHaveBeenCalled()
expect(savedUser.name).toBe('Alice')
```

**Mocking what you don't own**: Wrap third-party code, mock your wrapper.

---

## Trustworthy Tests

### Signs of Untrustworthy Tests

| Sign | Problem |
|------|---------|
| Flaky | Passes/fails randomly |
| Slow | Discourage running |
| Fragile | Break on unrelated changes |
| Obscure | Can't tell why it failed |
| Not run | Disabled, ignored |

### Making Tests Trustworthy

**Deterministic**: No time, random, external dependencies.
```typescript
// Bad
expect(user.createdAt).toBe(new Date())

// Good
const now = new Date('2024-01-01')
const user = createUser({ clock: () => now })
expect(user.createdAt).toEqual(now)
```

**Isolated**: No test depends on another.
```typescript
// Bad: depends on previous test's state
test('creates user', () => { createUser('alice') })
test('finds user', () => { expect(findUser('alice')).toBeDefined() })

// Good: independent
test('finds existing user', () => {
    createUser('alice')
    expect(findUser('alice')).toBeDefined()
})
```

**Fast**: Keep under 100ms per test.

### What to Do with Flaky Tests

1. **Fix immediately**: Root cause the flakiness
2. **Quarantine**: Move to separate suite while fixing
3. **Delete**: If unfixable and low value

**Never**: Leave flaky tests in main suite.

---

## Naming and Organization

### Test Naming

**Pattern**: `[UnitOfWork]_[Scenario]_[ExpectedBehavior]`

```typescript
// Good names
test('add_twoPositiveNumbers_returnsSum', ...)
test('withdraw_insufficientFunds_throwsException', ...)
test('login_invalidPassword_returnsFalse', ...)

// Bad names
test('test1', ...)
test('addTest', ...)
test('should work', ...)
```

**Alternative**: Sentence style
```typescript
test('should return sum when adding two positive numbers', ...)
test('should throw exception when withdrawing with insufficient funds', ...)
```

### File Organization

**Mirror source structure**:
```
src/
  services/
    userService.ts
  utils/
    validation.ts

tests/
  services/
    userService.test.ts
  utils/
    validation.test.ts
```

**Or co-locate**:
```
src/
  services/
    userService.ts
    userService.test.ts
```

### Test Suites (describe blocks)

Group by:
- Unit being tested
- Scenario or feature
- Exit point type

```typescript
describe('UserService', () => {
    describe('createUser', () => {
        describe('with valid data', () => {
            test('saves user to repository', ...)
            test('returns created user', ...)
        })
        
        describe('with invalid email', () => {
            test('throws ValidationError', ...)
            test('does not save user', ...)
        })
    })
})
```

---

## Test-Driven Development (TDD)

### Red-Green-Refactor

1. **Red**: Write failing test for new behavior
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code, keep tests passing

### TDD Benefits

- Design feedback: Hard to test = hard to use
- Documentation: Tests show how code works
- Safety net: Refactor with confidence
- Focus: One thing at a time

### When TDD Helps Most

- Well-defined behavior
- Complex logic
- APIs others will use
- Bug fixes (test the bug first)

### When TDD is Harder

- Exploratory code
- UI/visual components
- Integration with external systems
- Unclear requirements
