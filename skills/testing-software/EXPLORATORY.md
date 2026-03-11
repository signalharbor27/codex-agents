# Exploratory Testing

Read this when requirements are unclear, discovery matters more than regression prevention, or you need human-driven risk hunting before automating.

Heuristics and techniques for human-driven testing.

## Contents
- What Is Exploratory Testing
- Heuristics
- Oracles
- Session-Based Testing
- Bug Investigation

---

## What Is Exploratory Testing

### Definition

Simultaneous learning, test design, and test execution.

**Not**: Random clicking or "playing around."

**Is**: Skilled, directed investigation guided by questions.

### When to Explore

- New feature, unclear requirements
- Complex user interactions
- After automation finds nothing but something feels wrong
- Risk areas, security, edge cases
- Before writing automation (to understand behavior)

### Exploration vs Scripted Testing

| Exploratory | Scripted |
|-------------|----------|
| Learn as you go | Plan upfront |
| Adapt to findings | Follow steps |
| Tester judgment | Repeatable |
| Find unexpected issues | Verify expected behavior |

**Both needed**: Exploration finds issues; automation prevents regression.

---

## Heuristics

### What Are Heuristics?

Fallible methods for solving problems or making decisions.

**Not rules**: Guidelines that usually work, not always.

### SFDPOT (San Francisco Depot)

Mnemonic for test coverage areas.

| Letter | Area | Questions |
|--------|------|-----------|
| **S**tructure | Code, architecture | What are the components? How do they connect? |
| **F**unction | Features | What does it do? What should it do? |
| **D**ata | Inputs, outputs | What data flows through? Edge cases? |
| **P**latform | Environment | OS, browser, device, network? |
| **O**perations | Usage | How will users actually use it? Sequences? |
| **T**ime | Temporal | Timing, concurrency, duration, lifecycle? |

### Consistency Heuristics (FEW HICCUPPS)

How to recognize problems by comparing behaviors.

| Heuristic | Compare To |
|-----------|------------|
| **F**amiliarity | What you know about similar products |
| **E**xplanation | Documentation, help text |
| **W**orld | The real world, physics, expectations |
| **H**istory | Previous versions |
| **I**mage | Company reputation, brand expectations |
| **C**laims | Marketing, specs, requirements |
| **C**omparable products | Competitors, similar tools |
| **U**ser expectations | What users would expect |
| **P**urpose | The reason this exists |
| **P**roduct | Other parts of the same product |
| **S**tatutes | Laws, regulations, standards |

**Example**: "The error message says 'File saved' but the file wasn't saved. That's inconsistent with the **E**xplanation."

### Boundary Heuristics

**ZOMBIES**: Zero, One, Many, Boundary, Interface, Exception, Simple.

**Common boundaries**:
- 0, 1, max-1, max, max+1
- Empty string, single char, very long string
- Null, undefined, missing
- Min date, max date
- Negative numbers

### Goldilocks Heuristic

Test values that are:
- Too small
- Just right
- Too big

---

## Oracles

### What Is an Oracle?

A mechanism for recognizing problems. How you know something is wrong.

**Not just expected results**: Any source of insight into correct behavior.

### Types of Oracles

| Oracle | Source of Truth |
|--------|-----------------|
| Specification | Requirements, design docs |
| Comparable product | Similar software |
| Historical | Previous version |
| Regression | Test suite |
| Heuristic | Rules of thumb |
| Expert | Domain expert opinion |
| Model | Mathematical or logical model |
| User | What users expect |

### Oracle Limitations

**No perfect oracle**: All oracles are incomplete or fallible.

**Oracle problem**: Determining correct behavior is hard.

**False positives**: Oracle says wrong, but it's actually right.

**False negatives**: Oracle says right, but it's actually wrong.

---

## Session-Based Testing

### What Is Session-Based Testing?

Time-boxed exploratory testing with structure and reporting.

### Session Structure

**Charter**: What are you testing and why?
**Time box**: Usually 60-90 minutes.
**Notes**: Document what you do and find.
**Debrief**: Review findings with team.

### Charter Examples

```
Explore [target area]
With [resources, techniques]
To discover [information sought]
```

**Examples**:
- "Explore the checkout flow with edge-case payment data to discover input validation issues."
- "Explore the API under high load with concurrent requests to discover race conditions."
- "Explore the mobile app on slow network to discover timeout handling issues."

### Session Notes (PROOF)

| Element | Record |
|---------|--------|
| **P**ast | What you tested |
| **R**esults | What you found |
| **O**bstacles | What blocked you |
| **O**utlook | What to test next |
| **F**eelings | Concerns, hunches |

### Session Metrics

Track test effort, not just bugs.

**Session metrics**:
- Time spent testing vs investigating bugs
- Time spent setting up
- Coverage of charter
- New charters generated

---

## Bug Investigation

### Isolating Issues

**Reproduce**: Can you make it happen again?

**Minimize**: Simplest steps to reproduce?

**Vary**: What variations also fail? What doesn't fail?

**Document**: Steps, data, environment.

### Bug Reporting

**Good bug report includes**:
1. Summary (one sentence)
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Environment (OS, browser, version)
6. Evidence (screenshot, log, video)

### Bug Advocacy

**Sell the bug**: Help others understand impact.

**Avoid**:
- Blaming developers
- Emotional language
- Incomplete information

**Include**:
- User impact
- Business impact
- Risk if not fixed

### Clustering and Patterns

When you find a bug, look for:
- Similar bugs nearby (same module, same developer)
- Pattern of errors (all input validation, all edge cases)
- Root cause that explains multiple bugs

---

## Testing Tours

Structured approaches to explore an application.

### Guidebook Tours

| Tour | Focus |
|------|-------|
| Landmark | Visit major features |
| Money | Revenue-critical paths |
| Historical | Previously buggy areas |
| Bad neighborhood | Risky, complex areas |

### Functional Tours

| Tour | Focus |
|------|-------|
| Feature | Every feature systematically |
| Complexity | Most complex paths |
| Claims | Test marketing claims |
| Configuration | Settings, preferences |

### Adversarial Tours

| Tour | Focus |
|------|-------|
| Saboteur | Try to break it |
| Anti-social | Invalid inputs, abuse |
| Obsessive | Repeat actions excessively |
| Chaotic | Random, unexpected actions |

---

## Skills for Exploratory Testing

### Questioning

Ask constantly:
- What could go wrong here?
- What assumptions am I making?
- What haven't I tried?
- What would a user do?

### Note-Taking

Capture as you go:
- What you did
- What you observed
- Questions that arose
- Ideas for more testing

### Mental Models

Build understanding:
- How does this work?
- What are the components?
- Where are the risks?
- What's the state?

### Lateral Thinking

Try unexpected things:
- What if I skip this step?
- What if I go back?
- What if I do this twice?
- What if I cancel midway?
