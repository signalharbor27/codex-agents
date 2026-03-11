# Refactoring Techniques

Read this when the problem is already diagnosed and you need the safest behavior-preserving move to apply next.

Catalog of behavior-preserving code transformations.

## Contents
- Composing Methods
- Moving Features
- Organizing Data
- Simplifying Conditionals
- Refactoring APIs
- Dealing with Inheritance

---

## Composing Methods

Transform long methods into well-organized code.

### Extract Method

**When**: Code fragment that can be grouped together.

**Mechanics**:
1. Create new method, name by intention (what, not how)
2. Copy extracted code to new method
3. Scan for local variables (parameters or temps)
4. Replace original code with call
5. Test

```
// Before
function printOwing() {
    // print banner
    console.log("*****")
    console.log("Bill")
    console.log("*****")
    
    // calculate
    let total = 0
    for (const item of items) total += item.price
}

// After
function printOwing() {
    printBanner()
    const total = calculateTotal()
}

function printBanner() { ... }
function calculateTotal() { ... }
```

### Inline Method

**When**: Method body is as clear as the name.

**Mechanics**:
1. Ensure method isn't polymorphic (not overridden)
2. Find all calls
3. Replace each call with method body
4. Delete method

### Extract Variable (Introduce Explaining Variable)

**When**: Complex expression hard to understand.

```
// Before
if (order.quantity * order.price > 1000 && 
    order.customer.loyaltyYears > 2) { ... }

// After
const orderTotal = order.quantity * order.price
const isLoyalCustomer = order.customer.loyaltyYears > 2
if (orderTotal > 1000 && isLoyalCustomer) { ... }
```

### Inline Variable

**When**: Variable name says no more than expression.

```
// Before
const basePrice = order.basePrice
return basePrice > 1000

// After
return order.basePrice > 1000
```

### Replace Temp with Query

**When**: Temp used to hold result of expression.

```
// Before
const basePrice = quantity * itemPrice
if (basePrice > 1000) return basePrice * 0.95

// After
if (getBasePrice() > 1000) return getBasePrice() * 0.95
function getBasePrice() { return quantity * itemPrice }
```

**Note**: Only if expression has no side effects and computation is cheap.

---

## Moving Features

Move elements between classes.

### Move Method

**When**: Method uses more features of another class.

**Mechanics**:
1. Examine all features used by method
2. Check if method is overridden in subclasses
3. Create method in target class
4. Copy code, adjust for new context
5. Redirect original to delegate to new method
6. Test, then consider removing original

### Move Field

**When**: Field used more by another class.

**Mechanics**:
1. Create field in target class with accessors
2. Update references to use new location
3. Remove original field

### Extract Class

**When**: Class doing work that should be two classes.

**Signs**: Subset of data and methods go together.

```
// Before: Person has phone number responsibilities
class Person {
    name, officeAreaCode, officeNumber
    getTelephoneNumber() { ... }
}

// After: Extract TelephoneNumber
class Person {
    name
    officeTelephone: TelephoneNumber
}
class TelephoneNumber {
    areaCode, number
    getTelephoneNumber() { ... }
}
```

### Inline Class

**When**: Class isn't doing enough to justify existence.

**Opposite of Extract Class**.

### Hide Delegate

**When**: Client calls through an object to get to another.

```
// Before
department = person.getDepartment()
manager = department.getManager()

// After
manager = person.getManager()
// Person internally delegates to department
```

### Remove Middle Man

**When**: Class has too many delegating methods.

**Opposite of Hide Delegate**.

---

## Organizing Data

Restructure data handling.

### Replace Primitive with Object

**When**: Primitive carrying more meaning than the type suggests.

```
// Before
const phone = "555-1234"

// After
const phone = new PhoneNumber("555-1234")
// Can add validation, formatting, comparison
```

### Replace Temp with Query

See Composing Methods section.

### Replace Magic Literal

**When**: Literal with special meaning.

```
// Before
if (status === 2) { ... }

// After
const PENDING = 2
if (status === PENDING) { ... }

// Even better
if (status === Status.PENDING) { ... }
```

### Encapsulate Variable

**When**: Widely accessed data needs controlled access.

```
// Before
let defaultOwner = { firstName: "Martin", lastName: "Fowler" }

// After
let _defaultOwner = { ... }
function getDefaultOwner() { return _defaultOwner }
function setDefaultOwner(arg) { _defaultOwner = arg }
```

### Encapsulate Collection

**When**: Method returns collection directly.

```
// Before
getPeople() { return this._people }

// After
getPeople() { return [...this._people] }  // return copy
addPerson(p) { this._people.push(p) }
removePerson(p) { ... }
```

---

