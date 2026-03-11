# Behavioral Patterns

Read this when behavior varies by policy, commands, state, notifications, or coordination flow between collaborators.

Patterns for object interaction and responsibility distribution.

## Contents
- Strategy
- Observer
- Command
- Template Method
- Iterator
- State
- Chain of Responsibility
- Mediator

---

## Strategy

**Intent**: Define family of algorithms, encapsulate each, make them interchangeable.

**Use when**:
- Many related classes differ only in behavior
- Need different variants of an algorithm
- Algorithm uses data client shouldn't know about
- Class has many conditional behaviors

### Structure

```
┌─────────────────────┐     ┌─────────────────────┐
│      Context        │────▶│     Strategy        │
├─────────────────────┤     ├─────────────────────┤
│ - strategy          │     │ + execute()         │
│ + setStrategy()     │     └─────────────────────┘
│ + doSomething()     │               △
└─────────────────────┘        ┌──────┴──────┐
                          ┌────────┐    ┌────────┐
                          │Strategy│    │Strategy│
                          │   A    │    │   B    │
                          └────────┘    └────────┘
```

### Example

```typescript
// Strategy interface
interface PaymentStrategy {
    pay(amount: number): void
}

// Concrete strategies
class CreditCardPayment implements PaymentStrategy {
    constructor(private cardNumber: string) {}
    pay(amount: number) {
        console.log(`Paid $${amount} with credit card ${this.cardNumber}`)
    }
}

class PayPalPayment implements PaymentStrategy {
    constructor(private email: string) {}
    pay(amount: number) {
        console.log(`Paid $${amount} via PayPal (${this.email})`)
    }
}

// Context
class ShoppingCart {
    private strategy: PaymentStrategy
    
    setPaymentStrategy(strategy: PaymentStrategy) {
        this.strategy = strategy
    }
    
    checkout(amount: number) {
        this.strategy.pay(amount)
    }
}

// Usage
const cart = new ShoppingCart()
cart.setPaymentStrategy(new CreditCardPayment("1234-5678"))
cart.checkout(100)

cart.setPaymentStrategy(new PayPalPayment("user@email.com"))
cart.checkout(50)
```

---

## Observer

**Intent**: Define one-to-many dependency. When one object changes state, all dependents are notified.

**Use when**:
- Change to one object requires changing others
- Object should notify unknown number of other objects
- Loose coupling needed between subject and observers

### Structure

```
┌─────────────────────┐      ┌─────────────────────┐
│      Subject        │─────▶│     Observer        │
├─────────────────────┤      ├─────────────────────┤
│ + attach(Observer)  │      │ + update()          │
│ + detach(Observer)  │      └─────────────────────┘
│ + notify()          │                △
└─────────────────────┘         ┌──────┴──────┐
                           ┌──────────┐  ┌──────────┐
                           │ObserverA │  │ObserverB │
                           └──────────┘  └──────────┘
```

### Example

```typescript
interface Observer {
    update(temperature: number, humidity: number): void
}

class WeatherStation {
    private observers: Observer[] = []
    private temperature = 0
    private humidity = 0
    
    addObserver(o: Observer) { this.observers.push(o) }
    removeObserver(o: Observer) {
        this.observers = this.observers.filter(obs => obs !== o)
    }
    
    setMeasurements(temp: number, humidity: number) {
        this.temperature = temp
        this.humidity = humidity
        this.notifyObservers()
    }
    
    private notifyObservers() {
        this.observers.forEach(o => o.update(this.temperature, this.humidity))
    }
}

class CurrentConditionsDisplay implements Observer {
    update(temperature: number, humidity: number) {
        console.log(`Current: ${temperature}°F, ${humidity}% humidity`)
    }
}

class StatisticsDisplay implements Observer {
    private readings: number[] = []
    
    update(temperature: number, humidity: number) {
        this.readings.push(temperature)
        const avg = this.readings.reduce((a, b) => a + b) / this.readings.length
        console.log(`Avg temperature: ${avg}°F`)
    }
}

// Usage
const station = new WeatherStation()
station.addObserver(new CurrentConditionsDisplay())
station.addObserver(new StatisticsDisplay())

station.setMeasurements(80, 65)  // Both displays update
station.setMeasurements(82, 70)  // Both displays update
```

### Push vs Pull

**Push**: Subject sends detailed data to observers.
**Pull**: Subject notifies, observers pull what they need.

---

## Command

