# Batch processing

Read this reference when bounded recomputation, offline pipelines, large joins, or the relative simplicity of batch processing drives the design.

## Topics
- Batch and stream processing
- MapReduce
- Dataflow engines
- Join algorithms
- Fault tolerance

---

## Batch and stream processing

| Aspect | Batch | Stream |
|--------|-------|--------|
| Input | Bounded dataset | Unbounded stream |
| Latency | Minutes to hours | Seconds to milliseconds |
| Processing | Full dataset available | Incremental |
| Fault recovery | Rerun from start | Checkpoints |

**Applying the Unix philosophy**:
- Keep inputs immutable.
- Produce complete outputs without modifying inputs.
- Compose programs by passing one program's output to another.

---

## MapReduce

### Execution model

```
Input → Map → Shuffle → Reduce → Output
```

1. **Map**: Process each record independently, emit key-value pairs
2. **Shuffle**: Group by key, sort
3. **Reduce**: Aggregate all values for each key

### Example: word count

```python
# Map
def map(document):
    for word in document.split():
        emit(word, 1)

# Reduce  
def reduce(word, counts):
    emit(word, sum(counts))
```

### Characteristics

MapReduce is useful when simple parallel execution and task-level retry matter more than latency:
- Simple programming model
- Automatic parallelization
- Fault tolerant (re-run failed tasks)

Its costs are repeated materialization and high latency:
- Materializes intermediate state to disk
- Multiple jobs require multiple reads/writes
- High latency

### MapReduce workflows

**Chained jobs**: Output of one job → input of next.

Each chained job writes to the distributed filesystem, so long workflows pay repeated I/O costs.

**Workflow schedulers** (Oozie, Airflow): Manage job dependencies.

---

## Dataflow engines

**Examples**: Spark, Flink, Tez.

### Improvements over MapReduce

| Aspect | MapReduce | Dataflow |
|--------|-----------|----------|
| Intermediate data | Disk | Memory (spill if needed) |
| Operators | Map + Reduce only | Arbitrary operators |
| Optimization | Manual job chaining | Query optimizer |
| Execution | Rigid stages | Flexible DAG |

### Spark RDDs

**Resilient Distributed Datasets**:
- Immutable, partitioned collections
- Lazy evaluation
- Track lineage for fault tolerance

**Transformations** (lazy):
- map, filter, flatMap
- groupByKey, reduceByKey
- join, cogroup

**Actions** (trigger execution):
- collect, count, save

### Fault tolerance

**MapReduce**: Re-run failed task from HDFS input.

**Spark**: Recompute from lineage (parents in DAG).

**Checkpointing**: Materialize intermediate state for long lineages.

---

## Join algorithms

### Sort-merge join

1. Sort both datasets by join key
2. Merge sorted streams

```
Dataset A (sorted): [a1, a2, a3, ...]
Dataset B (sorted): [b1, b2, b3, ...]
Walk through both, emit matches
```

**MapReduce implementation**:
- Map: Emit (join_key, record) with tag for dataset
- Shuffle: Group by join_key
- Reduce: Match records from both datasets

### Broadcast hash join

When one dataset is small:
1. Load small dataset into hash table
2. Broadcast to all partitions
3. Each mapper looks up in hash table

**No shuffle needed**: Very efficient.

**Requirement**: Small dataset fits in memory.

### Partitioned hash join (shuffle hash join)

1. Partition both datasets by join key
2. Build hash table for one partition
3. Probe with other partition

**Each partition independent**: Parallelizable.

### Choose a join strategy

```
One dataset small (fits in memory)?
  → Broadcast hash join

Both datasets large, join key = partition key?
  → Co-located join (no shuffle)

Both datasets large, not co-located?
  → Sort-merge OR shuffle hash join
  → Sort-merge better if multiple joins on same key
```

---

## MapReduce patterns

### Skewed joins

**Problem**: One key has many more records (celebrity problem).

**Solution 1 - Salted keys**:
1. Add random suffix to hot keys
2. Replicate other side for each suffix
3. Join, then aggregate

**Solution 2 - Two-pass**:
1. First pass: Sample to identify hot keys
2. Second pass: Broadcast hot keys, shuffle rest

### Secondary sort

Sort within each reduce key by secondary attribute.

**Implementation**:
1. Composite key: (primary_key, secondary_key)
2. Partition by primary_key only
3. Sort by composite key
4. Reducer sees values in secondary_key order

### Map-side aggregation (combiners)

Reduce data before shuffle.

```python
# Without combiner: emit every (word, 1)
# With combiner: emit (word, local_count) per mapper

def combiner(word, counts):
    emit(word, sum(counts))  # Local aggregation
```

**Requirement**: Aggregation must be associative and commutative.

---

## Output and side effects

### Write output

**HDFS output**: Write to temp directory, atomic rename on success.

For database output, generate files and bulk-load them. Do not write directly: task retries can duplicate effects.

### Idempotency

Failed tasks may retry, so use deterministic output paths and names that a retry can safely replace.

---

## Batch processing principles

### Derived data

**Principle**: Batch jobs produce derived datasets from raw data.

**Benefits**:
- Can regenerate if logic changes
- Can reprocess historical data
- Raw data is source of truth

### Recovery from human error

**Immutable inputs**: Can always reprocess.

**Explicit outputs**: Mistakes don't corrupt source data.

**Versioned outputs**: Can compare versions, rollback.

---

## Beyond MapReduce

### When MapReduce is not enough

| Limitation | Alternative |
|------------|-------------|
| High latency | Stream processing |
| Iterative algorithms | Spark (keep data in memory) |
| Interactive queries | Presto, Impala, Spark SQL |
| Graph processing | Pregel, GraphX |

### Lambda architecture

Run batch and stream in parallel.

```
Raw Data → Batch Layer → Batch Views ─┐
    │                                 ├→ Serving Layer → Queries
    └───→ Speed Layer → Real-time Views┘
```

**Batch layer**: Complete, accurate, high latency.
**Speed layer**: Approximate, low latency.
**Serving layer**: Merge results.

The main cost is maintaining two implementations of the same business logic.

**Alternative (Kappa)**: Stream only, with reprocessing capability.
