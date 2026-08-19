# Distributed systems

Read this reference when partial failures, clocks, coordination, consensus, or CAP-style availability and consistency tradeoffs dominate the problem.

## Topics
- Faults and partial failures
- Unreliable networks
- Unreliable clocks
- Knowledge and truth
- Consensus algorithms

---

## Faults and partial failures

A single machine usually presents one visible failure boundary: it responds or it does not.

A distributed system can fail partially. Some nodes continue while others are slow, unreachable, or operating on stale information.

**Fundamental problems**:
1. Cannot tell if remote node is dead or slow
2. Cannot tell if message was delivered
3. Cannot trust clocks for ordering

Assume that anything capable of failing will eventually fail. Design each operation to tolerate the relevant partial failures.

---

## Unreliable networks

### Possible failures

| Failure Mode | Description |
|--------------|-------------|
| Lost request | Request never reaches destination |
| Lost response | Response never reaches sender |
| Delayed request | Arrives much later than expected |
| Delayed response | Response delayed after processing |
| Node crash | Destination stops responding |
| Network partition | Nodes can't communicate |

From the sender's perspective, these failures initially look alike: no response arrives. The sender cannot infer whether the operation ran.

### Timeouts

Short timeouts create false failure detections. Long timeouts delay recovery.

There is no universally correct timeout; choose one from the measured latency distribution and the cost of false positives versus slow detection.

**Approach**:
- Measure RTT distribution
- Set timeout based on p99 or similar
- Use exponential backoff for retries

### Network congestion

**Causes of variable latency**:
- Switch queue overflow
- TCP congestion control
- OS scheduling delays
- Virtualization overhead (noisy neighbors)

**Queueing locations**:
1. Network switch queue
2. OS receive buffer
3. Virtualization layer (VM to hypervisor)
4. Application queue

---

## Unreliable clocks

### Time-of-day clocks

Synchronized with NTP. Can jump forward or backward.

**Problems**:
- NTP sync can step clock backward
- Leap seconds
- Virtualization delays NTP updates
- Precision limited (often ~100ms)

**Don't use for**: Ordering events, measuring durations.

### Monotonic clocks

Always move forward (on same machine). Good for measuring elapsed time.

**Safe for**: Timeouts, performance measurements.

**Not safe for**: Comparing across machines (different origins).

### Clock skew

Clocks on different machines drift. Even with NTP, skew of 100ms+ common.

**Consequences**:
- "Last write wins" can discard later write
- Timestamps can violate causality
- Distributed lock expiry can be wrong

### Logical clocks

Don't measure physical time. Track event ordering.

**Lamport timestamps**:
1. Each node maintains counter
2. Increment on each event
3. On message: set counter to max(local, received) + 1

**Properties**: Total order, respects causality.

**Limitation**: Can't tell if events are concurrent.

**Vector clocks**:
1. Each node maintains vector of counters
2. Detect concurrent events

```
[A:2, B:1] < [A:3, B:2]  -- causally ordered
[A:2, B:1] || [A:1, B:2]  -- concurrent (incomparable)
```

---

## Knowledge and truth

### Majority agreement defines truth

**Problem**: Node can't trust its own state (might be in minority partition).

**Solution**: Quorums. Truth is what majority agrees on.

### Fencing tokens

**Problem**: Process with expired lease still thinks it's leader.

```
1. Client A gets lock with token 33
2. Client A pauses (GC, etc.)
3. Lock expires, Client B gets lock with token 34
4. Client A resumes, thinks it has lock
5. Both clients write!
```

**Solution**: Include monotonic fencing token in all operations.

```
1. Storage rejects writes with token ≤ last seen token
2. Client A's write with token 33 rejected
3. Only Client B's writes (token 34) succeed
```

### Byzantine faults

Nodes may behave arbitrarily (bugs, malicious actors).

**Byzantine fault tolerance**: Tolerate up to 1/3 faulty nodes.

**Most systems assume non-Byzantine**: Trust that nodes follow protocol (just may crash or be slow).

---

## Consensus algorithms

### The consensus problem

**Goal**: Get all nodes to agree on a value.