**Intent**: Encapsulate request as object. Parameterize clients, queue requests, log requests, support undo.

**Use when**:
- Need to parameterize objects with actions
- Need to queue, specify, or execute requests at different times
- Need undo/redo support
- Need logging of changes for recovery

### Structure

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Invoker   │────▶│    Command      │────▶│  Receiver   │
├─────────────┤     ├─────────────────┤     ├─────────────┤
│ + execute() │     │ + execute()     │     │ + action()  │
└─────────────┘     │ + undo()        │     └─────────────┘
                    └─────────────────┘
                            △
                     ┌──────┴──────┐
               ┌──────────┐  ┌──────────┐
               │CommandA  │  │CommandB  │
               └──────────┘  └──────────┘
```

### Example

```typescript
interface Command {
    execute(): void
    undo(): void
}

// Receiver
class Light {
    on() { console.log("Light is on") }
    off() { console.log("Light is off") }
}

// Concrete commands
class LightOnCommand implements Command {
    constructor(private light: Light) {}
    execute() { this.light.on() }
    undo() { this.light.off() }
}

class LightOffCommand implements Command {
    constructor(private light: Light) {}
    execute() { this.light.off() }
    undo() { this.light.on() }
}

// Invoker with undo
class RemoteControl {
    private history: Command[] = []
    
    executeCommand(command: Command) {
        command.execute()
        this.history.push(command)
    }
    
    undo() {
        const command = this.history.pop()
        command?.undo()
    }
}

// Usage
const light = new Light()
const remote = new RemoteControl()

remote.executeCommand(new LightOnCommand(light))  // Light on
remote.executeCommand(new LightOffCommand(light)) // Light off
remote.undo()  // Light on (undo off)
remote.undo()  // Light off (undo on)
```

---

## Template Method

**Intent**: Define skeleton of algorithm, defer some steps to subclasses.

**Use when**:
- Implement invariant parts of algorithm once, let subclasses vary specific steps
- Factor out common behavior in subclasses to avoid duplication
- Control which points subclasses can extend

### Example

```typescript
abstract class CaffeineBeverage {
    // Template method - defines the algorithm
    final prepareRecipe() {
        this.boilWater()
        this.brew()           // Abstract - subclass defines
        this.pourInCup()
        this.addCondiments()  // Abstract - subclass defines
    }
    
    boilWater() { console.log("Boiling water") }
    pourInCup() { console.log("Pouring into cup") }
    
    abstract brew(): void
    abstract addCondiments(): void
}

class Coffee extends CaffeineBeverage {
    brew() { console.log("Dripping coffee through filter") }
    addCondiments() { console.log("Adding sugar and milk") }
}

class Tea extends CaffeineBeverage {
    brew() { console.log("Steeping the tea") }
    addCondiments() { console.log("Adding lemon") }
}

// Usage
const coffee = new Coffee()
coffee.prepareRecipe()  // Follows template, coffee-specific steps
```

### Hooks

Optional steps that subclasses MAY override.

```typescript
abstract class Beverage {
    prepareRecipe() {
        this.boilWater()
        this.brew()
        this.pourInCup()
        if (this.customerWantsCondiments()) {  // Hook
            this.addCondiments()
        }
    }
    
    // Hook with default behavior
    customerWantsCondiments(): boolean {
        return true  // Subclass can override
    }
}
```

---

## Iterator

**Intent**: Access elements of aggregate sequentially without exposing representation.

**Use when**:
- Access aggregate object's contents without exposing internals
- Support multiple traversals of aggregates
- Provide uniform interface for different aggregate structures

### Example

```typescript
interface Iterator<T> {
    hasNext(): boolean
    next(): T
}

interface IterableCollection<T> {
    createIterator(): Iterator<T>
}

class MenuItem {
    constructor(public name: string, public price: number) {}
}

class Menu implements IterableCollection<MenuItem> {
    private items: MenuItem[] = []
    
    addItem(item: MenuItem) { this.items.push(item) }
    
    createIterator(): Iterator<MenuItem> {
        return new MenuIterator(this.items)
    }
}

class MenuIterator implements Iterator<MenuItem> {
    private position = 0
    
    constructor(private items: MenuItem[]) {}
    
    hasNext(): boolean {
        return this.position < this.items.length
    }
    
    next(): MenuItem {
        return this.items[this.position++]
    }
}

// Usage - client doesn't know internal structure
const menu = new Menu()
menu.addItem(new MenuItem("Pancakes", 2.99))
menu.addItem(new MenuItem("Waffles", 3.99))

