# Foundations of data systems

Read this reference for first-principles guidance on workload shape, data models, storage engines, schema evolution, and tradeoffs in reliability and scalability.

## Topics
- Reliability, scalability, and maintainability
- Data models
- Storage engines
- Encoding and schema evolution

---

## Reliability, scalability, and maintainability

### Reliability
Reliability means that the system continues to behave correctly when faults occur.

Hardware faults include disk, memory, and network failures. Redundancy such as RAID, replication, and multiple datacenters can reduce their impact.

Software faults include bugs, resource exhaustion, and cascading failures. Limit them with:
- Process isolation
- Circuit breakers
- Crash-only design (restart rather than recover)
- Chaos engineering

Human error, especially misconfiguration, is a leading cause of outages. Limit it with:
- APIs that make invalid or dangerous actions difficult
- Sandbox environments
- Gradual rollouts
- Easy rollback
- Telemetry and monitoring

### Scalability

Describe load with parameters that match the system:
- Requests/second
- Read/write ratio
- Active users
- Cache hit rate
- Data volume

Measure performance in terms that match the workload:
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

Scaling approaches:
- **Vertical** (scale up): use a larger machine. This is simpler but bounded by one host.
- **Horizontal** (scale out): distribute work across more machines. This raises the coordination cost.
- **Elastic**: adjust capacity automatically with load. This suits unpredictable workloads.

### Maintainability

**Operability**: Operators can understand, monitor, repair, and change the system without unnecessary risk.

**Simplicity**: Good abstractions hide necessary complexity; accidental complexity is removed.

**Evolvability**: Loose coupling, trustworthy tests, and incremental deployment make changes safer.

---

## Data models

### Relational model
- Tables with rows and columns
- Schema enforced, normalized
- Powerful joins, mature query optimizers
- ACID transactions

**Best for**: Business data with many relationships, complex queries, strong consistency needs.

### Document model
- Self-contained documents (JSON, BSON)
- Schema flexible (schema-on-read)
- Better locality (entire document loaded at once)
- Poor for many-to-many relationships

**Best for**: Content management, catalogs, user profiles, event logs.

**Limitations**:
- Joins are weak/nonexistent
- Updates to nested arrays can be awkward
- Document size limits (16MB MongoDB)

### Graph model
- Vertices (nodes) and edges (relationships)
- Property graph: nodes and edges have properties
- Traversal queries natural

**Best for**: Social networks, fraud detection, recommendation engines, knowledge graphs.

**Query languages**: Cypher (Neo4j), SPARQL (RDF), Gremlin.

### Compare document and relational models

| Aspect | Document | Relational |
|--------|----------|------------|
| Schema | Flexible | Rigid |
| Joins | Application-side | Database-side |
| Many-to-many | Poor | Good |
| Locality | Good | Poor (normalized) |
| Transactions | Limited | Full ACID |

### Schema evolution

**Schema-on-write** (relational): Database enforces schema. Migration required for changes.

**Schema-on-read** (document): Schema implicit. Application handles variations.

Neither model is "schemaless" because the schema always exists somewhere.

---

## Storage engines

### Log-structured storage (LSM trees)

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

### Compare LSM trees and B-trees

| Aspect | LSM | B-Tree |
|--------|-----|--------|
| Write throughput | Higher | Lower |
| Write amplification | Lower | Higher |
| Read latency | Variable | Predictable |
| Space amplification | Higher | Lower |
| Best for | Write-heavy | Read-heavy |

### Other indexes

**Secondary indexes**: Index on non-primary columns. Can be:
- Clustered (data stored with index)
- Non-clustered (index points to heap)

**Covering index**: Index includes all columns needed for query. Avoids heap lookup.

**Concatenated index**: Index on multiple columns. Order matters for query optimization.

**Full-text indexes**: Inverted index mapping terms to document IDs. Tokenization, stemming, ranking.

**In-memory databases**: All data in RAM. Faster because no disk I/O overhead, not because of caching (disk DBs cache too). Examples: Redis, VoltDB, MemSQL.

---

## Encoding and schema evolution

### Encoding formats

| Format | Schema | Human-readable | Size | Evolution |
|--------|--------|----------------|------|-----------|
| JSON | No | Yes | Large | Field names in data |
| XML | Optional (XSD) | Yes | Largest | Verbose |
| Protocol Buffers | Required | No | Small | Field tags |
| Avro | Required | No | Smallest | Schema resolution |
| Thrift | Required | No | Small | Field IDs |

### Schema evolution rules

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

### Dataflow patterns

**Via databases**: Writer encodes, reader decodes. Both schemas must be compatible.

**Via service calls (REST/RPC)**: Request and response schemas must be compatible.

**Via async messaging**: Message schemas must be compatible. Consumer may lag producer.

### Avro schema resolution

Reader and writer can have different schemas. Avro resolves by:
1. Match fields by name
2. Apply defaults for missing fields
3. Ignore unknown fields

Enables independent schema evolution between producers and consumers.
