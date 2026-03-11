# Stream Processing

Read this when event flow, CDC, event sourcing, low-latency processing, or exactly-once / replay claims are the main design pressure.

## Contents
- Event Streams
- Message Brokers
- Change Data Capture
- Event Sourcing
- Stream Processing Patterns
- Fault Tolerance

---

## Event Streams

**Event**: Immutable fact that happened at a point in time.

**Stream**: Unbounded sequence of events.

**Key insight**: Batch is a special case of streaming (bounded stream).

### Event vs Message

| Aspect | Event | Message |
|--------|-------|---------|
| Semantics | Fact that happened | Request/command |
| Consumption | Multiple consumers | Typically single |
| Retention | Often kept | Often deleted after processing |
| Ordering | Often important | May not matter |

---

## Message Brokers

### Direct Messaging

Producer → Consumer directly.

**Problems**:
- Producer blocked if consumer slow
- Data loss if consumer offline
- No replay

### Message Queue (JMS/AMQP style)

**Characteristics**:
- Messages deleted after ACK
- No ordering guarantee (typically)
- Work queue pattern (each message processed once)

**Examples**: RabbitMQ, ActiveMQ, SQS.

**Use case**: Task distribution, load balancing.

### Log-Based Broker

**Characteristics**:
- Append-only log
- Messages retained (configurable)
- Offset-based consumption
- Consumer groups for parallelism

**Examples**: Kafka, Kinesis, Pulsar.

**Partitioning**:
- Topic split into partitions
- Each partition is ordered log
- Partition assigned to one consumer in group
- Parallelism limited by partition count

### Comparison

| Aspect | Message Queue | Log-Based |
|--------|---------------|-----------|
| Delivery | Once, then deleted | Multiple times, retained |
| Ordering | No (typically) | Yes (per partition) |
| Replay | No | Yes (reset offset) |
| Fan-out | Explicit routing | Consumer groups |
| Backpressure | Block producer | Consumer controls pace |

---

## Change Data Capture (CDC)

Capture database changes as event stream.

### Implementation Methods

**Trigger-based**: Database triggers write to event table.
- Simple but high overhead.

**Log-based**: Parse write-ahead log (WAL).
- Lower overhead, exactly matches DB state.
- Examples: Debezium, Maxwell, pg_logical.

**Query-based**: Poll for changes.
- Requires timestamp/version column.
- May miss rapid changes.

### CDC Architecture

```
Database → CDC Connector → Message Broker → Consumers
    │                                           │
    └─ Primary (writes) ─────────────────────→ Derived views
```

**Benefits**:
- Derived data always consistent with source
- Consumers decoupled from database
- Can rebuild derived data by replaying

### Initial Snapshot

**Problem**: How to get existing data when starting CDC?

**Solution**: 
1. Take consistent snapshot
2. Record log position at snapshot time
3. Stream changes from that position

---

## Event Sourcing

Store state changes as sequence of events, not current state.

### Traditional vs Event Sourced

**Traditional (state-based)**:
```sql
UPDATE accounts SET balance = 90 WHERE id = 1
-- Previous balance lost
```

**Event sourced**:
```
Event: AccountDebited { account_id: 1, amount: 10, timestamp: ... }
-- All history preserved
```

### Deriving State

```
Events → Fold/Aggregate → Current State
```

**Read path**:
1. Load events for entity
2. Apply each event to build state
3. (Or: Read from materialized snapshot)

### Advantages

| Benefit | Description |
|---------|-------------|
| Audit trail | Complete history of changes |
| Debugging | Replay to reproduce bugs |
| Temporal queries | State at any point in time |
| Schema evolution | Old events, new projections |

### Challenges

| Challenge | Mitigation |
|-----------|------------|
| Event schema evolution | Upcasters, versioned events |
| Long event streams | Snapshots |
| Eventual consistency | Careful UI design |
| Deleting data (GDPR) | Crypto-shredding, tombstones |

### Commands vs Events

**Commands**: Intent, may be rejected. "WithdrawMoney"

**Events**: Facts, already happened. "MoneyWithdrawn"

**Flow**: Command → Validate → Event → Store → Project

