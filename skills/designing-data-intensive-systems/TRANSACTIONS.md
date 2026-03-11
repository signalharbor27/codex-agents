# Transactions

Read this when you need to reason about isolation anomalies, ACID semantics, deadlocks, serializability, or why distributed transactions are risky.

## Contents
- ACID Semantics
- Isolation Levels
- Isolation Anomalies
- Implementation Mechanisms
- Distributed Transactions

---

## ACID Semantics

### Atomicity
**Definition**: Transaction either fully completes or fully aborts (all-or-nothing).

**NOT** about concurrency (that's isolation).

**Implementation**: Write-ahead log (WAL) enables rollback.

### Consistency
**Definition**: Database invariants are maintained (application-defined).

**Actually application's responsibility**: Database just provides atomicity and isolation.

### Isolation
**Definition**: Concurrent transactions don't interfere with each other.

**Ideal**: Serializability (result same as if run sequentially).

**Reality**: Weaker levels for performance.

### Durability
**Definition**: Committed data survives crashes.

**Implementation**: WAL flushed to disk, replication.

**NOT absolute**: Disk can fail, datacenter can be destroyed. Durability is about reducing risk.

---

## Isolation Levels

| Level | Prevents | Allows |
|-------|----------|--------|
| Read Uncommitted | Nothing | Dirty reads, everything |
| Read Committed | Dirty reads | Non-repeatable reads, phantoms |
| Repeatable Read / Snapshot | Dirty reads, non-repeatable reads | Phantoms, write skew |
| Serializable | All anomalies | Nothing |

**PostgreSQL note**: "Repeatable Read" is actually Snapshot Isolation.

**MySQL note**: "Repeatable Read" prevents some phantoms via gap locking.

---

## Isolation Anomalies

### Dirty Read
Reading uncommitted data from another transaction.

```
T1: UPDATE balance = 100 WHERE id = 1
T2: SELECT balance FROM accounts WHERE id = 1  -- sees 100
T1: ROLLBACK  -- balance is actually 50
```

**Prevented by**: Read Committed and above.

### Dirty Write
Overwriting uncommitted data from another transaction.

```
T1: UPDATE listings SET buyer = 'Alice' WHERE id = 1
T2: UPDATE listings SET buyer = 'Bob' WHERE id = 1  -- before T1 commits
```

**Prevented by**: All levels (row-level locks on write).

### Non-repeatable Read (Read Skew)
Same query returns different results within transaction.

```
T1: SELECT balance WHERE id = 1  -- returns 500
T2: UPDATE balance = 400 WHERE id = 1; COMMIT
T1: SELECT balance WHERE id = 1  -- returns 400 (different!)
```

**Problem for**: Multi-object reads that need consistency (e.g., backup, analytics).

**Prevented by**: Snapshot Isolation and above.

### Phantom Read
New rows appear matching a query condition.

```
T1: SELECT * FROM employees WHERE dept = 'eng'  -- returns 10 rows
T2: INSERT INTO employees (dept) VALUES ('eng'); COMMIT
T1: SELECT * FROM employees WHERE dept = 'eng'  -- returns 11 rows
```

**Prevented by**: Serializable. (Snapshot prevents for reads, not for write conflicts.)

### Lost Update
Two transactions read-modify-write, second overwrites first.

```
T1: x = read(counter)  -- x = 10
T2: y = read(counter)  -- y = 10
T1: write(counter, x + 1)  -- counter = 11
T2: write(counter, y + 1)  -- counter = 11 (lost T1's increment!)
```

**Solutions**:
- Atomic operations (`UPDATE counter = counter + 1`)
- Explicit locking (`SELECT ... FOR UPDATE`)
- Automatic detection (abort and retry)
- Compare-and-swap

**Snapshot Isolation**: PostgreSQL detects, MySQL does not.

### Write Skew
Two transactions read same data, make different writes that violate constraint.

```
-- Constraint: at least one doctor on call
-- Both doctors currently on call

T1: SELECT count(*) FROM doctors WHERE on_call = true  -- returns 2
T2: SELECT count(*) FROM doctors WHERE on_call = true  -- returns 2
T1: UPDATE doctors SET on_call = false WHERE name = 'Alice'; COMMIT
T2: UPDATE doctors SET on_call = false WHERE name = 'Bob'; COMMIT
-- Now zero doctors on call! Constraint violated.
```

**NOT prevented by**: Snapshot Isolation (different rows modified).

**Prevented by**: Serializable, or explicit locking (`SELECT ... FOR UPDATE`).

**Other write skew examples**:
- Meeting room double-booking
- Username uniqueness (across shards)
- Multiplayer game moves

---

## Implementation Mechanisms

### Two-Phase Locking (2PL)

**Rule**: 
- Growing phase: acquire locks, don't release
- Shrinking phase: release locks, don't acquire

**Shared locks**: Multiple readers allowed.
**Exclusive locks**: Single writer, no readers.

**Predicate locks**: Lock on condition (prevents phantoms).
```sql
SELECT * FROM bookings WHERE room = 123 AND time = '10:00'
-- Predicate lock prevents INSERTs matching this condition
```

**Index-range locks**: Approximate predicate locks using index ranges. More coarse, less overhead.

**Problems with 2PL**:
- Deadlocks (detect and abort one transaction)
- Lock contention under high load
- Long transactions block others

### Snapshot Isolation (MVCC)

**Principle**: Each transaction sees consistent snapshot from start.

**Implementation** (multi-version concurrency control):
1. Each write creates new version with transaction ID
2. Reads see latest version visible to transaction's snapshot
3. Writes check for conflicts at commit

**Visibility rules**:
- See versions from committed transactions that started before us
- Don't see versions from transactions that started after us
- Don't see versions from uncommitted transactions

**No read locks needed**: Reads never block, writes never block reads.

### Serializable Snapshot Isolation (SSI)

**Goal**: Serializable performance close to Snapshot Isolation.

**Approach**: Optimistic concurrency control.
1. Run transactions with snapshot isolation
2. Track read and write sets
3. At commit, check for conflicts
4. Abort if serializability violated

**Detects**:
- Stale reads (read data modified by concurrent committed transaction)
- Writes affecting concurrent transaction's reads

**Trade-off**: Higher abort rate under contention, but no locking overhead.

**Used by**: PostgreSQL (Serializable level).

---

## Distributed Transactions

### Two-Phase Commit (2PC)

**Coordinator-based protocol**:

**Phase 1 - Prepare**:
1. Coordinator sends prepare to all participants
2. Each participant votes yes (can commit) or no
3. Participant that votes yes is "in doubt"

**Phase 2 - Commit/Abort**:
1. If all yes: coordinator sends commit
2. If any no: coordinator sends abort
3. Participants execute decision

**Problems**:
- Coordinator failure while participants in doubt = blocking
- Participants hold locks during in-doubt period
- Latency (multiple round trips)

### Coordinator Failure

**If coordinator dies during 2PC**:
- Participants that voted yes must wait
- Cannot abort (coordinator might have sent commit to others)
- Cannot commit (coordinator might have sent abort to others)
- Hold locks indefinitely until coordinator recovers

**Mitigation**: Replicate coordinator (Paxos/Raft), but adds complexity.

### XA Transactions

**Standard API for distributed transactions** (Java JTA, etc.).

**Limitations**:
- Coordinator is single point of failure
- Locks held across network roundtrips
- Performance impact

### Heterogeneous vs Homogeneous

**Homogeneous**: All participants are same database type.
- Internal protocols
- Better optimized

**Heterogeneous**: Different systems (database + message queue + etc.).
- Requires XA or similar
- Harder to implement correctly
- "Exactly once" often impossible

---

## Practical Recommendations

### When to Use What

| Scenario | Recommendation |
|----------|----------------|
| Simple CRUD | Read Committed (default) |
| Analytics queries | Snapshot Isolation |
| Financial transactions | Serializable or explicit locking |
| Distributed systems | Avoid 2PC; use sagas |

### Saga Pattern (Alternative to Distributed Transactions)

Break transaction into local transactions + compensating actions.

```
1. Create order (local tx)
2. Reserve inventory (local tx)
3. Charge payment (local tx)

If step 3 fails:
  - Release inventory (compensate step 2)
  - Cancel order (compensate step 1)
```

**Trade-off**: Eventual consistency, but no distributed locking.

### Optimistic vs Pessimistic

| Approach | When to Use |
|----------|-------------|
| Pessimistic (locks) | High contention, conflicts likely |
| Optimistic (detect conflicts) | Low contention, conflicts rare |

High contention + optimistic = excessive aborts/retries.
Low contention + pessimistic = unnecessary lock overhead.
