# Replication

Read this when failover, replica lag, read scaling, write topology, conflict resolution, or consistency guarantees between copies are the core issue.

## Contents
- Why Replicate
- Leader-Follower Replication
- Multi-Leader Replication
- Leaderless Replication
- Consistency Models
- Conflict Resolution

---

## Why Replicate

1. **High availability**: Continue operating when nodes fail
2. **Latency**: Serve from geographically close replica
3. **Read scalability**: Distribute read load across replicas

**Core challenge**: Keeping replicas in sync when data changes.

---

## Leader-Follower Replication

Also called: master-slave, primary-secondary, active-passive.

### How It Works
1. One node designated as leader (handles writes)
2. Leader sends replication stream to followers
3. Followers apply changes in order
4. Clients read from any replica

### Synchronous vs Asynchronous

| Type | Behavior | Trade-off |
|------|----------|-----------|
| Synchronous | Wait for follower ACK before confirming | Durability but higher latency |
| Asynchronous | Confirm immediately, replicate later | Lower latency but data loss risk |
| Semi-synchronous | Wait for 1+ follower, rest async | Compromise |

**Fully synchronous is impractical**: One slow node blocks all writes.

### Handling Node Failures

**Follower failure**: Catch up from log position when it recovers.

**Leader failure (failover)**:
1. Detect leader is unavailable (timeout)
2. Choose new leader (election or appointed)
3. Reconfigure clients to use new leader

**Failover pitfalls**:
- Async replication: new leader may be behind, lost writes
- Split-brain: two nodes think they're leader
- Stale reads during transition
- What timeout? Too short = unnecessary failovers, too long = long downtime

### Replication Log Methods

| Method | Description | Used By |
|--------|-------------|---------|
| Statement-based | Replicate SQL statements | Early MySQL |
| WAL shipping | Send write-ahead log | PostgreSQL |
| Logical (row-based) | Send row changes | MySQL binlog, PostgreSQL logical |
| Trigger-based | Application-level triggers | Custom solutions |

**Logical replication** is most flexible: decouples storage format from replication format.

### Replication Lag Problems

**Reading your own writes**: User writes, then reads from stale follower.
- Solution: Read own writes from leader, or track write timestamp.

**Monotonic reads**: User sees newer state, then older state on refresh.
- Solution: Route user to same replica, or use version vectors.

**Consistent prefix reads**: Causally related writes appear out of order.
- Solution: Write causally related data to same partition.

---

## Multi-Leader Replication

Also called: master-master, active-active.

### Use Cases
- Multi-datacenter operation
- Offline clients (each device is a "datacenter")
- Collaborative editing (each user is a leader)

### Multi-Datacenter Topology

Each datacenter has its own leader. Leaders replicate to each other.

**Benefits**:
- Writes accepted locally (lower latency)
- Datacenter failure doesn't prevent writes
- Network issues between DCs don't block writes

**Costs**:
- Conflict resolution required
- Auto-increment keys, triggers, integrity constraints are problematic
- Much more complex

### Conflict Resolution

**When do conflicts occur?** When two leaders concurrently modify same record.

**Detection**: Conflicts detected on replication, not at write time.

**Resolution strategies**:

| Strategy | Description | Limitation |
|----------|-------------|------------|
| Last write wins (LWW) | Highest timestamp wins | Data loss, clock skew |
| Merge values | Combine changes | Domain-specific |
| Keep all versions | Let application decide | Application complexity |
| CRDT | Conflict-free data types | Limited to certain structures |

**LWW warning**: Achieves convergence by discarding writes. May lose data silently.

### Replication Topologies

```
Circular:       Star:           All-to-all:
A → B → C → A   A ← C → B       A ↔ B ↔ C
                    ↓               ↕
                    D           A ↔ C
```

**All-to-all** is most fault-tolerant but has ordering issues.

---

## Leaderless Replication

Also called: Dynamo-style (after Amazon's Dynamo paper).

### How It Works
1. Client writes to multiple replicas (or coordinator does)
2. Read from multiple replicas
3. Use quorum to determine success

### Quorum Conditions

For `n` replicas:
- `w` = write quorum (nodes that must ACK write)
- `r` = read quorum (nodes to read from)

**Consistency condition**: `w + r > n`

**Common configurations**:
| Config | Trade-off |
|--------|-----------|
| n=3, w=2, r=2 | Balanced |
| n=3, w=3, r=1 | Fast reads, slow writes |
| n=3, w=1, r=3 | Fast writes, slow reads |

### Read Repair and Anti-Entropy

**Read repair**: When client reads, detect stale values, write current value back.

**Anti-entropy**: Background process compares replicas and syncs differences.

### Sloppy Quorums

When quorum nodes unavailable, write to different nodes (hinted handoff).

**Trade-off**: Higher availability but weaker consistency guarantee.

### Detecting Concurrent Writes

**Version vectors**: Track version per replica. Detect concurrent writes vs overwrites.

```
[A:1, B:0] and [A:0, B:1] = concurrent (conflict)
[A:2, B:1] and [A:1, B:1] = A:2 overwrites (no conflict)
```

---

## Consistency Models

### Linearizability (Strong Consistency)

**Definition**: Operations appear instantaneous; once write completes, all reads see it.

**Provides**:
- Real-time ordering
- Single-copy illusion

**Use cases**:
- Leader election
- Distributed locks
- Uniqueness constraints

**Cost**: Latency and availability (CAP).

**NOT linearizable**:
- Multi-leader replication
- Leaderless with sloppy quorums
- Async leader-follower

**Potentially linearizable**:
- Single-leader (if reads from leader)
- Consensus algorithms (Paxos, Raft)

### Causal Consistency

**Definition**: Operations that are causally related are seen in same order by all.

**Weaker than linearizability**: Concurrent operations can appear in different orders.

**Stronger than eventual**: Respects cause-effect relationships.

**Implementation**: Logical clocks, version vectors.

### Eventual Consistency

**Definition**: If no new writes, replicas eventually converge.

**Provides**: Maximum availability.

**No guarantee on**:
- How long "eventually" takes
- Order of intermediate states
- What happens during convergence

---

## Consistency vs Consensus

| Concept | Definition |
|---------|------------|
| Consistency | What guarantees reads provide about write ordering |
| Consensus | How nodes agree on a value (used TO implement consistency) |

Linearizability requires consensus to implement correctly.