---

## Stream Processing Patterns

### Stream-Table Duality

**Stream**: Changelog of table over time.
**Table**: Point-in-time snapshot of stream.

```
Table ←─ materialize ─ Stream
       ─ changelog ──→
```

**Operations**:
- Stream + Stream → Stream (join windows)
- Stream + Table → Stream (enrichment)
- Table + Table → Table (join)

### Stateless Processing

Transform each event independently.

**Examples**: Filter, map, transform.

```python
# Filter
events.filter(lambda e: e.type == 'purchase')

# Map
events.map(lambda e: {..., total: e.price * e.quantity})
```

### Stateful Processing

Maintain state across events.

**Examples**: Aggregations, joins, sessionization.

**State storage**:
- In-memory (fast, lost on failure)
- Local disk (RocksDB)
- Remote (higher latency)

### Windows

Group events by time for aggregation.

| Window Type | Description |
|-------------|-------------|
| Tumbling | Fixed-size, non-overlapping |
| Hopping | Fixed-size, overlapping |
| Sliding | Events within duration of each event |
| Session | Gap-based (ends after inactivity) |

```
Tumbling (5 min):  [0-5) [5-10) [10-15) ...
Hopping (5 min, 1 min advance): [0-5) [1-6) [2-7) ...
Session (5 min gap): [events until 5 min silence]
```

### Event Time vs Processing Time

**Event time**: When event occurred (in event).

**Processing time**: When event processed (wall clock).

**Problem**: Events arrive out of order.

**Watermarks**: Declare "no more events before time T".

**Late events**: 
- Discard
- Update aggregation (retractions)
- Side output for separate handling

---

## Stream Joins

### Stream-Stream Join

Join events from two streams within time window.

```
clicks.join(impressions)
    .where(click.ad_id == impression.ad_id)
    .within(1 hour)
```

**State required**: Buffer events until window closes.

### Stream-Table Join (Enrichment)

Lookup reference data for each event.

```
orders.join(products)
    .where(order.product_id == product.id)
```

**Table materialized from**:
- Another stream (CDC)
- Periodic snapshot
- External database lookup (slow)

### Table-Table Join

Both sides are materialized streams.

**Output**: Stream of join result changes.

---

## Fault Tolerance

### At-Least-Once

Retry on failure. May produce duplicates.

**Implementation**: ACK after processing, retry if no ACK.

### At-Most-Once

Don't retry. May lose events.

**Implementation**: ACK immediately, no retry.

### Exactly-Once (Effectively)

No duplicates, no loss. Requires special handling.

**Approaches**:

**1. Idempotent writes**
- Natural idempotency (SET key=value)
- Deduplication table (event_id → processed)

**2. Transactional output**
- Write output + update offset atomically
- Kafka transactions, Flink exactly-once sinks

**3. Checkpointing**
- Periodically snapshot state
- On failure, restore from checkpoint
- Replay from checkpoint offset

### Microbatch vs Continuous

**Microbatch** (Spark Streaming):
- Small batches processed as batch jobs
- Natural checkpointing boundaries
- Higher latency (batch interval)

**Continuous** (Flink, Kafka Streams):
- Event-by-event processing
- Lower latency
- More complex checkpointing

---

## Architectures

### Kappa Architecture

Stream-only. Reprocess by replaying from log.

```
Raw Events → Stream Processing → Derived Views
     ↑                               │
     └───── Replay for fixes ────────┘
```

**Requirements**:
- Retain raw events long enough
- Reprocessing fast enough

### Event-Driven Microservices

Services communicate via events, not sync calls.

```
Service A ──event──→ Broker ──event──→ Service B
                         │
                         └──event──→ Service C
```

**Benefits**:
- Loose coupling
- Temporal decoupling
- Audit trail built-in

**Challenges**:
- Eventual consistency
- Debugging distributed flows
- Schema evolution

### CQRS

Command Query Responsibility Segregation.

```
Commands → Write Model → Events → Read Model → Queries
```

**Separate models for**:
- Writes (optimized for validation, consistency)
- Reads (optimized for query patterns)

**Often combined with**: Event sourcing.
