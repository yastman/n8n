# Redis 8.2.1 Vector Search Implementation Guide

## Overview
This document provides comprehensive guidance for implementing Redis 8.2.1 with vector search capabilities using HNSW (Hierarchical Navigable Small World) indexing for the AI automation platform.

**MCP Status**: ✅ 44 tools available and configured  
**Connection**: redis://default:redis_secure_password_2024_domain@95.111.252.29:6379/0  
**Current State**: Infrastructure operational, needs vector indices creation

## Quick Start with MCP Tools (Executable Now)

### Core Vector Search Setup using Redis MCP Server
```bash
# Using configured Redis MCP server (44 tools available)
# Connection: redis://default:redis_secure_password_2024_domain@95.111.252.29:6379/0

# 1. Create primary document vector index
create_vector_index_hash(
    index_name="document_vectors",
    prefix="doc:",
    vector_field="embedding", 
    dim=1536,
    distance_metric="COSINE"
)

# 2. Create product vector index (for existing opencart_products)
create_vector_index_hash(
    index_name="product_vectors",
    prefix="product:", 
    vector_field="embedding",
    dim=1536,
    distance_metric="COSINE"
)

# 3. Create query cache index
create_vector_index_hash(
    index_name="query_cache",
    prefix="cache:",
    vector_field="query_embedding",
    dim=1536, 
    distance_metric="COSINE"
)

# Verification commands
get_indexes()  # List all created indices
get_index_info("document_vectors")  # Check index details
get_indexed_keys_number("document_vectors")  # Count indexed keys
```

### Performance Optimization
5. **Configure memory management for large vector datasets**
6. **Set up Redis clustering for scalability**
7. **Implement connection pooling**
8. **Configure persistence (RDB + AOF)**

### Integration & Monitoring
9. **Create Redis client wrapper for n8n workflows**
10. **Set up monitoring with Redis Insight**
11. **Implement error handling and retry logic**
12. **Configure backup and restore procedures**
13. **Performance testing and optimization**

## Key Configuration Parameters

### HNSW Index Configuration
```redis
FT.CREATE vector_index 
ON HASH 
PREFIX 1 doc: 
SCHEMA 
  vector VECTOR HNSW 6 TYPE FLOAT32 DIM 1536 DISTANCE_METRIC COSINE M 64 EF_CONSTRUCTION 300 EF_RUNTIME 75
```

### Vector Search Query
```redis
FT.SEARCH vector_index "*=>[KNN 10 @vector $BLOB]" PARAMS 2 BLOB <vector_blob> RETURN 3 id content score
```

## Implementation Steps

### 1. Redis Installation and Setup
```bash
# Docker Compose configuration
version: '3.8'
services:
  redis:
    image: redis/redis-stack:8.2.1-v0
    ports:
      - "6379:6379"
      - "8001:8001"
    environment:
      - REDIS_ARGS=--loadmodule /opt/redis-stack/lib/redisearch.so
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
```

### 2. Vector Index Creation
```javascript
// Node.js Redis client setup
const redis = require('redis');
const client = redis.createClient({
  url: 'redis://localhost:6379'
});

// Create vector index
await client.ft.create('vector_index', {
  '$.vector': {
    type: 'VECTOR',
    algorithm: 'HNSW',
    attributes: {
      TYPE: 'FLOAT32',
      DIM: 1536,
      DISTANCE_METRIC: 'COSINE',
      M: 64,
      EF_CONSTRUCTION: 300,
      EF_RUNTIME: 75
    }
  }
}, {
  ON: 'HASH',
  PREFIX: 'doc:'
});
```

### Vector Storage and Search with MCP Tools
```bash
# Store test document with vector using MCP tools
set_vector_in_hash(
    name="doc:test_ai_document",
    vector=[0.1, 0.2, 0.3, ...],  # 1536 dimensional embedding
    vector_field="embedding"
)

# Add document metadata
hset(
    name="doc:test_ai_document",
    key="title",
    value="AI Automation Platform Test Document"
)

hset(
    name="doc:test_ai_document", 
    key="content",
    value="This document validates the AI automation platform's vector search capabilities with Redis 8.2.1 and HNSW indexing."
)

# Perform vector similarity search
vector_search_hash(
    query_vector=[0.1, 0.2, 0.3, ...],  # Query embedding
    index_name="document_vectors",
    k=10,  # Return top 10 results
    return_fields=["title", "content"]
)

# Retrieve stored vector for verification
get_vector_from_hash(
    name="doc:test_ai_document",
    vector_field="embedding"
)

# Check index statistics
get_index_info("document_vectors")
info("memory")  # Monitor memory usage
```

### 4. Hybrid Search Implementation
```javascript
// Combine vector and text search
const hybridSearch = async (queryVector, textQuery, k = 10) => {
  const vectorResults = await client.ft.search('vector_index', 
    `(${textQuery})=>[KNN ${k} @vector $BLOB]`, {
      PARAMS: { BLOB: Buffer.from(new Float32Array(queryVector).buffer) },
      RETURN: ['id', 'content', '__vector_score']
    }
  );
  return vectorResults;
};
```

## Performance Targets
- **Latency**: < 50ms per search
- **Throughput**: > 1000 QPS
- **Cache Hit Rate**: ≥ 80%
- **Memory Usage**: Optimized for large datasets

## Monitoring and Maintenance
- Use Redis Insight for visual monitoring
- Set up alerts for memory usage > 80%
- Monitor search latency and throughput
- Regular backup of vector indices

## Integration with n8n
- Create custom Redis nodes for vector operations
- Implement error handling and connection pooling
- Set up workflow triggers for vector updates
- Monitor vector search performance in workflows

## Security Considerations
- Enable Redis AUTH
- Configure SSL/TLS for connections
- Implement access controls
- Regular security audits