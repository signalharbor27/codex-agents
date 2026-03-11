# Structural Patterns

Read this when interface mismatch, wrapper layers, subsystem simplification, or abstraction boundaries are the main problem.

Patterns for composing classes and objects.

## Contents
- Adapter
- Decorator
- Facade
- Composite
- Proxy
- Bridge
- Flyweight

---

## Adapter

**Intent**: Convert interface of a class into another interface clients expect.

**Use when**:
- Want to use existing class but interface doesn't match
- Need to work with incompatible third-party code
- Creating reusable class that cooperates with unrelated classes

### Structure

```
┌─────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Client    │─────▶│    Target       │      │    Adaptee      │
└─────────────┘      ├─────────────────┤      ├─────────────────┤
                     │ + request()     │      │ + specificReq() │
                     └─────────────────┘      └─────────────────┘
                              △                        ▲
                              │                        │
                     ┌─────────────────┐               │
                     │    Adapter      │───────────────┘
                     ├─────────────────┤   (delegates to)
                     │ + request()     │
                     └─────────────────┘
```

### Example

```typescript
// Existing interface client expects
interface Duck {
    quack(): void
    fly(): void
}

// Incompatible class we have
class Turkey {
    gobble() { console.log("Gobble!") }
    fly() { console.log("Short flight") }
}

// Adapter
class TurkeyAdapter implements Duck {
    constructor(private turkey: Turkey) {}
    
    quack() { this.turkey.gobble() }
    fly() {
        // Turkey needs to fly 5 times to match duck distance
        for (let i = 0; i < 5; i++) {
            this.turkey.fly()
        }
    }
}

// Usage
const turkey = new Turkey()
const turkeyDuck = new TurkeyAdapter(turkey)
turkeyDuck.quack()  // Works like a duck
```

### Object vs Class Adapter

**Object adapter**: Composition. Adapter holds adaptee reference.
**Class adapter**: Multiple inheritance. Adapter extends both (where language allows).

---

## Decorator

**Intent**: Attach additional responsibilities to object dynamically.

**Use when**:
- Add responsibilities without affecting other objects
- Responsibilities can be withdrawn
- Extension by subclassing is impractical

### Structure

```
┌─────────────────────┐
│     Component       │
├─────────────────────┤
│ + operation()       │
└─────────────────────┘
          △
    ┌─────┴─────┐
    │           │
┌─────────┐ ┌─────────────────┐
│Concrete │ │    Decorator    │
│Component│ ├─────────────────┤
└─────────┘ │ - component     │
            │ + operation()   │
            └─────────────────┘
                    △
              ┌─────┴─────┐
        ┌──────────┐ ┌──────────┐
        │DecoratorA│ │DecoratorB│
        └──────────┘ └──────────┘
```

### Example: Coffee Shop

```typescript
interface Beverage {
    getDescription(): string
    cost(): number
}

class Espresso implements Beverage {
    getDescription() { return "Espresso" }
    cost() { return 1.99 }
}

// Decorator base
abstract class CondimentDecorator implements Beverage {
    constructor(protected beverage: Beverage) {}
    abstract getDescription(): string
    abstract cost(): number
}

// Concrete decorators
class Mocha extends CondimentDecorator {
    getDescription() { return this.beverage.getDescription() + ", Mocha" }
    cost() { return this.beverage.cost() + 0.20 }
}

class Whip extends CondimentDecorator {
    getDescription() { return this.beverage.getDescription() + ", Whip" }
    cost() { return this.beverage.cost() + 0.10 }
}

// Usage: wrap decorators around component
let beverage: Beverage = new Espresso()
beverage = new Mocha(beverage)
beverage = new Mocha(beverage)  // Double mocha
beverage = new Whip(beverage)

console.log(beverage.getDescription())  // "Espresso, Mocha, Mocha, Whip"
console.log(beverage.cost())  // 2.49
```

### Decorator vs Inheritance

| Decorator | Inheritance |
|-----------|-------------|
| Runtime composition | Compile-time |
| Mix and match | Fixed combinations |
| Many small classes | Class explosion |
| Transparent to client | May require casting |

