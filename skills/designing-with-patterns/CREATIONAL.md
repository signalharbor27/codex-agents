# Creational Patterns

Read this when construction is the source of change: product families, runtime selection, complex setup, or duplication around object creation.

Patterns for object creation mechanisms.

## Contents
- Factory Method
- Abstract Factory
- Builder
- Singleton
- Prototype

---

## Factory Method

**Intent**: Define interface for creating objects, let subclasses decide which class to instantiate.

**Use when**:
- Class can't anticipate which objects it must create
- Class wants subclasses to specify created objects
- You want to localize knowledge of which class to create

### Structure

```
┌───────────────────────┐     ┌─────────────────────────┐
│     Creator           │     │       Product           │
├───────────────────────┤     ├─────────────────────────┤
│ + factoryMethod()     │────▶│ + operation()           │
│ + anOperation()       │     └─────────────────────────┘
└───────────────────────┘               △
            △                           │
            │                 ┌─────────┴─────────┐
┌───────────────────────┐     │                   │
│  ConcreteCreator      │     │                   │
├───────────────────────┤  ┌──────────────┐ ┌──────────────┐
│ + factoryMethod()     │──│ConcreteProduct│ │ConcreteProduct│
└───────────────────────┘  └──────────────┘ └──────────────┘
```

### Example

```typescript
// Product interface
interface Button {
    render(): void
    onClick(handler: () => void): void
}

// Concrete products
class WindowsButton implements Button { ... }
class MacButton implements Button { ... }

// Creator
abstract class Dialog {
    abstract createButton(): Button  // Factory method
    
    render() {
        const button = this.createButton()
        button.onClick(() => this.close())
        button.render()
    }
}

// Concrete creators
class WindowsDialog extends Dialog {
    createButton() { return new WindowsButton() }
}

class MacDialog extends Dialog {
    createButton() { return new MacButton() }
}
```

### Simple Factory (Not a Pattern)

Static method that creates objects. Common but not a "pattern."

```typescript
class PizzaFactory {
    static createPizza(type: string): Pizza {
        switch (type) {
            case 'cheese': return new CheesePizza()
            case 'pepperoni': return new PepperoniPizza()
            default: throw new Error('Unknown pizza')
        }
    }
}
```

---

## Abstract Factory

**Intent**: Create families of related objects without specifying concrete classes.

**Use when**:
- System should be independent of how products are created
- System should work with multiple families of products
- Products in a family are designed to work together

### Structure

```
┌─────────────────────────┐
│    AbstractFactory      │
├─────────────────────────┤
│ + createProductA()      │
│ + createProductB()      │
└─────────────────────────┘
            △
     ┌──────┴──────┐
     │             │
┌────────────┐ ┌────────────┐
│ Factory1   │ │ Factory2   │
├────────────┤ ├────────────┤
│createProdA │ │createProdA │
│createProdB │ │createProdB │
└────────────┘ └────────────┘
```

### Example

```typescript
// Abstract products
interface Button { render(): void }
interface Checkbox { check(): void }

// Abstract factory
interface GUIFactory {
    createButton(): Button
    createCheckbox(): Checkbox
}

// Concrete factories
class WindowsFactory implements GUIFactory {
    createButton() { return new WindowsButton() }
    createCheckbox() { return new WindowsCheckbox() }
}

class MacFactory implements GUIFactory {
    createButton() { return new MacButton() }
    createCheckbox() { return new MacCheckbox() }
}

// Client code
function buildUI(factory: GUIFactory) {
    const button = factory.createButton()
    const checkbox = factory.createCheckbox()
    // Works with any factory
}
```

### Factory Method vs Abstract Factory

| Factory Method | Abstract Factory |
|----------------|------------------|
| One product | Family of products |
| Subclassing | Object composition |
| Single method | Multiple methods |

---

## Builder

**Intent**: Separate construction of complex object from its representation.

**Use when**:
- Object has many optional parameters
- Construction requires multiple steps
- Same construction process should create different representations

### Structure

```
┌─────────────────┐       ┌─────────────────────┐
│    Director     │──────▶│      Builder        │
├─────────────────┤       ├─────────────────────┤
│ + construct()   │       │ + buildPartA()      │
└─────────────────┘       │ + buildPartB()      │
                          │ + getResult()       │
                          └─────────────────────┘
                                    △
                          ┌─────────┴─────────┐
                    ┌───────────────┐   ┌───────────────┐
                    │ConcreteBuilder│   │ConcreteBuilder│
                    └───────────────┘   └───────────────┘
```

