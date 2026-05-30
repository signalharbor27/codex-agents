# Managing Complexity

Read this when the main problem is cognitive load, change amplification, shallow modules, or information leakage.

From John Ousterhout's *A Philosophy of Software Design*, with principles from *The Pragmatic Programmer* and *Code Complete*.

## Contents
- The Nature of Complexity
- Symptoms of Complexity
- Strategic vs Tactical Programming
- Deep vs Shallow Modules
- Information Hiding
- General-Purpose Modules
- Pull Complexity Downward
- Define Errors Out of Existence
- Simplicity & Restraint

---

## The Nature of Complexity

**Definition**: Complexity is anything related to the structure of a software system that makes it hard to understand and modify.

**Formula**: `Total Complexity = Sum(component_complexity × time_spent_on_component)`

Complexity isn't inherently bad if it's isolated in rarely-touched areas. Focus on reducing complexity where you spend the most time.

**Key insight**: Complexity is more apparent to readers than writers. If others find your code complex, it is complex.

---

## Symptoms of Complexity

### 1. Change Amplification

Simple change requires modifications in many places.

**Example**: Adding a new field requires updating 10 different files.

**Fix**: Consolidate related logic; reduce duplication of knowledge.

### 2. Cognitive Load

How much a developer needs to know to complete a task.

**Signs**:
- Many variables to track
- Complex dependencies
- Implicit assumptions
- Required historical knowledge

**Fix**: Simplify interfaces; document assumptions; reduce state.

### 3. Unknown Unknowns

Not obvious what you need to know to make a change.

**The worst symptom**: You don't know what you don't know.

**Signs**:
- Changes cause unexpected breakage
- No clear starting point
- Hidden dependencies

**Fix**: Make dependencies obvious; document non-obvious behavior; reduce information hiding violations.

---

## Strategic vs Tactical Programming

### Tactical Programming

**Mindset**: Get feature working ASAP.

**Result**: Technical debt accumulates. Each task adds small complexity. System degrades.

