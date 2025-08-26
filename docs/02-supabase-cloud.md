# Supabase Cloud Implementation Guide

## Overview
This document covers Supabase Cloud setup with pgvector 0.8.0 for vector similarity search and database operations for the AI automation platform.

## Roadmap Tasks (10 Total)

### Database Setup
1. **Create Supabase Cloud project with pgvector 0.8.0**
2. **Set up vector similarity search tables**
3. **Configure Row Level Security (RLS) policies**
4. **Implement vector embedding storage**

### Performance & Optimization
5. **Create vector indices for fast similarity search**
6. **Set up connection pooling with PgBouncer**
7. **Configure database optimization settings**
8. **Implement caching strategies**

### Integration
9. **Set up real-time subscriptions for vector updates**
10. **Create Supabase client for n8n integration**

## Database Schema

### Vector Storage Table
```sql
-- Create extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Main documents table with vector embeddings
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536), -- OpenAI embedding dimension
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops)
WITH (m = 64, ef_construction = 300);

-- Create index for metadata searches
CREATE INDEX documents_metadata_gin ON documents USING gin (metadata);
```

### RLS Policies
```sql
-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users
CREATE POLICY "Users can view their own documents" ON documents
  FOR SELECT USING (auth.uid()::text = (metadata->>'user_id'));

CREATE POLICY "Users can insert their own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid()::text = (metadata->>'user_id'));

CREATE POLICY "Users can update their own documents" ON documents
  FOR UPDATE USING (auth.uid()::text = (metadata->>'user_id'));
```

## Vector Operations

### Insert Document with Embedding
```sql
-- Function to insert document with embedding
CREATE OR REPLACE FUNCTION insert_document(
  content_text TEXT,
  embedding_vector vector(1536),
  doc_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  doc_id UUID;
BEGIN
  INSERT INTO documents (content, embedding, metadata)
  VALUES (content_text, embedding_vector, doc_metadata)
  RETURNING id INTO doc_id;
  
  RETURN doc_id;
END;
$$ LANGUAGE plpgsql;
```

### Vector Similarity Search
```sql
-- Function for similarity search with filters
CREATE OR REPLACE FUNCTION similarity_search(
  query_embedding vector(1536),
  similarity_threshold FLOAT DEFAULT 0.8,
  max_results INT DEFAULT 10,
  metadata_filter JSONB DEFAULT '{}'
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE 
    1 - (d.embedding <=> query_embedding) > similarity_threshold
    AND (metadata_filter = '{}' OR d.metadata @> metadata_filter)
  ORDER BY d.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;
```

### Hybrid Search (Vector + Text)
```sql
-- Function for hybrid search combining vector similarity and text search
CREATE OR REPLACE FUNCTION hybrid_search(
  query_embedding vector(1536),
  search_text TEXT DEFAULT '',
  similarity_threshold FLOAT DEFAULT 0.7,
  max_results INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT,
  text_rank FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity,
    ts_rank(to_tsvector('english', d.content), plainto_tsquery('english', search_text)) AS text_rank
  FROM documents d
  WHERE 
    (search_text = '' OR to_tsvector('english', d.content) @@ plainto_tsquery('english', search_text))
    AND 1 - (d.embedding <=> query_embedding) > similarity_threshold
  ORDER BY 
    (1 - (d.embedding <=> query_embedding)) * 0.7 + 
    ts_rank(to_tsvector('english', d.content), plainto_tsquery('english', search_text)) * 0.3 DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;
```

## Client Integration

### JavaScript/TypeScript Client
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Insert document with embedding
async function insertDocument(content: string, embedding: number[], metadata: any = {}) {
  const { data, error } = await supabase.rpc('insert_document', {
    content_text: content,
    embedding_vector: `[${embedding.join(',')}]`,
    doc_metadata: metadata
  });
  
  if (error) throw error;
  return data;
}

// Similarity search
async function searchSimilar(queryEmbedding: number[], threshold = 0.8, limit = 10) {
  const { data, error } = await supabase.rpc('similarity_search', {
    query_embedding: `[${queryEmbedding.join(',')}]`,
    similarity_threshold: threshold,
    max_results: limit
  });
  
  if (error) throw error;
  return data;
}

// Hybrid search
async function hybridSearch(queryEmbedding: number[], searchText: string = '', threshold = 0.7, limit = 10) {
  const { data, error } = await supabase.rpc('hybrid_search', {
    query_embedding: `[${queryEmbedding.join(',')}]`,
    search_text: searchText,
    similarity_threshold: threshold,
    max_results: limit
  });
  
  if (error) throw error;
  return data;
}
```

## Real-time Subscriptions
```typescript
// Subscribe to document changes
const subscription = supabase
  .channel('documents')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'documents'
  }, (payload) => {
    console.log('Document changed:', payload);
    // Handle real-time updates
  })
  .subscribe();
```

## Performance Optimization

### Database Configuration
```sql
-- Optimize for vector operations
ALTER SYSTEM SET shared_preload_libraries = 'vector';
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- Optimize vector operations
SET hnsw.ef_search = 75;
```

### Connection Pooling
```typescript
// PgBouncer configuration in Supabase
const supabaseConfig = {
  db: {
    connectionString: process.env.SUPABASE_DB_URL,
    poolSize: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
};
```

## Monitoring and Alerts
- Monitor query performance and slow queries
- Set up alerts for connection pool exhaustion
- Track vector index usage and performance
- Monitor storage and compute usage

## Security Best Practices
- Use Row Level Security (RLS) for data isolation
- Implement proper authentication and authorization
- Regular security audits and updates
- Encrypt sensitive data in metadata fields

## Backup and Recovery
- Automated daily backups
- Point-in-time recovery setup
- Cross-region backup replication
- Regular backup testing and validation