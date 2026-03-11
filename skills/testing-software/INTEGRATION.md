# Integration and System Testing

Read this when choosing cross-component, API, database, smoke, or end-to-end coverage.

Testing across component and system boundaries.

## Contents
- Integration Testing
- System/E2E Testing
- API Testing
- Database Testing
- Test Environments

---

## Integration Testing

### What Is Integration Testing?

Testing how components work together. Between unit tests and E2E.

**Scope**: Multiple units, but not entire system.

**Examples**:
- Service + repository (real DB)
- API endpoint + business logic
- Module A calls module B

### Integration vs Unit Tests

| Aspect | Unit | Integration |
|--------|------|-------------|
| Scope | Single unit | Multiple components |
| Speed | Milliseconds | Seconds |
| Dependencies | Mocked | Real (some or all) |
| Failure diagnosis | Precise | Broader |
| Quantity | Many | Fewer |

### Integration Test Strategies

**Big Bang**: Test all components together at once.
- Quick to write
- Hard to diagnose failures
- Good for small systems

**Incremental**: Add components one at a time.
- **Top-down**: Start from UI/API, stub lower layers
- **Bottom-up**: Start from data layer, work up
- **Sandwich**: Both directions, meet in middle

### Contract Testing

Test that components fulfill their contracts.

```typescript
// Consumer contract: what I expect from UserService
test('UserService returns user by ID', async () => {
    const user = await userService.getUser(1)
    expect(user).toHaveProperty('id', 1)
    expect(user).toHaveProperty('name')
    expect(user).toHaveProperty('email')
})

// Provider verification: does UserService fulfill contract?
// Run against real service
```

**Tools**: Pact, Spring Cloud Contract.

---

## System/E2E Testing

### What Is E2E Testing?

Test complete user workflows through the entire system.

**Characteristics**:
- User perspective
- All components real
- Slow, expensive
- Brittle

### E2E Test Strategy

**Test critical paths**:
- User registration → login → core action
- Purchase flow
- Admin workflows

**Keep few**: E2E tests are expensive. Test pyramid says few.

**Make resilient**:
- Use stable selectors (data-testid, not CSS)
- Wait for elements properly
- Handle async operations

### E2E Best Practices

**Page Object Pattern**: Encapsulate page interactions.
```typescript
class LoginPage {
    async login(username: string, password: string) {
        await this.page.fill('[data-testid="username"]', username)
        await this.page.fill('[data-testid="password"]', password)
        await this.page.click('[data-testid="submit"]')
    }
}

// Test uses page object
test('user can login', async () => {
    const loginPage = new LoginPage(page)
    await loginPage.login('alice', 'password123')
    await expect(page).toHaveURL('/dashboard')
})
```

**Test data management**:
- Use factories for test data
- Clean up after tests (or use isolated data)
- Don't depend on production data

### Smoke Tests

Quick sanity check that system is running.

**Characteristics**:
- Run after deployment
- Test critical endpoints
- Fast (< 5 minutes)
- Block further deployment if fail

```typescript
describe('Smoke Tests', () => {
    test('homepage loads', async () => {
        const response = await fetch('https://myapp.com')
        expect(response.status).toBe(200)
    })
    
    test('API health check', async () => {
        const response = await fetch('https://api.myapp.com/health')
        expect(response.status).toBe(200)
    })
})
```

---

## API Testing

### HTTP API Tests

Test REST/GraphQL endpoints directly.

```typescript
describe('Users API', () => {
    test('GET /users returns user list', async () => {
        const response = await request(app)
            .get('/users')
            .expect(200)
        
        expect(response.body).toBeInstanceOf(Array)
        expect(response.body[0]).toHaveProperty('id')
    })
    
    test('POST /users creates user', async () => {
        const response = await request(app)
            .post('/users')
            .send({ name: 'Alice', email: 'alice@test.com' })
            .expect(201)
        
        expect(response.body).toHaveProperty('id')
        expect(response.body.name).toBe('Alice')
    })
    
    test('POST /users with invalid email returns 400', async () => {
        await request(app)
            .post('/users')
            .send({ name: 'Alice', email: 'invalid' })
            .expect(400)
    })
})
```

