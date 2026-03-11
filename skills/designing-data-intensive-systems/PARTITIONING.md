# Partitioning (Sharding)

Read this when shard-key choice, hotspot risk, secondary indexes, routing, or rebalancing trade-offs dominate the design.

## Contents
- Why Partition
- Partitioning Strategies
- Secondary Indexes
- Rebalancing
- Request Routing

---

## Why Partition

**Goal**: Spread data and load across multiple machines.

**Benefits**:
- Scalability beyond single node
- Parallel query execution
- Isolation of hot data

**Challenges**:
- Cross-partition queries expensive
- Rebalancing complexity
- Hot spots

**Combined with replication**: Each partition typically has multiple replicas.

---

## Partitioning Strategies

### Key-Range Partitioning

**How it works**: Assign contiguous range of keys to each partition.

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

**Mitigation for hot spots**: Prefix key with random element (lose range queries) or application-aware splitting.

### Hash Partitioning

**How it works**: Hash key, assign to partition based on hash range.

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

### Compound Keys (Cassandra-style)

First column determines partition, remaining columns for sorting within partition.

```
PRIMARY KEY ((user_id), timestamp)
```

- Partition by user_id (hash)
- Within partition, sorted by timestamp
- Range queries within user efficient

**Best of both**: Hash distribution + range queries within entity.

---

## Secondary Indexes

Primary key determines partition. What about queries on other columns?

### Local Index (Document-partitioned)

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

### Global Index (Term-partitioned)

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

### Choosing Index Strategy

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

Moving data between partitions when:
- Query load increases (add nodes)
- Node fails (redistribute)
- Data volume grows

### Strategies

**DON'T: hash(key) mod N**
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

### Automatic vs Manual Rebalancing

**Automatic**: Less operational burden, but can cascade (one failure triggers storm).

**Manual/Semi-automatic**: Human approves rebalancing plan. Safer for production.

---

## Request Routing

How does client know which partition to query?

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

### Service Discovery

How routing tier/client learns partition assignments:

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

## Hot Spots

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

## Cross-Partition Operations

**Point queries**: Single partition, fast.

**Scatter-gather**: All partitions, slowest determines latency.

**Cross-partition joins**: Avoid if possible. Co-locate related data.

**Cross-partition transactions**: Very expensive. Consider:
- Denormalization to same partition
- Saga pattern
- Eventual consistency
