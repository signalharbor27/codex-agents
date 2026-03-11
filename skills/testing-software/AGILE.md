# Agile Testing

Read this when the decision is about team-wide quality strategy, quadrant balance, or acceptance-example ownership.

Whole-team approach to quality in agile development.

## Contents
- Agile Testing Mindset
- Testing Quadrants
- Whole-Team Testing
- Test Automation Strategy
- Continuous Testing

---

## Agile Testing Mindset

### Core Principles

**Testing is everyone's responsibility**: Not just testers.

**Quality built in**: Not tested in at the end.

**Prevent bugs**: Not just find them.

**Continuous feedback**: Not phase-gated.

### Shift Left

Move testing activities earlier in the process.

```
Traditional:        Agile:
                    ┌─────────────────────────────────────┐
Requirements        │ Requirements (with examples/tests)  │
    ↓               │           ↓                         │
Design              │ Design (with testability)           │
    ↓               │           ↓                         │
Development         │ Development (with TDD)              │
    ↓               │           ↓                         │
Testing ◄───────    │ Testing (continuous) ───────────────┤
    ↓               │           ↓                         │
Release             │ Release (automated)                 │
                    └─────────────────────────────────────┘
```

### Testing Mindset vs Checking Mindset

| Testing | Checking |
|---------|----------|
| Exploration | Verification |
| Questions | Confirmation |
| Learning | Detecting |
| Human judgment | Automated execution |

**Both needed**: Checking for regression, testing for discovery.

---

## Testing Quadrants

### The Quadrants Model

```
              Business-Facing
                    │
        Q2          │          Q3
   ┌────────────────┼────────────────┐
   │ Functional     │ Exploratory    │
   │ Acceptance     │ Usability      │
   │ Examples       │ UAT            │
   │ Story tests    │ Alpha/Beta     │
   │                │                │
───┼────────────────┼────────────────┼───
   │                │                │
   │ Q1             │ Q4             │
   │ Unit tests     │ Performance    │
   │ Component      │ Load           │
   │ tests          │ Security       │
   │                │ "-ilities"     │
   └────────────────┼────────────────┘
                    │
              Technology-Facing

← Support Team ─────┼───── Critique Product →
```

### Quadrant Details

**Q1 - Technology-facing, support team**:
- Unit tests, component tests
- Written by developers
- Fast, automated
- Run continuously

**Q2 - Business-facing, support team**:
- Functional tests, acceptance tests
- Derived from examples, specifications
- Automated where stable
- Guide development

**Q3 - Business-facing, critique product**:
- Exploratory testing
- Usability testing
- User acceptance testing
- Manual, human judgment

**Q4 - Technology-facing, critique product**:
- Performance testing
- Security testing
- Load testing
- Specialized tools, expertise

### Using the Quadrants

**Each sprint should include**:
- Q1: Always (TDD, unit tests)
- Q2: Most stories (acceptance criteria)
- Q3: As features complete (exploration)
- Q4: As needed (performance-critical features)

---

## Whole-Team Testing

### Everyone Tests

| Role | Testing Contribution |
|------|---------------------|
| Developer | Unit tests, TDD, code review |
| Tester | Test strategy, exploration, automation |
| Product Owner | Acceptance criteria, UAT |
| Designer | Usability review |
| Ops | Infrastructure, monitoring |

### Three Amigos

Before starting a story, three perspectives meet:

1. **Business** (PO): What do we need?
2. **Development**: How will we build it?
3. **Testing**: How will we test it?

**Outcome**: Shared understanding, examples, edge cases identified.

### Example Mapping

Structured conversation to understand requirements.

```
┌─────────────────────────────────────────────────┐
│                    Story                        │
│              (yellow card)                      │
└─────────────────────────────────────────────────┘
        │
        ├─── Rule 1 (blue card)
        │       ├── Example 1.1 (green card)
        │       └── Example 1.2 (green card)
        │
        ├─── Rule 2 (blue card)
        │       ├── Example 2.1 (green card)
        │       └── Example 2.2 (green card)
        │
        └─── Question (red card)
```

**Many red cards** = Story not ready.

---

## Test Automation Strategy

### Automation Pyramid

```
        /\
       /  \    UI Tests
      /    \   (few, slow, brittle)
     /──────\
    /        \  Service/API Tests
   /          \ (moderate)
  /────────────\
 /              \ Unit Tests
/________________\ (many, fast, stable)
```

### What to Automate

**Automate**:
- Regression tests (prevent old bugs)
- Build verification (smoke tests)
- Data-driven tests (many inputs)
- Cross-browser/device (repetitive matrix)

**Don't automate**:
- One-time tests
- Exploratory scenarios
- Usability evaluation
- Frequently changing features (until stable)

### Automation ROI

```
Cost of automation = Development + Maintenance
Value = (Manual run cost × Number of runs) - Cost of automation
```

**Automate when**: You'll run it many times.

**Don't automate when**: Cost exceeds value.

### Maintainable Automation

**Principles**:
- Treat test code like production code
- Follow DRY (don't repeat yourself)
- Use page objects / API clients
- Keep tests independent
- Fast feedback (parallelize)

**Warning signs**:
- Tests break on every change
- No one understands the tests
- Tests take too long to run
- Tests are disabled/ignored

---

## Continuous Testing

### Continuous Integration Testing

```
Code Push → Build → Unit Tests → Integration Tests → Deploy to Test → More Tests
```

**Every commit triggers**:
1. Build
2. Unit tests
3. Static analysis
4. Integration tests
5. (Optionally) E2E tests

### Test Feedback Loops

| Loop | Speed | Scope |
|------|-------|-------|
| IDE (as you type) | Seconds | Syntax, simple issues |
| Pre-commit | Minutes | Unit tests, linting |
| CI pipeline | 10-30 min | Full test suite |
| Nightly | Hours | E2E, performance |
| Sprint | Days | Exploration, UAT |

**Faster = Better**: Fix issues immediately.

### Pipeline Quality Gates

**Hard gates** (block deployment):
- Unit tests passing
- Integration tests passing
- Security scan clean
- Code coverage threshold

**Soft gates** (warn but allow):
- Performance within tolerance
- E2E tests passing
- Code quality score

### Monitoring as Testing

In production, monitoring is testing.

**Monitor for**:
- Error rates
- Response times
- Business metrics
- User behavior

**Anomalies = potential bugs**.

---

## Definition of Done

### Including Testing in Done

A story is not done until:

- [ ] Unit tests written and passing
- [ ] Acceptance criteria automated (where appropriate)
- [ ] Code reviewed
- [ ] Exploratory testing complete
- [ ] No critical bugs open
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] Product owner accepted

### Testing Debt

Like technical debt, testing debt accumulates.

**Sources**:
- Skipped tests
- Manual tests not automated
- Flaky tests ignored
- Poor test coverage

**Pay down regularly**: Allocate time each sprint.

---

## Scaling Agile Testing

### Large Teams

**Challenges**: Coordination, shared test environments, test data.

**Solutions**:
- Service virtualization (mock dependencies)
- Containerized test environments
- Test data management
- Cross-team test standards

### Test Communities

In large organizations:
- Community of practice for testers
- Shared automation frameworks
- Knowledge sharing sessions
- Test guild or chapter
