# Glossary

Quick reference for data systems terminology.

---

## A

**ACID**: Atomicity, Consistency, Isolation, Durability. Transaction guarantees.

**Anti-entropy**: Background process to detect and repair replica divergence.

**Async replication**: Leader confirms write without waiting for followers.

**Atomic commit**: All nodes commit or all abort. No partial commits.

**Atomicity**: Transaction fully completes or fully aborts.

## B

**B-tree**: Balanced tree structure for indexes. Read-optimized.

**Backpressure**: Slow consumer signals producer to slow down.

**Bloom filter**: Probabilistic data structure. False positives possible, false negatives impossible.

**Byzantine fault**: Node behaves arbitrarily (malicious or buggy).

## C

**CAP theorem**: During partition, choose consistency or availability.

**Causal consistency**: Cause-effect relationships preserved.

**CDC (Change Data Capture)**: Capture database changes as event stream.

**Checkpoint**: Snapshot of processing state for recovery.

**Compaction**: Merge and clean up old data (LSM trees, logs).

**Consensus**: Agreement among distributed nodes on a value.

**Coordinator**: Node that orchestrates distributed transaction.

**CRDT**: Conflict-free Replicated Data Type. Automatic merge without coordination.

## D

**Denormalization**: Duplicate data to avoid joins.

**Derived data**: Data computed from other data (indexes, caches, aggregates).

**Dirty read**: Reading uncommitted data.

**Durability**: Committed data survives crashes.

## E

**Eventual consistency**: Replicas converge if no new writes.

**Event sourcing**: Store events, derive state.

**Exactly-once**: Each event processed exactly once. Approximated via idempotency.

## F

**Failover**: Promote follower to leader when leader fails.

**Fan-out**: One write triggers many reads (or vice versa).

**Fencing token**: Monotonic token to prevent stale clients.

**Follower**: Replica that receives writes from leader.

## G

**Gossip protocol**: Nodes exchange information peer-to-peer.

## H

**Hash partitioning**: Partition by hash of key. Uniform distribution.

**Hinted handoff**: Write to available node when target unavailable.

**Hot spot**: Partition with disproportionate load.

## I

**Idempotent**: Operation can be applied multiple times, same result.

**In-doubt**: Transaction participant awaiting coordinator decision.

**Isolation**: Concurrent transactions don't interfere.

## J

**Join**: Combine data from multiple sources by key.

## K

**Key-range partitioning**: Partition by contiguous key ranges.

## L

**Lamport timestamp**: Logical clock for total ordering.

**Leader**: Node that handles writes (in leader-follower replication).

**Leaderless**: Replication without designated leader (Dynamo-style).

**Linearizability**: Operations appear instantaneous, real-time ordering.

**Log-structured**: Append-only writes, periodic compaction.

**LSM tree**: Log-Structured Merge tree. Write-optimized storage.

## M

**MapReduce**: Batch processing: map → shuffle → reduce.

**Materialized view**: Precomputed query result.

**Memtable**: In-memory buffer before flush to SSTable.

**Monotonic reads**: Never see older state after seeing newer.

**Multi-leader**: Multiple nodes accept writes (active-active).

**MVCC**: Multi-Version Concurrency Control. Snapshot isolation implementation.

## N

**Network partition**: Nodes cannot communicate.

**Node**: Single machine in distributed system.

## O

**Offset**: Position in log-based message broker.

**Optimistic concurrency**: Detect conflicts at commit, abort if conflict.

## P

**PACELC**: Extension of CAP: Partition→A/C, Else→L/C.

**Partition (data)**: Shard. Subset of data on one node.

**Partition (network)**: Communication failure between nodes.

**Paxos**: Consensus algorithm.

**Pessimistic concurrency**: Lock to prevent conflicts.

**Phantom**: New row matching query appears between reads.

**Predicate lock**: Lock on condition, not specific rows.

**Primary key**: Unique identifier for record.

## Q

**Quorum**: Minimum nodes required for operation (typically majority).

## R

**Raft**: Consensus algorithm (simpler than Paxos).

**Read committed**: See only committed data.

**Read repair**: Fix stale replica on read.

**Read skew**: Inconsistent read across objects.

**Rebalancing**: Moving data between partitions.

**Replica**: Copy of data on another node.

**Replication lag**: Delay between leader write and follower apply.

## S

**Saga**: Long-running transaction as sequence of local transactions.

**Scatter-gather**: Query all partitions, combine results.

**Schema-on-read**: Interpret schema at read time (documents).

**Schema-on-write**: Enforce schema at write time (relational).

**Secondary index**: Index on non-primary key column.

**Serializability**: Transactions appear to execute sequentially.

**Shard**: Partition.

**Skew**: Uneven distribution (data or load).

**Snapshot isolation**: Each transaction sees consistent snapshot.

**Split-brain**: Multiple nodes believe they're leader.

**SSI**: Serializable Snapshot Isolation. Optimistic serializable.

**SSTable**: Sorted String Table. Immutable sorted file.

**Stream**: Unbounded sequence of events.

**Sync replication**: Wait for follower ACK before confirming.

## T

**Term**: Logical clock period in Raft.

**Timestamp ordering**: Order operations by timestamp.

**Tombstone**: Marker for deleted data.

**Total order**: All events have defined order.

**Transaction**: Group of operations with ACID guarantees.

**Two-phase commit (2PC)**: Prepare → commit/abort protocol.

**Two-phase locking (2PL)**: Acquire all locks before releasing any.

## V

**Vector clock**: Logical clock detecting concurrent events.

**Version vector**: Per-replica version tracking.

## W

**WAL**: Write-Ahead Log. Durability via logging before applying.

**Watermark**: Declaration that no events before time T will arrive.

**Window**: Time-bounded grouping for stream aggregation.

**Write amplification**: Ratio of data written to disk vs data received.

**Write skew**: Concurrent transactions violate constraint on different rows.

## X

**XA**: Standard for distributed transactions.

## Z

**Zookeeper**: Coordination service for distributed systems.
