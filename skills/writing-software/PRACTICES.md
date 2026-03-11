# Pragmatic Practices

Read this when deciding reversibility, orthogonality, tracer-bullet strategy, or broader engineering habits around a change.

Practices and principles from experienced software developers.

## Contents
- Core Philosophy
- Design Practices
- Tool Practices
- Project Practices
- Career Practices

---

## Core Philosophy

### Care About Your Craft

Take pride in what you build. Don't just make it work - make it well.

### Think About Your Work

Don't develop on autopilot. Question approaches, consider alternatives.

### You Have Agency

"I can't do X because Y" → What can you change? What's really stopping you?

---

## Design Practices

### DRY - Don't Repeat Yourself

Every piece of knowledge has a single, unambiguous representation.

**Types of duplication**:
- Imposed: Environment forces it (generated code)
- Inadvertent: Didn't realize it was duplicate
- Impatient: "Faster to copy" (it isn't)
- Inter-developer: Different people duplicate each other

**Not just code**: Also applies to documentation, data structures, schemas.

### Orthogonality

Two components are orthogonal if changes to one don't affect the other.

**Benefits**:
- Increased productivity (localized changes)
- Reduced risk (isolated components)
- Testable (components work in isolation)

**Achieve via**:
- Separate concerns
- Avoid global data
- Avoid similar functions (potential for coupling)
- Write shy code (don't reveal to others, don't depend on others)

### Reversibility

Prepare for change. Decisions will be wrong.

**Techniques**:
- Abstract external dependencies behind interfaces
- Use configuration over hard-coding
- Avoid platform lock-in where practical
- Keep flexibility where cost is low

### Tracer Bullets

Build end-to-end skeleton first, then flesh out.

**Unlike prototypes**:
- Prototypes are throwaway
- Tracer bullets become the system

**Benefits**:
- Users see progress early
- Developers have structure to work in
- Integration happens continuously
- You have something to demo

### Prototypes

Build to learn, then throw away.

**Prototype when**:
- Architecture unclear
- Performance unknown
- UI uncertain
- External system integration unclear

**Make clear it's throwaway**: Don't let prototype become production.

### Domain Languages

Write code in the problem domain's language.

**Internal DSL**: Uses host language syntax
```ruby
describe "Calculator" do
  it "adds numbers" do
    expect(calc.add(2, 2)).to eq(4)
  end
end
```

**External DSL**: Custom syntax, requires parser.

### Estimating

**The question determines precision**:
- "Roughly how long?" → Days/weeks
- "When exactly?" → More analysis needed

**Process**:
1. Understand what's asked
2. Build a model of the system
3. Break into components
4. Give each component a value
5. Calculate the answer
6. Track accuracy over time

**Units matter**:
| Duration | Say |
|----------|-----|
| 1-15 days | Days |
| 3-6 weeks | Weeks |
| 8-20 weeks | Months |
| 20+ weeks | "I need to think about it" |

---

## Tool Practices

### Plain Text

Keep knowledge in plain text where practical.

**Benefits**:
- Human readable
- Insurance against obsolescence
- Leverage existing tools (grep, diff, version control)
- Easier testing

### Shell Power

Master command line. Combine small tools for big results.

### Version Control Everything

Not just code: config, docs, scripts, notes.

**Commit messages**: Explain why, not what.

### Editor Fluency

Know your editor deeply:
- Navigate by search, not mouse
- Multi-cursor editing
- Macros for repetitive tasks
- Snippets for boilerplate

### Debugging

**Rule 1**: Don't panic. Think.

**Reproduce**: Can you make it happen reliably?

**Binary search**: Narrow down systematically.

**Rubber duck**: Explain the problem out loud.

**Don't assume**: Verify your assumptions ("it can't be X" - check X).

**Recent changes**: What changed? Start there.

### Text Manipulation

Learn a text manipulation language (sed, awk, perl, python).

Automate code generation, data transformation, report generation.

---

## Project Practices

### Design by Contract

Specify:
- Preconditions: What must be true before?
- Postconditions: What will be true after?
- Class invariants: What's always true?

```
// Precondition: amount > 0, balance >= amount
// Postcondition: balance = old balance - amount
function withdraw(amount) { ... }
```

### Crash Early

Don't hide problems. Fail fast with useful information.

**Catch problems at**:
1. Compile time (best)
2. Build/link time
3. Runtime initialization
4. Runtime usage (worst - customer finds it)

### Assertive Programming

Use assertions liberally.

**Assert**: Things that "can't happen"

**Not for**: User input validation, expected errors.

```
assert(count >= 0, "Count negative: impossible state")
```

### Decouple

**Tell, Don't Ask**: Tell objects what to do, don't query state and decide.

```
// Bad: ask then decide
if (customer.hasDiscount()) {
    price = price * 0.9
}

// Good: tell
price = customer.applyDiscount(price)
```

**Law of Demeter**: Only talk to immediate friends.
- `this`
- Parameters
- Objects you create
- Component objects

Not: `a.getB().getC().doThing()`

### Programming by Coincidence

Don't do it.

**Signs**:
- Code works but you don't know why
- Changing unrelated thing breaks it
- "Don't touch that code"

**Instead**:
- Understand why it works
- Document assumptions
- Test your understanding

---

## Career Practices

### Knowledge Portfolio

Invest in your knowledge like a financial portfolio.

**Diversify**: Different languages, domains, skills.

**Manage risk**: Balance stable and cutting-edge.

**Review and rebalance**: Periodically assess.

**Suggestions**:
- Learn a new language each year
- Read a technical book each month
- Take courses
- Participate in communities
- Experiment with different environments

### Communicate

Code is communication. Writing is communication.

**Know your audience**: What do they need? What do they know?

**Choose your moment**: When will they be receptive?

**Make it look good**: Format matters.

**Involve your audience**: Get feedback early.

**Be a listener**: Communication is two-way.

**Get back to people**: Respond promptly.

### Team Practices

**No broken windows**: Fix problems promptly.

**Boiled frogs**: Watch for gradual degradation.

**Good-enough software**: Know when to ship.

**Sign your work**: Take pride and responsibility.

---

## Tips Summary

| # | Tip |
|---|-----|
| 1 | Care about your craft |
| 2 | Think about your work |
| 3 | Provide options, don't make excuses |
| 4 | Don't live with broken windows |
| 5 | Be a catalyst for change |
| 6 | Remember the big picture |
| 7 | Make quality a requirements issue |
| 8 | Invest regularly in your knowledge portfolio |
| 9 | Critically analyze what you read and hear |
| 10 | English is just another programming language |
| 11 | It's both what you say and the way you say it |
| 12 | Build documentation in, don't bolt it on |
| 13 | Good design is easier to change than bad design |
| 14 | DRY - Don't Repeat Yourself |
| 15 | Make it easy to reuse |
| 16 | Eliminate effects between unrelated things |
| 17 | There are no final decisions |
| 18 | Use tracer bullets to find the target |
| 19 | Prototype to learn |
| 20 | Program close to the problem domain |
