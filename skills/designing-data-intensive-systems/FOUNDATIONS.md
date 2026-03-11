# Foundations of Data Systems

Read this when you need first-principles guidance on workload shape, data models, storage engines, schema evolution, or reliability/scalability trade-offs.

## Contents
- Reliability, Scalability, Maintainability
- Data Models
- Storage Engines
- Encoding and Schema Evolution

---

## Reliability, Scalability, Maintainability

### Reliability
System continues working correctly despite faults.

**Hardware faults**: Disk, RAM, network failures. Mitigate with redundancy (RAID, replication, multi-datacenter).

**Software faults**: Bugs, resource exhaustion, cascading failures. Mitigate with:
- Process isolation
- Circuit breakers
- Crash-only design (restart rather than recover)
- Chaos engineering

**Human errors**: Misconfigurations (leading cause of outages). Mitigate with:
- Well-designed APIs that make it hard to do wrong thing
- Sandbox environments
- Gradual rollouts
- Easy rollback
- Telemetry and monitoring

### Scalability

**Describing load**: Identify load parameters for YOUR system:
- Requests/second
- Read/write ratio
- Active users
- Cache hit rate
- Data volume

**Describing performance**: 
- Throughput (batch systems)
- Response time (online systems)

**Response time percentiles**:
| Percentile | Meaning |
|------------|---------|
| p50 (median) | Typical user experience |
| p95 | 1 in 20 users |
| p99 | Tail latency, often SLO target |
| p99.9 | Expensive to optimize, may not be worth it |

**Tail latency amplification**: If request fans out to N services, p99 of slowest dominates.

**Scaling approaches**:
- **Vertical** (scale up): Bigger machine. Simple but limited.
- **Horizontal** (scale out): More machines. Complex but unlimited ceiling.
- **Elastic**: Auto-scale based on load. Good for unpredictable workloads.

### Maintainability

**Operability**: Easy for ops to keep running. Good monitoring, automation, documentation.

**Simplicity**: Manage complexity through abstraction. Remove accidental complexity.

**Evolvability**: Easy to make changes. Loose coupling, good tests, incremental deployment.

---

## Data Models

### Relational Model
- Tables with rows and columns
- Schema enforced, normalized
- Powerful joins, mature query optimizers
- ACID transactions

**Best for**: Business data with many relationships, complex queries, strong consistency needs.

### Document Model
- Self-contained documents (JSON, BSON)
- Schema flexible (schema-on-read)
- Better locality (entire document loaded at once)
- Poor for many-to-many relationships

**Best for**: Content management, catalogs, user profiles, event logs.

**Limitations**:
- Joins are weak/nonexistent
- Updates to nested arrays can be awkward
- Document size limits (16MB MongoDB)

### Graph Model
- Vertices (nodes) and edges (relationships)
- Property graph: nodes and edges have properties
- Traversal queries natural

**Best for**: Social networks, fraud detection, recommendation engines, knowledge graphs.

**Query languages**: Cypher (Neo4j), SPARQL (RDF), Gremlin.

### Comparison: Document vs Relational

| Aspect | Document | Relational |
|--------|----------|------------|
| Schema | Flexible | Rigid |
| Joins | Application-side | Database-side |
| Many-to-many | Poor | Good |
| Locality | Good | Poor (normalized) |
| Transactions | Limited | Full ACID |

### Schema Evolution

**Schema-on-write** (relational): Database enforces schema. Migration required for changes.

**Schema-on-read** (document): Schema implicit. Application handles variations.

Neither is "schemaless" - schema exists somewhere.

---

## Storage Engines

### Log-Structured (LSM Trees)

**Write path**:
1. Write to in-memory memtable (sorted)
2. When full, flush to immutable SSTable on disk
3. Background compaction merges SSTables

**Read path**:
1. Check memtable
2. Check SSTables (newest first)
3. Use bloom filters to skip SSTables without key

**Compaction strategies**:
- **Size-tiered**: Merge similarly-sized SSTables. Higher space amplification.
- **Leveled**: Organized into levels. Lower space amplification, more compaction.

**Characteristics**:
- Write-optimized (sequential writes)
- Higher write throughput
- Space amplification during compaction
- Variable read latency (may check multiple SSTables)

**Used by**: Cassandra, HBase, LevelDB, RocksDB, ScyllaDB.

### B-Trees

**Structure**: Balanced tree with pages (typically 4KB). Keys sorted within pages.

**Write path**:
1. Find leaf page for key
2. Update in place
3. Split page if full (propagate up)
4. WAL for crash recovery

**Read path**:
1. Binary search from root to leaf
2. O(log n) page reads

**Characteristics**:
- Read-optimized (predictable latency)
- Write amplification (update multiple pages)
- Mature, well-understood
- Better for read-heavy workloads

**Used by**: PostgreSQL, MySQL (InnoDB), SQL Server.

### LSM vs B-Tree Comparison

| Aspect | LSM | B-Tree |
|--------|-----|--------|
| Write throughput | Higher | Lower |
| Write amplification | Lower | Higher |
| Read latency | Variable | Predictable |
| Space amplification | Higher | Lower |
| Best for | Write-heavy | Read-heavy |

### Other Indexes

**Secondary indexes**: Index on non-primary columns. Can be:
- Clustered (data stored with index)
- Non-clustered (index points to heap)

**Covering index**: Index includes all columns needed for query. Avoids heap lookup.

**Concatenated index**: Index on multiple columns. Order matters for query optimization.

**Full-text indexes**: Inverted index mapping terms to document IDs. Tokenization, stemming, ranking.

**In-memory databases**: All data in RAM. Faster because no disk I/O overhead, not because of caching (disk DBs cache too). Examples: Redis, VoltDB, MemSQL.

---

## Encoding and Schema Evolution

### Encoding Formats

| Format | Schema | Human-readable | Size | Evolution |
|--------|--------|----------------|------|-----------|
| JSON | No | Yes | Large | Field names in data |
| XML | Optional (XSD) | Yes | Largest | Verbose |
| Protocol Buffers | Required | No | Small | Field tags |
| Avro | Required | No | Smallest | Schema resolution |
| Thrift | Required | No | Small | Field IDs |

### Schema Evolution Rules

**Forward compatibility**: Old code can read new data.
**Backward compatibility**: New code can read old data.

**Safe changes** (both directions):
- Add optional field with default
- Remove optional field
- Rename field (if using field IDs/tags)

**Unsafe changes**:
- Change field type (may truncate)
- Remove required field
- Change field ID/tag

### Dataflow Patterns

**Via databases**: Writer encodes, reader decodes. Both schemas must be compatible.

**Via service calls (REST/RPC)**: Request and response schemas must be compatible.

**Via async messaging**: Message schemas must be compatible. Consumer may lag producer.

### Avro Schema Resolution

Reader and writer can have different schemas. Avro resolves by:
1. Match fields by name
2. Apply defaults for missing fields
3. Ignore unknown fields

Enables independent schema evolution between producers and consumers.
