# Code Smells

Read this when you need to classify the smell before choosing a refactor or deciding whether the code is actually a problem.

Catalog of indicators that code may need refactoring.

## Contents
- Bloaters
- Object-Orientation Abusers
- Change Preventers
- Dispensables
- Couplers

---

## Bloaters

Code that grows too large to work with effectively.

### Long Method

**Signs**:
- Method > 20 lines
- Need to scroll to see entire method
- Comments explaining sections

**Causes**: Accretion over time, fear of creating functions.

**Fixes**:
- Extract Method
- Replace Temp with Query
- Decompose Conditional

### Long Parameter List

**Signs**:
- More than 3-4 parameters
- Boolean flags controlling behavior
- Parameters that travel together

**Causes**: Method doing too much, missing abstraction.

**Fixes**:
- Introduce Parameter Object
- Replace Parameter with Method Call
- Preserve Whole Object

### Large Class

**Signs**:
- Too many instance variables
- Too many methods
- Class name needs "And" or "Manager" or "Processor"
- Can't describe class purpose in one sentence

**Causes**: Class accumulated responsibilities.

**Fixes**:
- Extract Class
- Extract Subclass
- Extract Interface

### Data Clumps

**Signs**:
- Same 3+ variables appear together repeatedly
- Subset of class fields always used together
- Multiple methods take same parameter groups

```
// Smell: always appear together
function createOrder(street, city, zip, country) { ... }
function validateAddress(street, city, zip, country) { ... }
```

**Fixes**: Introduce Parameter Object, Extract Class.

### Primitive Obsession

**Signs**:
- Using strings for structured data (phone, email, money)
- Constants for enum-like values
- Type checking via strings/integers

```
// Smell
const status = "PENDING"
const amount = 1999  // cents? dollars?

// Better
const status = OrderStatus.PENDING
const amount = Money.cents(1999)
```

**Fixes**: Replace Primitive with Object, Replace Type Code with Class/Subclasses.

---

## Object-Orientation Abusers

Poor use of OO principles.

### Switch Statements

**Signs**:
- Same switch/case on type in multiple places
- Adding new type requires changes in many places

```
// Smell: scattered switches on type
switch (employee.type) {
    case "engineer": return basePay
    case "manager": return basePay + bonus
    case "salesman": return basePay + commission
}
```

**Fixes**:
- Replace Conditional with Polymorphism
- Replace Type Code with Strategy

### Temporary Field

**Signs**:
- Instance variable only set/used in certain circumstances
- Object only valid when certain fields set
- Null checks scattered throughout

**Causes**: Method needed variable, made it instance variable.

**Fixes**: Extract Class, Introduce Null Object.

### Refused Bequest

**Signs**:
- Subclass doesn't use inherited methods
- Subclass overrides to do nothing or throw
- Inheritance hierarchy feels forced

**Causes**: Inheritance for reuse rather than substitution.

**Fixes**: Replace Inheritance with Delegation, Push Down Method.

### Alternative Classes with Different Interfaces

**Signs**:
- Two classes do similar things with different method names
- Client has to know which class it's using

**Fixes**: Rename Methods, Move Method, Extract Superclass.

---

## Change Preventers

Structures that make change difficult.

### Divergent Change

**Signs**:
- One class changed for many different reasons
- Class has multiple axes of change
- "We change this file for every feature"

**Causes**: Class accumulated unrelated responsibilities.

**Fixes**: Extract Class (one per axis of change).

### Shotgun Surgery

**Signs**:
- One change requires edits to many classes
- Same concern scattered across codebase
- Adding feature touches 10+ files

**Causes**: Single responsibility spread across system.

**Fixes**: Move Method, Move Field, Inline Class (consolidate).

### Parallel Inheritance Hierarchies

**Signs**:
- Creating subclass A always requires creating subclass B
- Two hierarchies mirror each other

```
// Smell
class EngineerEmployee extends Employee
class EngineerPayCalculator extends PayCalculator
```

**Fixes**: Move Method to eliminate one hierarchy.

---

## Dispensables

Code that could be removed without loss.

### Comments

**Signs**:
- Comments explain what code does (not why)
- Comments apologize for bad code
- Long comment blocks

**Causes**: Code isn't self-documenting.

**Fixes**: Extract Method with good name, Rename Variable, improve code so comment unnecessary.

### Duplicate Code

**Signs**:
- Same expression in multiple places
- Same algorithm with slight variations
- Copy-paste with minor edits

**Severity levels**:
1. Same expression in same method → Extract Variable
2. Same code in same class → Extract Method
3. Same code in sibling classes → Pull Up Method
4. Similar code in unrelated classes → Extract Class

### Dead Code

**Signs**:
- Unreachable code paths
- Unused parameters, variables, methods
- Code commented "just in case"

**Fixes**: Delete it. Version control has history.

### Speculative Generality

**Signs**:
- "We might need this someday"
- Abstract class with one implementation
- Parameters passed but never used
- Method names include "handle" or "process" generically

**Causes**: Designing for unknown future.

**Fixes**: Collapse Hierarchy, Inline Class, Remove Parameter.

### Lazy Class

**Signs**:
- Class doesn't do enough to justify existence
- Class delegating almost everything
- Could be inlined into callers

**Fixes**: Inline Class, Collapse Hierarchy.

---

## Couplers

Excessive coupling between classes.

### Feature Envy

**Signs**:
- Method uses more features of another class than its own
- Lots of getter calls on another object
- Method seems to belong elsewhere

```
// Smell: method envies Customer
function getDiscount(customer) {
    if (customer.loyaltyPoints > 1000 &&
        customer.memberSince < twoYearsAgo &&
        customer.totalPurchases > 10000) {
        return customer.baseDiscount * 1.5
    }
}
```

**Fixes**: Move Method to the envied class.

### Inappropriate Intimacy

**Signs**:
- Classes access each other's private parts
- Circular dependencies
- "Friend" classes that know too much

**Fixes**: Move Method, Move Field, Extract Class, Replace Inheritance with Delegation.

### Message Chains

**Signs**:
- Long chains of method calls
- Client depends on navigation structure
- `a.getB().getC().getD().doThing()`

**Causes**: Client navigating object graph.

**Fixes**: Hide Delegate, Extract Method.

### Middle Man

**Signs**:
- Class delegates most methods to another class
- Wrapper that adds nothing
- "Pass-through" class

**Fixes**: Remove Middle Man, Inline Method.

---

## Smell Priority Guide

**Fix immediately**:
- Duplicate code
- Long method (if actively working in area)
- Feature envy

**Fix when working in area**:
- Primitive obsession
- Switch statements
- Message chains

**Plan dedicated refactoring**:
- Large class
- Divergent change
- Shotgun surgery

**Be cautious**:
- Speculative generality (removing might be wrong)
- Comments (might indicate needed documentation)
