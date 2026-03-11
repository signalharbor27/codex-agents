# Design Principles

Read this when the real question is "do we need a pattern at all?", when inheritance vs composition is contested, or when you need SOLID and deep-module heuristics to judge a design.

SOLID principles, object-oriented design heuristics, and module design (Ousterhout).

## Contents
- SOLID Principles
- Additional OO Principles
- Module Design (Ousterhout)
- Design Heuristics

---

## SOLID Principles

### Single Responsibility Principle (SRP)

**Definition**: A class should have only one reason to change.

**Violation signs**:
- Class name includes "And", "Manager", "Processor", "Handler"
- Class has methods that don't use the same instance variables
- Changes to unrelated features touch same class

**Example violation**:
```
class Employee {
    calculatePay()      // payroll rules
    saveToDatabase()    // persistence
    generateReport()    // reporting format
}
// Three reasons to change: pay rules, DB schema, report format
```

**Fixed**:
```
class Employee { ... }
class PayrollCalculator { calculatePay(employee) }
class EmployeeRepository { save(employee) }
class EmployeeReporter { generateReport(employee) }
```

**Test**: "The [class name] [does something]" should be one sentence without "and".

---

### Open/Closed Principle (OCP)

**Definition**: Open for extension, closed for modification.

**Violation signs**:
- Adding new type requires modifying existing class
- Switch statements on type codes
- If-else chains checking types

**Example violation**:
```
class AreaCalculator {
    calculate(shape) {
        if (shape.type === 'circle') {
            return Math.PI * shape.radius ** 2
        } else if (shape.type === 'rectangle') {
            return shape.width * shape.height
        }
        // Must modify to add new shape!
    }
}
```

**Fixed**:
```
interface Shape {
    getArea(): number
}

class Circle implements Shape {
    getArea() { return Math.PI * this.radius ** 2 }
}

class Rectangle implements Shape {
    getArea() { return this.width * this.height }
}

// Adding new shape: just add new class, no modification
```

**Achieve via**: Abstraction, polymorphism, Strategy pattern.

---

### Liskov Substitution Principle (LSP)

**Definition**: Subtypes must be substitutable for their base types.

**Violation signs**:
- Subclass throws exceptions parent doesn't
- Subclass doesn't implement all parent methods meaningfully
- Code checks actual type before using object

**Classic violation: Square/Rectangle**:
```
class Rectangle {
    setWidth(w) { this.width = w }
    setHeight(h) { this.height = h }
}

class Square extends Rectangle {
    setWidth(w) { this.width = w; this.height = w }
    setHeight(h) { this.width = h; this.height = h }
}

// Violates LSP: Square doesn't behave like Rectangle
rectangle.setWidth(5)
rectangle.setHeight(10)
// Rectangle: area = 50
// Square: area = 100 (unexpected!)
```

**Fix**: Don't inherit if behavior differs. Use composition or separate hierarchy.

**Test**: Code using base type should work with any subtype without knowing which.

---

### Interface Segregation Principle (ISP)

**Definition**: No client should be forced to depend on methods it doesn't use.

**Violation signs**:
- Interface has many methods
- Implementers throw "not supported" for some methods
- Changes to interface affect unrelated classes

**Example violation**:
```
interface Worker {
    work()
    eat()
    sleep()
}

class Robot implements Worker {
    work() { ... }
    eat() { throw new Error("Robots don't eat") }  // Forced to implement
    sleep() { throw new Error("Robots don't sleep") }
}
```

**Fixed**:
```
interface Workable { work() }
interface Eatable { eat() }
interface Sleepable { sleep() }

class Human implements Workable, Eatable, Sleepable { ... }
class Robot implements Workable { ... }
```

**Achieve via**: Smaller, focused interfaces. Composition of interfaces.

---

### Dependency Inversion Principle (DIP)

**Definition**: 
1. High-level modules should not depend on low-level modules. Both should depend on abstractions.
2. Abstractions should not depend on details. Details should depend on abstractions.

**Violation signs**:
- High-level class imports low-level class directly
- Business logic coupled to database/framework
- Can't test without real dependencies

**Example violation**:
```
class OrderService {
    constructor() {
        this.db = new MySQLDatabase()  // Direct dependency
        this.mailer = new SendGridMailer()
    }
}
```

**Fixed**:
```
interface Database { ... }
interface Mailer { ... }

class OrderService {
    constructor(db: Database, mailer: Mailer) {
        this.db = db
        this.mailer = mailer
    }
}

// Can inject MySQLDatabase, PostgresDatabase, MockDatabase, etc.
```