**Trap**: "I'll clean it up later" (you won't).

### Strategic Programming

**Mindset**: Working code is not enough. Primary goal is great design that also works.

**Invest 10-20% of time** in:
- Improving existing code when you touch it
- Writing good documentation
- Iterating on design before committing
- Proactive refactoring

**Payoff**: Slower initially, much faster long-term.

**Facebook's lesson**: "Move fast and break things" was later revised to "Move fast with solid infrastructure" after technical debt became crippling.

---

## Deep vs Shallow Modules

Before editing a non-trivial or high-risk path, set a small complexity budget:
- What knowledge should become less scattered after this change?
- What knowledge must stay hidden from callers?
- How many files should a future small policy change touch?
- What shallow wrapper, pass-through helper, or duplicate state can be deleted or avoided?
- What complexity is intentionally accepted because removing it would expand scope?

### Deep Modules (Good)

```
┌─────────────────────┐
│   Simple Interface  │  ← Small surface area
├─────────────────────┤
│                     │
│                     │
│      Complex        │
│   Implementation    │  ← Lots of functionality hidden
│                     │
│                     │
└─────────────────────┘
```

**Characteristics**:
- Simple interface (few methods, few parameters)
- Significant functionality behind interface
- High abstraction value (hides complexity)

**Examples**:
- Unix file I/O: `open`, `read`, `write`, `close` — hides disk, buffering, permissions
- Garbage collector: no interface at all, handles complex memory management

### Shallow Modules (Bad)

```
┌─────────────────────────────────────────────┐
│            Complex Interface                │  ← Large surface area
├─────────────────────────────────────────────┤
│         Simple Implementation               │  ← Little hidden
└─────────────────────────────────────────────┘
```

**Characteristics**:
- Interface nearly as complex as implementation
- Little abstraction value
- Callers must understand implementation anyway

**Red flags**:
- Many small classes with tiny methods
- Interface exposes implementation details
- Method does little more than call another method

### Classitis

**Anti-pattern**: "Classes should be small" taken to extreme.

**Result**: Many shallow classes, complexity scattered, hard to understand flow.

**Fix**: Depth over quantity. One deep class beats five shallow ones.

---

## Information Hiding

### Principle

Each module should hide its design decisions behind an interface. Other modules shouldn't know or depend on those decisions.

### What to Hide

- Data structures and representations
- Algorithms and implementation details
- Lower-level dependencies
- Error handling mechanisms

### Information Leakage (Anti-pattern)

**Definition**: Design decision visible in multiple modules.

**Forms**:
1. **Back-door leakage**: Modules share assumptions not in interface
2. **Temporal decomposition**: Splitting by time order instead of information
3. **Overexposed classes**: Implementation details in interface

**Example of temporal decomposition (bad)**:
```
class FileReader { read() }   // Knows file format
class FileParser { parse() }  // Also knows file format
```

**Fix**: Combine into one module that owns format knowledge.

---

## General-Purpose Modules

### Somewhat General > Overly Specific

Design modules to be somewhat more general-purpose than immediate need.

**Not** premature generalization. **Not** generic frameworks.

**Just** clean abstractions that don't encode specific use case.

### Questions to Ask

1. What is the simplest interface that covers my needs?
2. In how many situations will this method be used?
3. Is this API easy to use for my current needs?

### Example

**Overly specific** (tied to UI):
```
void backspaceKey()  // In text editor
```

**Somewhat general** (usable by UI and tests):
```
void delete(start, end)  // General text operations
void moveCursor(position)
```

**Benefits**: Cleaner interface, more testable, easier to extend.

---

## Pull Complexity Downward

### Principle

Module developers should suffer complexity, not callers.

### Rationale

- Module written once, used many times
- Developer understands module best
- Simpler interface = less cognitive load for users

### Application

```
// Complexity pushed up (bad): caller handles retries
result = module.operation()
if (result.failed && result.retryable) {
    result = module.operation()  // Caller manages retry
}

// Complexity pulled down (good): module handles retries
result = module.operation()  // Retries handled internally
```

### Configuration

**Many config parameters = pushing complexity up.**

Better: compute sensible defaults; adjust automatically; require config only when necessary.

---

## Define Errors Out of Existence

### Principle

Best way to handle exceptions is to define them away.

### Approach

Design APIs so error conditions can't occur.

**Before** (error-prone):
```
class Substring {
    // Throws if start > end or indices out of bounds
    substring(start, end)
}
```

**After** (errors defined away):
```
class Substring {
    // Returns empty string if range invalid
    // Clamps indices to valid range
    substring(start, end)
}
```

### When Applicable

- Default behavior is reasonable
- Callers rarely need to handle edge cases differently
- Error handling would be boilerplate

### When NOT Applicable

- Error represents actual failure (network down)
- Caller genuinely needs to know about condition
- Silently handling would mask bugs

---

## Simplicity & Restraint

### Simplicity as Default

**Simplicity is the ultimate sophistication.** Every line of code is a liability: it must be written, read, tested, debugged, and maintained.

**Principle**: The best code is no code. The second best is simple code.

**Before adding**:
1. Can I solve this without new code?
2. Can I delete code instead?
3. What's the simplest thing that could work?

### YAGNI: You Aren't Gonna Need It

**Don't build for hypothetical futures.**

| Temptation | Reality |
|------------|---------|
| "We might need this later" | 80% of anticipated features never get used |
| "It's easy to add now" | Unused code still costs: maintenance, cognitive load, bugs |
| "What if requirements change?" | Build for change through simplicity, not speculation |

**YAGNI applies to**:
- Features
- Abstractions
- Configuration options
- Extensibility points
- "Flexible" architectures

**YAGNI does NOT mean**:
- Skip tests
- Ignore known requirements
- Write hacky code
- Avoid all abstraction

**Test**: Is there a concrete, current requirement? No? Don't build it.

### Overengineering Red Flags

| Red Flag | Example |
|----------|---------|
| Abstraction without variation | Interface with single implementation |
| Config for everything | 50 config options, 48 never changed |
| "Enterprise" patterns in small apps | Factory factory, AbstractSingletonProxyFactoryBean |
| Premature plugin architecture | Plugin system with one plugin (core) |
| Speculative generality | "Someday we might need..." |
| Resume-driven development | Using tech because it's cool, not needed |

**Questions to ask**:
- How many concrete use cases exist today?
- What's the cost of adding this later vs now?
- Am I solving a problem or inventing one?

### Good Enough Software

From *The Pragmatic Programmer*: Know when to stop.

**Good enough** means:
- Meets requirements
- Maintainable
- Users can do their work
- Acceptable quality for context

**Good enough does NOT mean**:
- Sloppy
- Buggy
- Unmaintainable
- Embarrassing

**The trap**: Perfection is the enemy of done. Polishing beyond "good enough" often adds complexity without value.

**Discipline**: Decide quality level upfront. Meet it. Stop.

```
// Over-polished: 3 days, handles edge cases that never occur
function formatCurrency(amount, locale, currency, precision, 
    negativeFormat, thousandsSep, decimalSep, symbolPosition) { ... }

// Good enough: 30 minutes, handles actual requirements
function formatUSD(cents) {
    return '$' + (cents / 100).toFixed(2)
}
```

### When to Optimize

**Knuth**: "Premature optimization is the root of all evil."

**Full quote** (often forgotten): "We should forget about small efficiencies, say about 97% of the time: premature optimization is the root of all evil. Yet we should not pass up our opportunities in that critical 3%."

**The 3%**: Optimize when:
1. **Measured**: Profiler shows this is a bottleneck
2. **Matters**: Performance affects users or costs
3. **Targeted**: You know exactly what to optimize

**Don't optimize**:
- Based on intuition ("this looks slow")
- Before measuring
- Code that runs rarely
- At cost of readability (usually)

**Optimization workflow**:
```
1. Make it work (correct)
2. Make it clear (readable)
3. Measure (profile)
4. Optimize the bottleneck (if needed)
5. Measure again (verify improvement)
```

**Common waste**:
- Optimizing code that runs once at startup
- Caching data that's cheap to compute
- Micro-optimizations in non-hot paths
- "Optimization" that makes code harder to understand

### Complexity is Incremental

**Ousterhout's key insight**: Complexity isn't one big mistake. It's death by a thousand cuts.

Each small decision seems harmless:
- "Just one more parameter"
- "Just one special case"
- "Just one more abstraction layer"

**Discipline**: Treat every complexity addition as a cost. Ask: "Is this worth it?"

**Zero-based thinking**: If I were starting fresh, would I add this? No? Consider removing it.

---

## Red Flags (Summary)

| Red Flag | Indicates |
|----------|-----------|
| Shallow module | Interface not simpler than implementation |
| Information leakage | Design decision in multiple places |
| Temporal decomposition | Splitting by time instead of information |
| Overexposure | Implementation details in interface |
| Pass-through method | Method does nothing but delegate |
| Repetition | Same code/knowledge in multiple places |
| Special-general mixture | General mechanism with special-case code |
| Conjoined methods | Can't understand one without the other |
| Non-obvious code | Reader can't quickly understand behavior |
| Speculative generality | Building for hypothetical future needs |
| Premature optimization | Optimizing without measurement |
| Interface with one implementation | Abstraction without variation |
| Excessive configuration | Pushing decisions to users unnecessarily |

---

## Quick Decision Tree

```
Is this module deep enough?
  Interface simpler than implementation? → Good
  Interface exposes implementation? → Refactor

Am I programming tactically?
  "Just make it work" mindset? → Step back, think strategically
  Cutting corners? → Invest 10-20% in design

Is information leaking?
  Same knowledge in multiple modules? → Consolidate
  Temporal decomposition? → Reorganize by information

Can I define away this error?
  Reasonable default behavior exists? → Define it away
  Caller needs to know? → Keep the error

Is this module general enough?
  Tied to specific use case? → Generalize interface
  Building generic framework? → Pull back, stay practical

Should I build this abstraction/feature?
  Concrete requirement exists now? → Build it
  "Might need it someday"? → YAGNI, don't build
  Single implementation? → Skip the interface

Should I optimize this?
  Profiler shows bottleneck? → Optimize
  "Looks slow" intuition? → Measure first
  Rarely-executed code? → Leave it clear, not fast
```