## Simplifying Conditionals

Make conditional logic clearer.

### Decompose Conditional

**When**: Complicated conditional (if-then-else).

```
// Before
if (date.before(SUMMER_START) || date.after(SUMMER_END)) {
    charge = quantity * winterRate + winterServiceCharge
} else {
    charge = quantity * summerRate
}

// After
if (isSummer(date)) {
    charge = summerCharge(quantity)
} else {
    charge = winterCharge(quantity)
}
```

### Consolidate Conditional Expression

**When**: Multiple conditionals with same result.

```
// Before
if (age < 18) return 0
if (!isEmployed) return 0
if (yearsEmployed < 2) return 0
return normalBenefit()

// After
if (isIneligible()) return 0
return normalBenefit()

function isIneligible() {
    return age < 18 || !isEmployed || yearsEmployed < 2
}
```

### Replace Nested Conditional with Guard Clauses

**When**: Conditional with unusual cases obscuring normal path.

```
// Before
function payAmount() {
    if (isDead) {
        result = deadAmount()
    } else {
        if (isSeparated) {
            result = separatedAmount()
        } else {
            result = normalAmount()
        }
    }
    return result
}

// After
function payAmount() {
    if (isDead) return deadAmount()
    if (isSeparated) return separatedAmount()
    return normalAmount()
}
```

### Replace Conditional with Polymorphism

**When**: Conditional chooses behavior based on type.

```
// Before
function getSpeed() {
    switch (this.type) {
        case 'european': return getBaseSpeed()
        case 'african': return getBaseSpeed() - getLoadFactor()
        case 'norwegian_blue': return isNailed ? 0 : getBaseSpeed()
    }
}

// After
class EuropeanBird { getSpeed() { return getBaseSpeed() } }
class AfricanBird { getSpeed() { return getBaseSpeed() - getLoadFactor() } }
class NorwegianBlueBird { getSpeed() { return this.isNailed ? 0 : getBaseSpeed() } }
```

### Introduce Special Case (Null Object)

**When**: Many places check for special case (often null).

```
// Before
if (customer === null) plan = "basic"
else plan = customer.plan

// After
// NullCustomer returns sensible defaults
customer = customer ?? new NullCustomer()
plan = customer.plan
```

---

## Refactoring APIs

Improve interfaces between modules.

### Separate Query from Modifier

**When**: Function both returns value AND has side effects.

```
// Before
function getTotalAndUpdate() {
    updateCount++
    return items.reduce((a, b) => a + b)
}

// After
function getTotal() { return items.reduce((a, b) => a + b) }
function incrementUpdateCount() { updateCount++ }
```

### Parameterize Method

**When**: Multiple methods do similar things with different values.

```
// Before
tenPercentRaise()
fivePercentRaise()

// After
raise(percentage)
```

### Replace Parameter with Explicit Methods

**When**: Method runs different code depending on parameter.

```
// Before
setValue(name, value) {
    if (name === "height") this._height = value
    else if (name === "width") this._width = value
}

// After
setHeight(value) { this._height = value }
setWidth(value) { this._width = value }
```

### Preserve Whole Object

**When**: Getting several values from object to pass as parameters.

```
// Before
const low = room.daysTempRange.getLow()
const high = room.daysTempRange.getHigh()
if (plan.withinRange(low, high))

// After
if (plan.withinRange(room.daysTempRange))
```

### Introduce Parameter Object

**When**: Group of parameters that go together.

```
// Before
amountInvoiced(startDate, endDate)
amountReceived(startDate, endDate)
amountOverdue(startDate, endDate)

// After
amountInvoiced(dateRange)
amountReceived(dateRange)
amountOverdue(dateRange)
```

---

## Dealing with Inheritance

Restructure class hierarchies.

### Pull Up Method

**When**: Methods with identical results in subclasses.

**Move to superclass**.

### Push Down Method

**When**: Behavior relevant only to some subclasses.

**Move to specific subclasses**.

### Pull Up Field

**When**: Subclasses have same field.

**Move to superclass**.

### Push Down Field

**When**: Field only used by some subclasses.

**Move to specific subclasses**.

### Replace Subclass with Delegate

**When**: Inheritance isn't the right relationship.

**Prefer composition over inheritance** when:
- Subclass used for one variant
- Behavior can vary independently
- Need multiple inheritance

```
// Before
class Booking { ... }
class PremiumBooking extends Booking { ... }

// After
class Booking {
    _premium: PremiumDelegate
}
```

### Extract Superclass

**When**: Two classes with similar features.

**Create superclass and Pull Up common elements**.

### Collapse Hierarchy

**When**: Superclass and subclass not different enough.

**Merge them into one**.