**Achieve via**: Dependency injection, interface abstraction.

---

## Additional OO Principles

### Favor Composition Over Inheritance

| Inheritance | Composition |
|-------------|-------------|
| IS-A relationship | HAS-A relationship |
| Compile-time | Runtime flexibility |
| White-box reuse | Black-box reuse |
| Tight coupling | Loose coupling |

**When to inherit**:
- True IS-A relationship
- Subtype fully substitutable (LSP)
- Don't need to vary behavior at runtime

**When to compose**:
- Behavior should vary independently
- Need runtime flexibility
- Multiple variations possible

### Program to an Interface

**Not this**:
```
ArrayList<String> items = new ArrayList<>()
```

**This**:
```
List<String> items = new ArrayList<>()
```

**Benefits**: Can change implementation without changing usage.

### Encapsulate What Varies

Identify what varies in your application and separate it from what stays the same.

**Result**: Alter or extend parts that vary without affecting parts that don't.

### Classes Should Be Open for Extension, Closed for Modification

Allow behavior to be extended without modifying existing code.

**Techniques**: Inheritance, composition, strategy pattern.

### Depend on Abstractions, Not Concretions

High-level components shouldn't depend on low-level components.

**Guidelines**:
- No variable should hold reference to concrete class
- No class should derive from concrete class
- No method should override implemented method

---

## Module Design (Ousterhout)

From *A Philosophy of Software Design*.

### Deep vs Shallow Modules

**Deep module**: Simple interface, significant functionality hidden.

```
┌─────────────────────┐
│   Simple Interface  │  ← Few methods, few parameters
├─────────────────────┤
│      Complex        │
│   Implementation    │  ← Lots hidden
└─────────────────────┘
```

**Shallow module**: Interface nearly as complex as implementation.

```
┌─────────────────────────────────────────────┐
│            Complex Interface                │
├─────────────────────────────────────────────┤
│         Simple Implementation               │
└─────────────────────────────────────────────┘
```

**Classitis**: Too many small classes = complexity scattered.

**Goal**: Depth over quantity. One deep class beats five shallow ones.

### Information Hiding

Each module should hide design decisions behind its interface.

**Hide**:
- Data structures
- Algorithms
- Dependencies
- Error handling

**Information leakage** (bad): Design decision visible in multiple modules.

**Temporal decomposition** (bad): Splitting by time order instead of information ownership.

### Pull Complexity Downward

Module developers should suffer complexity, not callers.

- Module written once, used many times
- Developer understands module best
- Simpler interface = less cognitive load for users

**Application**: Handle retries, defaults, edge cases inside module.

### Define Errors Out of Existence

Design APIs so error conditions can't occur.

```
// Before: throws if indices invalid
substring(start, end)

// After: returns empty string, clamps to valid range
substring(start, end)
```

**When applicable**: Default behavior is reasonable, callers rarely need to handle edge cases differently.

### Somewhat General-Purpose

Design interfaces somewhat more general than immediate needs.

**Questions**:
1. Simplest interface covering needs?
2. How many situations will use this?
3. Easy to use for current needs?

**Not** frameworks. **Not** speculation. Just clean abstractions not tied to specific use cases.

---

## Design Heuristics

### Tell, Don't Ask

Tell objects what to do; don't ask for data and decide yourself.

```
// Ask (bad)
if (employee.isManager()) {
    payment = employee.getSalary() + employee.getBonus()
}

// Tell (good)
payment = employee.calculatePayment()
```

### Law of Demeter (Principle of Least Knowledge)

Only talk to immediate friends.

**Allowed**:
- `this`
- Parameters
- Objects you create
- Your components

**Not allowed**:
```
// Reaching through objects
customer.getWallet().getMoney().getAmount()
```

**Fix**: Add methods to encapsulate the chain.

### Hollywood Principle

"Don't call us, we'll call you."

High-level components decide when to call low-level components, not vice versa.

**Related to**: Template Method, Observer, Callback patterns.

### Favor Object Composition Over Class Inheritance

See earlier section. Summarized:
- Composition gives flexibility
- Inheritance gives code reuse but tight coupling
- Use both appropriately

### Design for Change

Anticipate what might change, isolate it behind interfaces.

**Common sources of change**:
- Algorithm/business rules
- Hardware/platform
- External systems
- Data formats
- User requirements

### Keep It Simple

Simpler is better. Don't add patterns speculatively.

**YAGNI**: You Aren't Gonna Need It.

Add complexity when you need it, not before.
