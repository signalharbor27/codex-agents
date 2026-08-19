# Partitioning (sharding)

Read this reference when shard-key choice, hot-spot risk, secondary indexes, routing, or rebalancing tradeoffs dominate the design.

## Topics
- Reasons to partition
- Partitioning strategies
- Secondary indexes
- Rebalancing
- Request routing

---

## Reasons to partition

Partitioning spreads data and load across machines when one node cannot meet the storage or throughput requirement.

**Benefits**:
- Scalability beyond single node
- Parallel query execution
- Isolation of hot data

**Challenges**:
- Cross-partition queries expensive
- Rebalancing complexity
- Hot spots

Partitioning and replication solve different problems. Partitioning divides the dataset; replication usually keeps multiple copies of each partition.

---

## Partitioning strategies

### Key-range partitioning

Key-range partitioning assigns a contiguous key range to each partition.

```
Partition 1: A-F
Partition 2: G-M
Partition 3: N-Z
```

**Advantages**:
- Efficient range queries (scan one partition)
- Natural ordering

**Disadvantages**:
- Risk of hot spots (sequential keys, timestamps)
- Boundaries may need adjustment

**Used by**: HBase, BigTable, early MongoDB.

To reduce hot spots, prefix keys with a random element at the cost of range queries, or split ranges using application knowledge.

### Hash partitioning

Hash partitioning hashes each key and assigns the result to a partition's hash range.

```
partition = hash(key) % num_partitions
```

**Advantages**:
- Uniform distribution (if good hash function)
- No hot spots from sequential keys

**Disadvantages**:
- Range queries scatter across partitions
- Keys with natural ordering are scrambled

**Used by**: Cassandra, DynamoDB, Riak.

### Compound keys (Cassandra-style)

First column determines partition, remaining columns for sorting within partition.

```
PRIMARY KEY ((user_id), timestamp)
```

- Partition by user_id (hash)
- Within partition, sorted by timestamp
- Range queries within user efficient

This combines hash distribution across entities with range queries inside one entity.

---

## Secondary indexes

The primary key determines the partition, but queries on other columns need a secondary-index strategy.

### Local index (document-partitioned)

Each partition maintains index only for its data.

```
Partition 1: index for A-M
Partition 2: index for N-Z
```

**Query**: Must query ALL partitions (scatter-gather).

**Write**: Only update local partition's index.

| Aspect | Value |
|--------|-------|
| Write cost | Low |
| Read cost | High (scatter-gather) |
| Tail latency | High (slowest partition) |

**Used by**: MongoDB, Cassandra, Elasticsearch.

### Global index (term-partitioned)

Index itself is partitioned by index term.

```
Index Partition 1: terms A-M (across all data)
Index Partition 2: terms N-Z (across all data)
```

**Query**: Read from one index partition.

**Write**: May need to update multiple index partitions.

| Aspect | Value |
|--------|-------|
| Write cost | High (multiple partitions) |
| Read cost | Low (single partition) |
| Consistency | Often async (eventual) |

**Used by**: DynamoDB, Riak.

### Choose an index strategy

```
Write-heavy, read-heavy by primary key?
  → Local index (or skip secondary)

Read-heavy on secondary attributes?
  → Global index (accept write cost)

Need strong consistency on secondary?
  → Local index with scatter-gather
```

---

## Rebalancing

Rebalancing moves data when:
- Query load increases (add nodes)
- Node fails (redistribute)
- Data volume grows

### Strategies

**Avoid `hash(key) mod N`**:
- Adding node changes partition for most keys
- Massive data movement

**Fixed number of partitions**:
- Create many partitions upfront (e.g., 1000)
- Assign multiple partitions per node
- Rebalance by moving entire partitions

```
Before: Node 1 [P1, P2, P3], Node 2 [P4, P5, P6]
After:  Node 1 [P1, P3], Node 2 [P4, P6], Node 3 [P2, P5]
```

**Used by**: Riak, Elasticsearch, Couchbase.

**Trade-off**: Too few partitions = limited scalability. Too many = overhead.

**Dynamic partitioning**:
- Start with few partitions
- Split when partition grows too large
- Merge when too small

**Used by**: HBase, MongoDB.

**Proportional to nodes**:
- Fixed partitions per node
- Adding node causes random splits

**Used by**: Cassandra.

### Automatic and manual rebalancing

Automatic rebalancing lowers routine operational work but can cascade when one failure triggers widespread movement.

Manual or semi-automatic rebalancing lets an operator inspect the plan before data moves, trading speed for control.

---

## Request routing

The client needs a way to identify the partition for each query.

### Approaches

**1. Any node (gossip)**
Client contacts any node; node forwards if needed.
- Simple client
- Extra hop possible

**Used by**: Cassandra, Riak.

**2. Routing tier**
Partition-aware load balancer routes to correct node.
- Client stays simple
- Extra hop always

**Used by**: Many production deployments.

**3. Partition-aware client**
Client knows partition mapping, contacts correct node.
- No extra hops
- Complex client, must stay in sync

**Used by**: MongoDB drivers.

### Service discovery

The routing tier or client can learn partition assignments through these methods:

| Method | Description |
|--------|-------------|
| ZooKeeper/etcd | Centralized coordination service |
| Gossip protocol | Nodes exchange partition info |
| External metadata | Query metadata service |

**ZooKeeper pattern**:
1. Partitions registered in ZooKeeper
2. Routing tier subscribes to changes
3. ZooKeeper notifies on rebalancing
4. Routing tier updates its map

---

## Hot spots

Even with good partitioning, hot spots can occur:
- Celebrity problem (one user has millions of followers)
- Time-based keys clustering recent data
- Popular items in e-commerce

### Mitigations

**Application-level sharding**: Add random prefix to hot keys.
```
# Instead of: user_123
# Use: 0_user_123, 1_user_123, ... 9_user_123
# Read requires scatter to all 10
```

**Caching**: Cache hot keys in front of database.

**Separate hot partition**: Dedicate resources to known hot keys.

**Read replicas**: Scale reads for hot data.

---

## Cross-partition operations

**Point queries**: Single partition, fast.

**Scatter-gather**: All partitions, slowest determines latency.

**Cross-partition joins**: Avoid if possible. Co-locate related data.

**Cross-partition transactions**: Very expensive. Consider:
- Denormalization to same partition
- Saga pattern
- Eventual consistency