### Example

```typescript
class Pizza {
    dough: string
    sauce: string
    toppings: string[] = []
}

// Builder
class PizzaBuilder {
    private pizza = new Pizza()
    
    setDough(dough: string) {
        this.pizza.dough = dough
        return this  // Fluent interface
    }
    
    setSauce(sauce: string) {
        this.pizza.sauce = sauce
        return this
    }
    
    addTopping(topping: string) {
        this.pizza.toppings.push(topping)
        return this
    }
    
    build(): Pizza {
        const result = this.pizza
        this.pizza = new Pizza()  // Reset for reuse
        return result
    }
}

// Usage
const pizza = new PizzaBuilder()
    .setDough('thin')
    .setSauce('tomato')
    .addTopping('cheese')
    .addTopping('pepperoni')
    .build()
```

### Builder vs Telescoping Constructor

**Telescoping constructor problem**:
```typescript
// Hard to read, easy to get wrong
new Pizza("thin", null, "tomato", true, false, null, "cheese")
```

**Builder solution**:
```typescript
// Clear, self-documenting
new PizzaBuilder()
    .setDough("thin")
    .setSauce("tomato")
    .addTopping("cheese")
    .build()
```

---

## Singleton

**Intent**: Ensure class has only one instance with global access point.

**Use when**:
- Exactly one instance needed (config, logging, resource pool)
- Instance must be accessible globally

**Warning**: Often overused. Consider alternatives first.

### Basic Implementation

```typescript
class Singleton {
    private static instance: Singleton
    
    private constructor() { }  // Prevent direct construction
    
    static getInstance(): Singleton {
        if (!Singleton.instance) {
            Singleton.instance = new Singleton()
        }
        return Singleton.instance
    }
}
```

### Thread-Safe Considerations

In multi-threaded environments, basic implementation has race condition.

**Solutions**:
- Eager initialization (create at class load)
- Double-checked locking
- Language-specific thread-safe mechanisms

### Singleton Problems

| Problem | Issue |
|---------|-------|
| Hidden dependencies | Classes secretly depend on global state |
| Testing difficulty | Can't substitute with mock |
| Violation of SRP | Class manages its own lifecycle |
| Global state | Makes reasoning harder |

### Alternatives to Singleton

- **Dependency injection**: Pass instance to those who need it
- **Module-level instance**: Export single instance, not class
- **Context object**: Pass shared state explicitly

```typescript
// Instead of Singleton
class Config { ... }

// Module exports single instance
export const config = new Config()

// Or use DI
class Service {
    constructor(private config: Config) {}
}
```

---

## Prototype

**Intent**: Create new objects by copying existing prototype.

**Use when**:
- Classes to instantiate specified at runtime
- Avoid building class hierarchy of factories
- Object has few different states; easier to clone than create

### Structure

```typescript
interface Prototype {
    clone(): Prototype
}

class ConcretePrototype implements Prototype {
    field: string
    
    clone(): ConcretePrototype {
        const clone = new ConcretePrototype()
        clone.field = this.field
        return clone
    }
}
```

### Example: Shape Cloning

```typescript
abstract class Shape {
    x: number
    y: number
    color: string
    
    abstract clone(): Shape
}

class Circle extends Shape {
    radius: number
    
    clone(): Circle {
        const clone = new Circle()
        clone.x = this.x
        clone.y = this.y
        clone.color = this.color
        clone.radius = this.radius
        return clone
    }
}

// Usage
const original = new Circle()
original.radius = 10
original.color = 'red'

const copy = original.clone()
copy.x = 100  // Modify copy independently
```

### Shallow vs Deep Copy

**Shallow copy**: Copy primitive fields, share references to objects.

**Deep copy**: Recursively copy all nested objects.

```typescript
// Shallow: nested object shared
clone.nested = this.nested

// Deep: nested object copied
clone.nested = this.nested.clone()
```

**Choose based on**: Whether nested objects should be shared or independent.

---

## Creational Pattern Comparison

| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| Factory Method | Create one product, defer to subclasses | Framework where subclass decides |
| Abstract Factory | Create product families | Multiple product families, ensure compatibility |
| Builder | Complex construction | Many parameters, step-by-step |
| Singleton | Single instance | Shared resource, global config |
| Prototype | Clone objects | Many similar objects, expensive creation |