### API Test Categories

| Category | What to Test |
|----------|--------------|
| Happy path | Valid requests succeed |
| Validation | Invalid input rejected |
| Auth | Unauthorized access blocked |
| Edge cases | Boundary values, empty inputs |
| Error handling | Proper error responses |

### Schema Validation

Validate API responses against schema.

```typescript
const userSchema = {
    type: 'object',
    required: ['id', 'name', 'email'],
    properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        email: { type: 'string', format: 'email' }
    }
}

test('GET /users/:id matches schema', async () => {
    const response = await request(app).get('/users/1')
    expect(response.body).toMatchSchema(userSchema)
})
```

---

## Database Testing

### Approaches

**In-memory database**: Fast, isolated, may differ from production.
```typescript
// SQLite in-memory for testing
const testDb = new Database(':memory:')
```

**Docker container**: Real database, isolated instance.
```typescript
// Start container before tests
beforeAll(async () => {
    container = await new PostgreSqlContainer().start()
    db = await connect(container.getConnectionString())
})
```

**Transaction rollback**: Use real DB, rollback after each test.
```typescript
beforeEach(async () => {
    transaction = await db.beginTransaction()
})

afterEach(async () => {
    await transaction.rollback()  // Undo all changes
})
```

### Database Test Patterns

**Fixture loading**:
```typescript
beforeEach(async () => {
    await db.query('DELETE FROM users')
    await db.query(`INSERT INTO users (id, name) VALUES (1, 'Alice')`)
})
```

**Factory functions**:
```typescript
const createUser = async (overrides = {}) => {
    const user = { name: 'Test User', email: 'test@test.com', ...overrides }
    return db.users.create(user)
}

test('finds user by email', async () => {
    const user = await createUser({ email: 'alice@test.com' })
    const found = await userRepo.findByEmail('alice@test.com')
    expect(found.id).toBe(user.id)
})
```

### Repository Testing

Test data access layer with real database.

```typescript
describe('UserRepository', () => {
    let repo: UserRepository
    
    beforeAll(async () => {
        await setupTestDatabase()
        repo = new UserRepository(testDb)
    })
    
    beforeEach(async () => {
        await testDb.query('DELETE FROM users')
    })
    
    test('saves and retrieves user', async () => {
        const user = new User('Alice', 'alice@test.com')
        await repo.save(user)
        
        const found = await repo.findById(user.id)
        expect(found.name).toBe('Alice')
    })
    
    test('returns null for non-existent user', async () => {
        const found = await repo.findById(999)
        expect(found).toBeNull()
    })
})
```

---

## Test Environments

### Environment Types

| Environment | Purpose | Data |
|-------------|---------|------|
| Local | Developer testing | Fake/fixtures |
| CI | Automated tests | Ephemeral |
| Staging | Pre-production | Production-like |
| Production | Smoke tests only | Real |

### Test Environment Requirements

**Isolation**: Tests don't affect each other.

**Repeatability**: Same test, same result.

**Speed**: Fast feedback.

**Similarity to production**: Catch real issues.

### CI/CD Integration

```yaml
# Example CI pipeline
test:
  unit:
    runs-on: ubuntu-latest
    steps:
      - run: npm test -- --coverage
    
  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
    steps:
      - run: npm run test:integration
    
  e2e:
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
      - run: npm run test:e2e
```

### Test Data Strategies

| Strategy | Pros | Cons |
|----------|------|------|
| Fixtures | Predictable, version controlled | Can become stale |
| Factories | Flexible, explicit | More code to maintain |
| Snapshots | Easy setup | Can drift from reality |
| Production copies | Realistic | Privacy concerns, large |
| Generated | Variety | May miss edge cases |
