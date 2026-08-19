# Replication

Read this reference when failover, replica lag, read scaling, write topology, conflict resolution, or consistency guarantees between copies are central to the design.

## Topics
- Reasons to replicate
- Leader-follower replication
- Multi-leader replication
- Leaderless replication
- Consistency models
- Conflict resolution

---

## Reasons to replicate

Replication can keep a service available after node failure, serve reads from a geographically closer copy, and spread read load across replicas.

The design problem is not creating copies; it is defining what clients may observe while those copies lag, fail, or disagree.

---

## Leader-follower replication

Also called: master-slave, primary-secondary, active-passive.

### How it works
1. Designate one node as leader and route writes to it.
2. The leader sends an ordered replication stream to followers.
3. Followers apply that stream.
4. Clients read from any replica.

### Synchronous and asynchronous replication

| Type | Behavior | Trade-off |
|------|----------|-----------|
| Synchronous | Wait for follower ACK before confirming | Durability but higher latency |
| Asynchronous | Confirm immediately, replicate later | Lower latency but data loss risk |
| Semi-synchronous | Wait for 1+ follower, rest async | Compromise |

Waiting for every follower makes one slow or unavailable node block writes, so fully synchronous replication is usually impractical.

### Handle node failures

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

### Replication log methods

| Method | Description | Used By |
|--------|-------------|---------|
| Statement-based | Replicate SQL statements | Early MySQL |
| WAL shipping | Send write-ahead log | PostgreSQL |
| Logical (row-based) | Send row changes | MySQL binlog, PostgreSQL logical |
| Trigger-based | Application-level triggers | Custom solutions |

**Logical replication** is most flexible: decouples storage format from replication format.

### Problems caused by replication lag

**Reading your own writes**: User writes, then reads from stale follower.
- Solution: Read own writes from leader, or track write timestamp.

**Monotonic reads**: User sees newer state, then older state on refresh.
- Solution: Route user to same replica, or use version vectors.

**Consistent prefix reads**: Causally related writes appear out of order.
- Solution: Write causally related data to same partition.

---

## Multi-leader replication

Also called: master-master, active-active.

### Uses
- Multi-datacenter operation
- Offline clients (each device is a "datacenter")
- Collaborative editing (each user is a leader)

### Multi-datacenter topology

Each datacenter has its own leader. Leaders replicate to each other.

**Benefits**:
- Writes accepted locally (lower latency)
- Datacenter failure doesn't prevent writes
- Network issues between DCs don't block writes

**Costs**:
- Conflict resolution required
- Auto-increment keys, triggers, integrity constraints are problematic
- Much more complex

### Conflict resolution

**When do conflicts occur?** When two leaders concurrently modify same record.

**Detection**: Conflicts detected on replication, not at write time.

**Resolution strategies**:

| Strategy | Description | Limitation |
|----------|-------------|------------|
| Last write wins (LWW) | Highest timestamp wins | Data loss, clock skew |
| Merge values | Combine changes | Domain-specific |
| Keep all versions | Let application decide | Application complexity |
| CRDT | Conflict-free data types | Limited to certain structures |

Last-write-wins converges by discarding writes and can therefore lose data silently.

### Replication topologies

```
Circular:       Star:           All-to-all:
A → B → C → A   A ← C → B       A ↔ B ↔ C
                    ↓               ↕
                    D           A ↔ C
```

**All-to-all** is most fault-tolerant but has ordering issues.

---

## Leaderless replication

Also called: Dynamo-style (after Amazon's Dynamo paper).

### How it works
1. Client writes to multiple replicas (or coordinator does)
2. Read from multiple replicas
3. Use quorum to determine success

### Quorum conditions

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

### Read repair and anti-entropy

**Read repair**: When client reads, detect stale values, write current value back.

**Anti-entropy**: Background process compares replicas and syncs differences.

### Sloppy quorums

When quorum nodes unavailable, write to different nodes (hinted handoff).

**Trade-off**: Higher availability but weaker consistency guarantee.

### Detect concurrent writes

**Version vectors**: Track version per replica. Detect concurrent writes vs overwrites.

```
[A:1, B:0] and [A:0, B:1] = concurrent (conflict)
[A:2, B:1] and [A:1, B:1] = A:2 overwrites (no conflict)
```

---

## Consistency models

### Linearizability (strong consistency)

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

### Causal consistency

**Definition**: Operations that are causally related are seen in same order by all.

**Weaker than linearizability**: Concurrent operations can appear in different orders.

**Stronger than eventual**: Respects cause-effect relationships.

**Implementation**: Logical clocks, version vectors.

### Eventual consistency

**Definition**: If no new writes, replicas eventually converge.

Eventual consistency provides maximum availability.

**No guarantee on**:
- How long "eventually" takes
- Order of intermediate states
- What happens during convergence

---

## Consistency and consensus

| Concept | Definition |
|---------|------------|
| Consistency | What guarantees reads provide about write ordering |
| Consensus | How nodes agree on a value (used TO implement consistency) |

Linearizability requires consensus to implement correctly.