const iterator = menu.createIterator()
while (iterator.hasNext()) {
    const item = iterator.next()
    console.log(`${item.name}: $${item.price}`)
}
```

---

## State

**Intent**: Allow object to alter behavior when internal state changes. Object will appear to change its class.

**Use when**:
- Object's behavior depends on its state
- Operations have large multipart conditionals on state
- State transitions are explicit

### Example

```typescript
interface State {
    insertQuarter(): void
    ejectQuarter(): void
    turnCrank(): void
    dispense(): void
}

class GumballMachine {
    noQuarterState: State = new NoQuarterState(this)
    hasQuarterState: State = new HasQuarterState(this)
    soldState: State = new SoldState(this)
    
    private state: State = this.noQuarterState
    private count: number
    
    constructor(count: number) {
        this.count = count
    }
    
    setState(state: State) { this.state = state }
    getCount() { return this.count }
    releaseGumball() { this.count-- }
    
    // Delegate to current state
    insertQuarter() { this.state.insertQuarter() }
    ejectQuarter() { this.state.ejectQuarter() }
    turnCrank() { this.state.turnCrank(); this.state.dispense() }
}

class NoQuarterState implements State {
    constructor(private machine: GumballMachine) {}
    
    insertQuarter() {
        console.log("Quarter inserted")
        this.machine.setState(this.machine.hasQuarterState)
    }
    ejectQuarter() { console.log("No quarter to eject") }
    turnCrank() { console.log("No quarter") }
    dispense() { console.log("Pay first") }
}

// HasQuarterState, SoldState similar...
```

### State vs Strategy

| State | Strategy |
|-------|----------|
| States transition automatically | Client selects strategy |
| Knows about other states | Strategies independent |
| Encapsulates state machine | Encapsulates algorithm |

---

## Chain of Responsibility

**Intent**: Avoid coupling sender to receiver. Give multiple objects chance to handle request.

**Use when**:
- More than one object may handle request
- Handler not known a priori
- Want to issue request without specifying receiver

### Example

```typescript
abstract class SupportHandler {
    protected next: SupportHandler | null = null
    
    setNext(handler: SupportHandler) {
        this.next = handler
        return handler
    }
    
    handle(request: string): string | null {
        if (this.next) {
            return this.next.handle(request)
        }
        return null
    }
}

class Level1Support extends SupportHandler {
    handle(request: string) {
        if (request === "password reset") {
            return "Level 1: Reset password"
        }
        return super.handle(request)
    }
}

class Level2Support extends SupportHandler {
    handle(request: string) {
        if (request === "software issue") {
            return "Level 2: Fixed software"
        }
        return super.handle(request)
    }
}

class Level3Support extends SupportHandler {
    handle(request: string) {
        return "Level 3: Escalated to engineering"
    }
}

// Usage
const level1 = new Level1Support()
const level2 = new Level2Support()
const level3 = new Level3Support()

level1.setNext(level2).setNext(level3)

console.log(level1.handle("password reset"))  // Level 1 handles
console.log(level1.handle("software issue"))  // Level 2 handles
console.log(level1.handle("server down"))     // Level 3 handles
```

---

## Mediator

**Intent**: Define object that encapsulates how a set of objects interact.

**Use when**:
- Objects communicate in complex ways
- Reusing object is difficult due to dependencies
- Behavior distributed between classes should be customizable

### Example

```typescript
interface ChatMediator {
    sendMessage(message: string, user: User): void
    addUser(user: User): void
}

class ChatRoom implements ChatMediator {
    private users: User[] = []
    
    addUser(user: User) {
        this.users.push(user)
    }
    
    sendMessage(message: string, sender: User) {
        this.users
            .filter(u => u !== sender)
            .forEach(u => u.receive(message, sender.name))
    }
}

class User {
    constructor(public name: string, private mediator: ChatMediator) {
        mediator.addUser(this)
    }
    
    send(message: string) {
        this.mediator.sendMessage(message, this)
    }
    
    receive(message: string, from: string) {
        console.log(`${this.name} received from ${from}: ${message}`)
    }
}

// Usage - users don't know about each other
const chatRoom = new ChatRoom()
const alice = new User("Alice", chatRoom)
const bob = new User("Bob", chatRoom)
const charlie = new User("Charlie", chatRoom)

alice.send("Hi everyone!")  // Bob and Charlie receive
bob.send("Hey Alice!")      // Alice and Charlie receive
```
