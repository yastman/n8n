# pgvector 0.8.0 Implementation Guide

## Overview
Implementation guide for pgvector 0.8.0 extension in PostgreSQL for vector similarity search.

## Key Features
- Vector similarity search with multiple distance functions
- HNSW and IVFFlat indexing algorithms
- Integration with Supabase Cloud
- Support for various vector dimensions

## Installation and Setup

### Enable pgvector Extension
```sql
-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
```

### Create Vector Tables
```sql
-- Documents table with vector embeddings
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536), -- OpenAI embedding dimension
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Indexing Strategies

### HNSW Index (Recommended)
```sql
-- Create HNSW index for fast approximate search
CREATE INDEX documents_embedding_hnsw_idx 
ON documents 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 64, ef_construction = 300);

-- Set runtime parameters
SET hnsw.ef_search = 100;
```

### IVFFlat Index (Alternative)
```sql
-- Create IVFFlat index for large datasets
CREATE INDEX documents_embedding_ivfflat_idx 
ON documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 1000);

-- Set probe parameter
SET ivfflat.probes = 10;
```

## Distance Functions

### Available Distance Operators
```sql
-- Cosine distance (most common for embeddings)
SELECT id, content, 1 - (embedding <=> query_vector) AS similarity
FROM documents
ORDER BY embedding <=> query_vector
LIMIT 10;

-- Euclidean distance (L2)
SELECT id, content, embedding <-> query_vector AS distance
FROM documents
ORDER BY embedding <-> query_vector
LIMIT 10;

-- Inner product
SELECT id, content, (embedding <#> query_vector) * -1 AS score
FROM documents
ORDER BY embedding <#> query_vector
LIMIT 10;
```

## Query Optimization

### Similarity Search Function
```sql
CREATE OR REPLACE FUNCTION similarity_search(
  query_embedding vector(1536),
  similarity_threshold FLOAT DEFAULT 0.8,
  max_results INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.content,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE 1 - (d.embedding <=> query_embedding) > similarity_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;
```

### Filtered Vector Search
```sql
CREATE OR REPLACE FUNCTION filtered_similarity_search(
  query_embedding vector(1536),
  metadata_filter JSONB DEFAULT '{}',
  similarity_threshold FLOAT DEFAULT 0.7,
  max_results INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE 
    (metadata_filter = '{}' OR d.metadata @> metadata_filter)
    AND 1 - (d.embedding <=> query_embedding) > similarity_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;
```

## Performance Tuning

### Index Parameters Optimization
```sql
-- For HNSW index tuning
-- m: number of bi-directional links (16-64, default 16)
-- ef_construction: size of candidate list (100-800, default 64)
CREATE INDEX documents_embedding_optimized_idx 
ON documents 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 64, ef_construction = 400);

-- Runtime search parameter
SET hnsw.ef_search = 200; -- Higher = more accurate but slower
```

### Memory Configuration
```sql
-- Optimize PostgreSQL for vector operations
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET work_mem = '64MB';
ALTER SYSTEM SET maintenance_work_mem = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';

-- Reload configuration
SELECT pg_reload_conf();
```

## Client Integration

### Python Example
```python
import psycopg2
import numpy as np
from pgvector.psycopg2 import register_vector

# Connect and register vector type
conn = psycopg2.connect(database="postgres", host="localhost")
register_vector(conn)

# Insert vector
embedding = np.random.random(1536)
cur = conn.cursor()
cur.execute(
    "INSERT INTO documents (title, content, embedding) VALUES (%s, %s, %s)",
    ("Sample Document", "This is content", embedding)
)

# Search similar vectors
query_embedding = np.random.random(1536)
cur.execute(
    """
    SELECT id, title, content, 1 - (embedding <=> %s) AS similarity
    FROM documents
    ORDER BY embedding <=> %s
    LIMIT 5
    """,
    (query_embedding, query_embedding)
)
results = cur.fetchall()
```

### JavaScript/Node.js Example
```javascript
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

await client.connect();

// Insert document with embedding
async function insertDocument(title, content, embedding) {
  const query = `
    INSERT INTO documents (title, content, embedding)
    VALUES ($1, $2, $3)
    RETURNING id
  `;
  const result = await client.query(query, [title, content, JSON.stringify(embedding)]);
  return result.rows[0].id;
}

// Vector similarity search
async function searchSimilar(queryEmbedding, limit = 10) {
  const query = `
    SELECT id, title, content, 
           1 - (embedding <=> $1) AS similarity
    FROM documents
    ORDER BY embedding <=> $1
    LIMIT $2
  `;
  const result = await client.query(query, [JSON.stringify(queryEmbedding), limit]);
  return result.rows;
}
```

## Monitoring and Maintenance

### Performance Monitoring
```sql
-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE indexname LIKE '%embedding%';

-- Check query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT id, title, 1 - (embedding <=> '[1,2,3...]') AS similarity
FROM documents
ORDER BY embedding <=> '[1,2,3...]'
LIMIT 10;
```

### Index Maintenance
```sql
-- Reindex for performance
REINDEX INDEX documents_embedding_hnsw_idx;

-- Analyze table statistics
ANALYZE documents;

-- Check index size
SELECT 
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes 
WHERE tablename = 'documents';
```

## Best Practices

### Vector Storage
- Use appropriate dimensions (384, 768, 1536 common)
- Normalize vectors for cosine similarity
- Consider quantization for large datasets

### Index Selection
- HNSW for general use cases
- IVFFlat for very large datasets (>1M vectors)
- Adjust parameters based on data size and query patterns

### Query Optimization
- Use similarity thresholds to filter results
- Combine with traditional indexes for metadata filtering
- Monitor and tune ef_search parameter

### Scaling Considerations
- Partition large tables by date or category
- Use connection pooling (PgBouncer)
- Consider read replicas for query scaling