---

## Facade

**Intent**: Provide unified interface to a set of interfaces in a subsystem.

**Use when**:
- Need simple interface to complex subsystem
- Many dependencies between clients and implementation classes
- Want to layer your subsystems

### Structure

```
┌─────────┐
│ Client  │
└────┬────┘
     │
     ▼
┌─────────────────────────────────────┐
│           Facade                    │
│  + simpleOperation()                │
│  (coordinates subsystem classes)    │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│    Complex Subsystem                │
│  ┌───────┐ ┌───────┐ ┌───────┐     │
│  │Class A│ │Class B│ │Class C│     │
│  └───────┘ └───────┘ └───────┘     │
└─────────────────────────────────────┘
```

### Example: Home Theater

```typescript
// Complex subsystem classes
class Amplifier { on(); off(); setVolume(v); }
class DVDPlayer { on(); off(); play(movie); }
class Projector { on(); off(); wideScreenMode(); }
class Lights { dim(level); }
class Screen { down(); up(); }

// Facade
class HomeTheaterFacade {
    constructor(
        private amp: Amplifier,
        private dvd: DVDPlayer,
        private projector: Projector,
        private lights: Lights,
        private screen: Screen
    ) {}
    
    watchMovie(movie: string) {
        this.lights.dim(10)
        this.screen.down()
        this.projector.on()
        this.projector.wideScreenMode()
        this.amp.on()
        this.amp.setVolume(5)
        this.dvd.on()
        this.dvd.play(movie)
    }
    
    endMovie() {
        this.lights.dim(100)
        this.screen.up()
        this.projector.off()
        this.amp.off()
        this.dvd.off()
    }
}

// Simple usage
const theater = new HomeTheaterFacade(...)
theater.watchMovie("Raiders of the Lost Ark")
```

### Facade vs Adapter

| Facade | Adapter |
|--------|---------|
| Simplifies interface | Converts interface |
| Wraps many classes | Wraps one class |
| Defines new interface | Conforms to existing |

---

## Composite

**Intent**: Compose objects into tree structures. Treat individual objects and compositions uniformly.

**Use when**:
- Represent part-whole hierarchies
- Clients should ignore difference between compositions and individual objects

### Structure

```
┌─────────────────────┐
│     Component       │
├─────────────────────┤
│ + operation()       │
│ + add(Component)    │
│ + remove(Component) │
│ + getChild(int)     │
└─────────────────────┘
          △
    ┌─────┴─────┐
    │           │
┌─────────┐ ┌─────────────┐
│  Leaf   │ │  Composite  │──┐
├─────────┤ ├─────────────┤  │ children
│operation│ │ operation() │◀─┘
└─────────┘ │ add()       │
            │ remove()    │
            └─────────────┘
```

### Example: File System

```typescript
interface FileSystemComponent {
    getName(): string
    getSize(): number
    print(indent: string): void
}

class File implements FileSystemComponent {
    constructor(private name: string, private size: number) {}
    getName() { return this.name }
    getSize() { return this.size }
    print(indent: string) { console.log(`${indent}${this.name}`) }
}

class Directory implements FileSystemComponent {
    private children: FileSystemComponent[] = []
    
    constructor(private name: string) {}
    
    add(component: FileSystemComponent) { this.children.push(component) }
    
    getName() { return this.name }
    
    getSize() {
        return this.children.reduce((sum, c) => sum + c.getSize(), 0)
    }
    
    print(indent: string) {
        console.log(`${indent}${this.name}/`)
        this.children.forEach(c => c.print(indent + "  "))
    }
}

// Usage
const root = new Directory("root")
const docs = new Directory("docs")
docs.add(new File("readme.txt", 100))
docs.add(new File("notes.txt", 50))
root.add(docs)
root.add(new File("config.json", 25))

root.print("")  // Prints tree
root.getSize()  // 175 (recursive)
```

---

## Proxy

**Intent**: Provide surrogate or placeholder for another object to control access.

