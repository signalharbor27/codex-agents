# TimescaleDB API Reference

## Deprecated → New

### Parameters
| Deprecated | New |
|------------|-----|
| `timescaledb.compress` | `timescaledb.enable_columnstore` |
| `timescaledb.compress_segmentby` | `timescaledb.segmentby` |
| `timescaledb.compress_orderby` | `timescaledb.orderby` |

### Functions
| Deprecated | New |
|------------|-----|
| `add_compression_policy()` | `add_columnstore_policy()` |
| `remove_compression_policy()` | `remove_columnstore_policy()` |
| `compress_chunk()` | `convert_to_columnstore()` |
| `decompress_chunk()` | `convert_to_rowstore()` |

### Views
| Deprecated | New |
|------------|-----|
| `compression_settings` | `columnstore_settings` |
| `hypertable_compression_settings` | `hypertable_columnstore_settings` |
| `chunk_compression_settings` | `chunk_columnstore_settings` |

### Stats Functions
| Deprecated | New |
|------------|-----|
| `hypertable_compression_stats()` | `hypertable_columnstore_stats()` |
| `chunk_compression_stats()` | `chunk_columnstore_stats()` |
