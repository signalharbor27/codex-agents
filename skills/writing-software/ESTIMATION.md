# Estimation

Read this when the question is forecast, sizing, uncertainty, or communicating schedule risk.

Techniques for estimating software development work.

## Contents
- Estimation Fundamentals
- Estimation Techniques
- Schedule Estimation
- Tracking and Improving
- Communicating Estimates

---

## Estimation Fundamentals

### Estimates Are Probabilities

An estimate is not a commitment. It's a probability distribution.

**Wrong thinking**: "This will take 5 days"

**Right thinking**: "50% chance done in 5 days, 90% chance done in 8 days"

### Why Estimates Go Wrong

| Cause | Symptom | Mitigation |
|-------|---------|------------|
| Optimism bias | Best-case becomes estimate | Use historical data |
| Scope creep | Requirements grow | Define "done" precisely |
| Unknown unknowns | Surprises | Add contingency |
| Pressure | Lower estimate to please | Give honest range |
| Anchoring | First number sticks | Generate multiple estimates |

### Units Signal Confidence

| Duration | Say | Signals |
|----------|-----|---------|
| 1-15 days | Days | High confidence |
| 3-6 weeks | Weeks | Medium confidence |
| 2-5 months | Months | Low confidence |
| Longer | "I'll need to research" | Unknown |

**Rule**: If pressured for more precision than you have, say so.

---

## Estimation Techniques

### Decomposition

Break work into smaller pieces, estimate each.

1. List all tasks
2. Estimate each (hours or days)
3. Sum with contingency

**Smaller pieces = better estimates**: Aim for 0.5-2 day chunks.

**Include everything**:
- Coding
- Testing
- Code review
- Documentation
- Meetings
- Integration
- Bug fixing
- Deployment

### Analogous Estimation

Compare to similar past work.

**Process**:
1. Find similar completed work
2. Note how long it took
3. Adjust for differences
4. Use as baseline

**Requires**: Historical data, good memory, comparable work.

### Three-Point Estimation

Account for uncertainty explicitly.

**Formula**: `E = (O + 4M + P) / 6`

- O = Optimistic (best case, everything goes right)
- M = Most likely (realistic)
- P = Pessimistic (worst case, major problems)

**Example**:
```
Feature X:
  Optimistic: 3 days
  Most likely: 5 days
  Pessimistic: 12 days
  
  Estimate = (3 + 4×5 + 12) / 6 = 5.8 days
```

### Planning Poker

Team-based estimation using cards.

1. Present task
2. Discuss scope and approach
3. Everyone secretly picks card (1, 2, 3, 5, 8, 13, 21, ?)
4. Reveal simultaneously
5. Discuss high/low outliers
6. Re-vote until convergence

**Benefits**: Surfaces hidden assumptions, leverages team knowledge.

### Story Points

Abstract units for relative sizing.

**Don't**: Map to hours
**Do**: Compare stories to each other

**Reference story**: Pick a medium-sized story as "3 points", size others relative.

---

## Schedule Estimation

### Cone of Uncertainty

Estimates improve as project progresses.

| Phase | Estimate Range |
|-------|----------------|
| Initial concept | 4x to 0.25x |
| Requirements defined | 2x to 0.5x |
| Design complete | 1.5x to 0.67x |
| Code complete | 1.25x to 0.8x |

**Implication**: Early estimates should have wide ranges.

### Account for Real Work Time

**Ideal hours ≠ Elapsed time**

Deductions from calendar time:
- Meetings
- Email and communication
- Context switching
- Code reviews
- Support and maintenance
- Sick days, vacation

**Rule of thumb**: 4-6 productive hours per 8-hour day.

### Critical Path

Identify sequential dependencies.

```
A ─────────→ C ─────────→ E
      ↘           ↗
B ─────→ D ─────
```

**Critical path**: Longest chain. Determines minimum time.

**Identify**:
1. Map task dependencies
2. Find longest path
3. Focus effort there
4. Parallelize where possible

### Buffer Strategies

**Fixed buffer**: Add percentage (20-50%)

**Risk-based buffer**: More buffer for risky items

**Buffer placement**: At end, not distributed (prevents "use it or lose it")

---

## Tracking and Improving

### Velocity

Track points/tasks completed per time period.

**After several iterations**: Use actual velocity for planning, not hoped-for.

```
Sprint 1: 20 points
Sprint 2: 18 points
Sprint 3: 22 points
Average: 20 points

Next sprint capacity: ~20 points (not 30 because we'll "try harder")
```

### Estimate vs Actual

Record estimates and actuals for every task.

| Task | Estimate | Actual | Ratio |
|------|----------|--------|-------|
| API endpoint | 3d | 4d | 1.33 |
| UI form | 2d | 2d | 1.0 |
| Report | 1d | 3d | 3.0 |

**Analysis**:
- Consistent over? Apply multiplier
- Certain task types off? Adjust those
- Outliers? Understand why

### Estimation Retrospective

Regularly review estimation accuracy.

**Questions**:
- What did we underestimate? Why?
- What did we overestimate? Why?
- What surprises occurred?
- How can we estimate better?

---

## Communicating Estimates

### Give Ranges

**Instead of**: "5 days"
**Say**: "4-7 days, most likely 5"

**Even better**: "5 days if requirements are stable and I don't hit integration issues. Could be 7-8 if we discover API limitations."

### State Assumptions

**Every estimate has assumptions**. Make them explicit.

```
Estimate: 2 weeks

Assumptions:
- Design already approved
- Database schema finalized
- Third-party API documented correctly
- No other high-priority interrupts
```

### Handle Pressure

**When asked for lower estimate**:

1. Don't simply comply
2. Explain what could be cut to hit target
3. Explain risks of rushing
4. Offer alternatives

**Script**: "I can commit to X by date Y. To hit earlier date Z, we could cut scope A or accept risk B."

### Estimate Formats

**For stakeholders**:
```
Feature: User Dashboard
Estimate: 2-3 weeks
Confidence: Medium

Includes:
- Backend API
- Frontend UI
- Basic testing

Does NOT include:
- Performance optimization
- Full browser testing
- Documentation
```

**For planning**:
```
Task breakdown:
- Data model: 2d
- API endpoints: 3d  
- UI components: 4d
- Integration: 2d
- Testing: 2d
- Buffer: 2d
Total: 15 days (3 weeks)
```

---

## Common Estimation Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| No contingency | Every surprise causes overrun | Add 20-50% buffer |
| Padding each task | Individual buffers get consumed | Single buffer at end |
| Ignoring history | Repeat same errors | Track actuals, use for future |
| Single-point estimates | False precision | Give ranges |
| Estimating under pressure | Optimistic to please | Take time, be honest |
| Forgetting non-coding work | Missing meetings, review, deploy | List everything |
| Assuming full productivity | No interruptions | Use realistic factor (0.6-0.8) |