**Use when**:
- Need lazy initialization (virtual proxy)
- Need access control (protection proxy)
- Need local representative for remote object (remote proxy)
- Need to log/cache access (smart reference)

### Proxy Types

| Type | Purpose |
|------|---------|
| Virtual | Lazy initialization of expensive object |
| Protection | Access control based on permissions |
| Remote | Local representative for remote object |
| Caching | Cache results of expensive operations |
| Logging | Log access to subject |

### Example: Virtual Proxy

```typescript
interface Image {
    display(): void
}

class RealImage implements Image {
    constructor(private filename: string) {
        this.loadFromDisk()  // Expensive operation
    }
    
    private loadFromDisk() {
        console.log(`Loading ${this.filename}`)
    }
    
    display() {
        console.log(`Displaying ${this.filename}`)
    }
}

class ProxyImage implements Image {
    private realImage: RealImage | null = null
    
    constructor(private filename: string) {}
    
    display() {
        if (!this.realImage) {
            this.realImage = new RealImage(this.filename)  // Load on demand
        }
        this.realImage.display()
    }
}

// Usage
const image = new ProxyImage("large_photo.jpg")
// Image not loaded yet
image.display()  // Now loads and displays
image.display()  // Uses cached instance
```

---

## Bridge

**Intent**: Decouple abstraction from implementation so both can vary independently.

**Use when**:
- Want to avoid permanent binding between abstraction and implementation
- Both abstractions and implementations should be extensible by subclassing
- Changes in implementation shouldn't impact clients

### Example

```typescript
// Implementation hierarchy
interface DrawingAPI {
    drawCircle(x: number, y: number, radius: number): void
}

class DrawingAPI1 implements DrawingAPI {
    drawCircle(x, y, radius) { /* raster */ }
}

class DrawingAPI2 implements DrawingAPI {
    drawCircle(x, y, radius) { /* vector */ }
}

// Abstraction hierarchy
abstract class Shape {
    constructor(protected drawingAPI: DrawingAPI) {}
    abstract draw(): void
}

class Circle extends Shape {
    constructor(private x: number, private y: number, private radius: number, api: DrawingAPI) {
        super(api)
    }
    
    draw() {
        this.drawingAPI.drawCircle(this.x, this.y, this.radius)
    }
}

// Can combine any shape with any drawing API
const circle1 = new Circle(1, 2, 3, new DrawingAPI1())
const circle2 = new Circle(1, 2, 3, new DrawingAPI2())
```

---

## Flyweight

**Intent**: Use sharing to support large numbers of fine-grained objects efficiently.

**Use when**:
- Application uses large number of objects
- Storage costs are high due to quantity
- Most object state can be made extrinsic
- Many groups of objects can be replaced by few shared objects

### Example: Text Characters

```typescript
// Flyweight (shared, intrinsic state)
class CharacterFlyweight {
    constructor(private char: string) {}
    
    render(font: string, size: number) {  // Extrinsic state passed in
        console.log(`Rendering '${this.char}' in ${font} ${size}pt`)
    }
}

// Flyweight factory
class CharacterFactory {
    private characters = new Map<string, CharacterFlyweight>()
    
    getCharacter(char: string): CharacterFlyweight {
        if (!this.characters.has(char)) {
            this.characters.set(char, new CharacterFlyweight(char))
        }
        return this.characters.get(char)!
    }
}

// Usage: millions of characters, few flyweight objects
const factory = new CharacterFactory()
const text = "hello world"

text.split('').forEach((char, i) => {
    const flyweight = factory.getCharacter(char)
    flyweight.render("Arial", 12)  // Position, font, size are extrinsic
})

// Only 8 flyweight objects created (h,e,l,o, ,w,r,d)
// Not 11 (one per character)
```

### Intrinsic vs Extrinsic State

| Intrinsic (Shared) | Extrinsic (Unique) |
|--------------------|-------------------|
| Stored in flyweight | Passed by client |
| Same for all contexts | Varies by context |
| Character glyph | Position, font, size |