**Properties required**:
1. **Agreement**: All nodes decide same value
2. **Integrity**: Decide at most once
3. **Validity**: Decided value was proposed by some node
4. **Termination**: All non-faulty nodes eventually decide

**FLP impossibility**: In async network, consensus impossible if even one node can crash.

**Practical**: Use timeouts (accept some non-termination risk).

### Paxos

**Single-decree Paxos**: Agree on one value.

**Roles**:
- Proposers: Propose values
- Acceptors: Vote on proposals
- Learners: Learn decided value

**Protocol** (simplified):
1. **Prepare**: Proposer sends prepare(n) to acceptors
2. **Promise**: Acceptor promises not to accept lower-numbered proposals
3. **Accept**: Proposer sends accept(n, value) if majority promised
4. **Accepted**: Acceptor accepts if not promised higher number

**Multi-Paxos**: Leader-based optimization for sequence of values.

**Properties**:
- Tolerates f failures with 2f+1 nodes
- Leader election built-in
- Complex to implement correctly

### Raft

Designed for understandability. Equivalent to Multi-Paxos.

**Key concepts**:
- **Leader**: Handles all client requests
- **Term**: Logical clock, increases on elections
- **Log**: Replicated sequence of commands

**Leader election**:
1. Follower times out, becomes candidate
2. Requests votes from peers
3. Wins with majority
4. Becomes leader for current term

**Log replication**:
1. Leader appends to log
2. Sends AppendEntries to followers
3. Commits when majority acknowledge
4. Notifies followers of commit

**Safety**: Leader always has most up-to-date log.

### Raft vs Paxos

| Aspect | Paxos | Raft |
|--------|-------|------|
| Understandability | Complex | Simpler |
| Efficiency | Similar | Similar |
| Implementation | Many variations | Clearer spec |
| Adoption | Historical | Modern systems |

### Uses for consensus

| Use Case | Why Consensus Needed |
|----------|---------------------|
| Leader election | Avoid split-brain |
| Atomic commit | All-or-nothing across nodes |
| Total order broadcast | Same order on all nodes |
| Distributed locks | Mutual exclusion |
| Uniqueness | Single assignment |

---

## CAP theorem

**Original formulation**: Pick 2 of Consistency, Availability, Partition tolerance.

**Practical interpretation**:
- Partitions WILL happen (can't choose)
- During partition: choose C or A
- When no partition: can have both

**CP system**: Refuses requests when partitioned (banking).

**AP system**: Accepts requests, reconciles later (shopping cart).

**CAP limitations**:
- Doesn't account for latency
- Doesn't define "available" precisely
- Network partition isn't all-or-nothing

### PACELC

Extension of CAP:
- **P**artition: **A**vailability vs **C**onsistency
- **E**lse (no partition): **L**atency vs **C**onsistency

**PA/EL**: Prioritize availability and latency (Dynamo).
**PC/EC**: Prioritize consistency always (traditional RDBMS).
**PA/EC**: Available during partition, consistent otherwise.

---

## Practical patterns

### Lease-based locks

1. Acquire lock with TTL
2. Renew before expiry
3. If can't renew, assume lost

**Danger**: Process pauses (GC) past TTL, still thinks it holds lock.

**Solution**: Fencing tokens.

### Idempotency

Network uncertainty causes retries, and a retry may execute an operation twice. Make the effect idempotent at the boundary that owns it.

**Techniques**:
- Unique request ID, dedupe on server
- Conditional writes (only if state matches)
- Store operation result, return on retry

### Exactly-once semantics

**Reality**: At-most-once or at-least-once.

**Approximating exactly-once**:
- Idempotent operations + at-least-once delivery
- Transaction + deduplication table
- Two-phase commit (with its costs)

---

## Common misconceptions

**"Network is reliable"**: It's not. Design for failure.

**"Latency is zero"**: It's not. Consider p99, not just average.

**"Bandwidth is infinite"**: It's not. Batch where possible.

**"Network is secure"**: It's not. Defense in depth.

**"Topology doesn't change"**: It does. Handle dynamic membership.

**"There is one administrator"**: There isn't. Multi-tenant concerns.

**"Transport cost is zero"**: It's not. Serialize efficiently.

**"Network is homogeneous"**: It's not. Different performance characteristics.
