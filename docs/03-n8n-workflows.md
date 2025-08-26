# n8n Workflow Automation Implementation Guide

## Overview
Implementation guide for n8n workflow automation with AI integration, vector search, and database connectivity.

**MCP Status**: ✅ 39 tools available but 0 nodes accessible  
**Critical Issue**: Database connectivity problem - `get_database_statistics()` returns 0 nodes  
**Priority**: Restore n8n database connection to unlock workflow automation

## Current Status & MCP Diagnostics

### n8n MCP Server Status
```bash
# Available tools: 39 total
# Current critical issue: Database connectivity

# Diagnostic commands (ready to execute)
get_database_statistics()  # Currently returns: {"totalNodes": 0, "statistics": null}
tools_documentation()      # Get recovery documentation
list_nodes()              # Should return 525+ nodes when working
list_ai_tools()           # Should return 268 AI-capable nodes

# Node discovery tools (once connectivity restored)
search_nodes("redis")     # Find Redis integration nodes
search_nodes("supabase")  # Find Supabase database nodes
search_nodes("openai")    # Find OpenAI API nodes
search_nodes("webhook")   # Find webhook trigger nodes
```

### n8n Database Connection Recovery
```bash
# Step 1: Diagnose current issue
get_database_statistics()  # Check current node count (currently 0)

# Step 2: Use MCP tools for recovery
tools_documentation()      # Get detailed recovery procedures

# Step 3: Restore workflows (once connected)
get_templates_for_task("ai_automation")     # Get AI workflow templates
get_templates_for_task("vector_search")     # Get vector search workflows
get_templates_for_task("webhook_processing") # Get webhook handling templates
```

### AI Workflow Implementation (Post-Recovery)
```bash
# Once n8n connectivity is restored, create AI workflows

# Step 1: Find required nodes
search_nodes("redis")     # Redis integration nodes
search_nodes("supabase")  # Database integration nodes  
search_nodes("openai")    # AI model integration
search_nodes("code")      # Custom JavaScript execution

# Step 2: Get node configuration help
get_node_essentials("n8n-nodes-base.webhook")  # Webhook trigger setup
get_node_essentials("n8n-nodes-base.openAi")   # OpenAI integration
get_node_essentials("n8n-nodes-base.code")     # Code execution node

# Step 3: Get pre-configured templates
get_node_for_task("vector_similarity_search")  # Vector search template
get_node_for_task("ai_text_processing")        # AI processing template
get_node_for_task("webhook_to_database")       # Webhook to DB pipeline

# Step 4: Validate workflow before deployment
validate_workflow(workflow_config)              # Full workflow validation
validate_node_operation(node_config)           # Individual node validation
```

## Workflow Architecture

### Document Processing Pipeline
```
Webhook -> Validate -> Generate Embeddings -> Store Redis -> Store Supabase -> Response

```

### AI Search Pipeline
```
Search Request -> Query Embedding -> Vector Search -> Cohere Rerank -> Combine Results -> Response

```

## Essential Workflow Templates

### 1. Document Processing Workflow

```json
{
  "name": "AI Document Processing Pipeline",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "process-document"
      },
      "id": "webhook-start",
      "name": "Document Upload",
      "type": "n8n-nodes-base.webhook",
      "position": [240, 300]
    },
    {
      "parameters": {
        "jsCode": "// Validate document\nconst input = $input.first().json;\nif (!input.content || !input.title) throw new Error('Missing required fields');\n\nreturn {\n  document: {\n    id: input.id || crypto.randomUUID(),\n    title: input.title.trim(),\n    content: input.content.trim(),\n    metadata: { ...input.metadata, created_at: new Date().toISOString() }\n  }\n};"
      },
      "id": "validate-document",
      "name": "Validate Document",
      "type": "n8n-nodes-base.code",
      "position": [460, 300]
    },
    {
      "parameters": {
        "resource": "text",
        "operation": "embeddings",
        "model": "text-embedding-3-small",
        "text": "={{ $json.document.title + ' ' + $json.document.content }}"
      },
      "id": "generate-embeddings",
      "name": "Generate Embeddings",
      "type": "n8n-nodes-base.openAi",
      "position": [680, 300]
    },
    {
      "parameters": {
        "jsCode": "// Store in Redis\nconst redis = require('redis');\nconst document = $input.first().json.document;\nconst embedding = $input.first().json.data[0].embedding;\n\nconst client = redis.createClient({ url: $vars.REDIS_URL });\nawait client.connect();\n\nconst docKey = `doc:${document.id}`;\nawait client.hSet(docKey, {\n  id: document.id,\n  title: document.title,\n  content: document.content,\n  metadata: JSON.stringify(document.metadata),\n  vector: Buffer.from(new Float32Array(embedding).buffer)\n});\n\nawait client.disconnect();\nreturn { document: { ...document, status: 'indexed' } };"
      },
      "id": "store-redis",
      "name": "Store in Redis",
      "type": "n8n-nodes-base.code",
      "position": [900, 300]
    },
    {
      "parameters": {
        "operation": "insert",
        "table": "documents",
        "columns": {
          "id": "={{ $json.document.id }}",
          "title": "={{ $json.document.title }}",
          "content": "={{ $json.document.content }}",
          "metadata": "={{ JSON.stringify($json.document.metadata) }}",
          "embedding": "=[{{ $('Generate Embeddings').first().json.data[0].embedding.join(',') }}]"
        }
      },
      "id": "store-supabase",
      "name": "Store in Supabase",
      "type": "n8n-nodes-base.supabase",
      "position": [1120, 300]
    }
  ]
}
```

### 2. AI Search Workflow

```json
{
  "name": "AI Search with Reranking",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "search"
      },
      "id": "search-webhook",
      "name": "Search Request",
      "type": "n8n-nodes-base.webhook",
      "position": [240, 300]
    },
    {
      "parameters": {
        "resource": "text",
        "operation": "embeddings",
        "model": "text-embedding-3-small",
        "text": "={{ $json.query }}"
      },
      "id": "query-embedding",
      "name": "Generate Query Embedding",
      "type": "n8n-nodes-base.openAi",
      "position": [460, 300]
    },
    {
      "parameters": {
        "jsCode": "// Redis vector search\nconst redis = require('redis');\nconst client = redis.createClient({ url: $vars.REDIS_URL });\nawait client.connect();\n\nconst queryEmbedding = $input.first().json.data[0].embedding;\nconst k = $('Search Request').first().json.limit || 20;\n\nconst results = await client.ft.search('vector_index', `*=>[KNN ${k} @vector $BLOB]`, {\n  PARAMS: { BLOB: Buffer.from(new Float32Array(queryEmbedding).buffer) },\n  RETURN: ['id', 'title', 'content', '__vector_score']\n});\n\nawait client.disconnect();\nreturn results.documents.map(doc => ({ json: doc.value }));"
      },
      "id": "redis-search",
      "name": "Redis Vector Search",
      "type": "n8n-nodes-base.code",
      "position": [680, 300]
    },
    {
      "parameters": {
        "url": "https://api.cohere.ai/v2/rerank",
        "authentication": "headerAuth",
        "sendHeaders": true,
        "headerParameters": {
          "Authorization": "Bearer {{ $vars.COHERE_API_KEY }}"
        },
        "sendBody": true,
        "bodyParameters": {
          "model": "rerank-english-v3.0",
          "query": "={{ $('Search Request').first().json.query }}",
          "documents": "={{ $input.all().map(item => item.json.content) }}",
          "top_k": "={{ $('Search Request').first().json.final_limit || 10 }}"
        }
      },
      "id": "cohere-rerank",
      "name": "Cohere Rerank",
      "type": "n8n-nodes-base.httpRequest",
      "position": [900, 300]
    },
    {
      "parameters": {
        "jsCode": "// Combine results\nconst originalDocs = $('Redis Vector Search').all();\nconst rerankResults = $input.first().json.results;\n\nconst finalResults = rerankResults.map(result => {\n  const originalDoc = originalDocs[result.index].json;\n  return {\n    id: originalDoc.id,\n    title: originalDoc.title,\n    content: originalDoc.content,\n    vector_score: originalDoc.__vector_score,\n    rerank_score: result.relevance_score,\n    final_score: (originalDoc.__vector_score * 0.3) + (result.relevance_score * 0.7)\n  };\n});\n\nreturn [{\n  json: {\n    query: $('Search Request').first().json.query,\n    results: finalResults,\n    total_results: finalResults.length\n  }\n}];"
      },
      "id": "combine-results",
      "name": "Combine Results",
      "type": "n8n-nodes-base.code",
      "position": [1120, 300]
    }
  ]
}
```

## Custom Node Development

### Redis Vector Search Node
```
class RedisVectorSearchNode {
  description = {
    displayName: 'Redis Vector Search',
    name: 'redisVectorSearch',
    group: ['transform'],
    properties: [
      {
        displayName: 'Query Vector',
        name: 'queryVector',
        type: 'string',
        required: true
      },
      {
        displayName: 'Number of Results',
        name: 'k',
        type: 'number',
        default: 10
      }
    ]
  };

  async execute() {
    const queryVector = this.getNodeParameter('queryVector');
    const k = this.getNodeParameter('k');
    
    const client = redis.createClient({ url: process.env.REDIS_URL });
    await client.connect();
    
    const results = await client.ft.search('vector_index', 
      `*=>[KNN ${k} @vector $BLOB]`, {
        PARAMS: { BLOB: Buffer.from(new Float32Array(JSON.parse(queryVector)).buffer) }
      }
    );
    
    await client.disconnect();
    return results.documents.map(doc => ({ json: doc.value }));
  }
}
```

## Monitoring and Error Handling

### Workflow Monitoring
```javascript
class WorkflowMonitor {
  static async trackExecution(workflowId, nodeId, duration, success, error) {
    await fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflow_id: workflowId,
        node_id: nodeId,
        duration_ms: duration,
        success,
        error: error?.message,
        timestamp: new Date().toISOString()
      })
    });
  }
}
```

### Error Handling Pattern
```
function withErrorHandling(nodeFunction) {
  return async function() {
    try {
      return await nodeFunction.call(this);
    } catch (error) {
      console.error('Node error:', error);
      
      // Send alert
      await this.helpers.httpRequest({
        method: 'POST',
        url: process.env.SLACK_WEBHOOK_URL,
        body: {
          text: `🚨 Workflow Error: ${error.message}`,
          channel: '#alerts'
        }
      });
      
      throw error;
    }
  };
}
```

## Performance Optimization

### Best Practices
1. **Parallel Processing**: Use Split In Batches for large datasets
2. **Caching**: Implement Redis caching for frequent operations
3. **Connection Pooling**: Reuse database connections
4. **Batch Operations**: Process multiple items together
5. **Resource Limits**: Set appropriate memory and CPU limits

### Rate Limiting
```
const rateLimiter = {
  tokens: 100,
  refillRate: 10,
  
  async acquire() {
    if (this.tokens < 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.acquire();
    }
    this.tokens--;
    return true;
  }
};
```

## Testing Framework

### Workflow Testing
```
class WorkflowTester {
  async testWorkflow(workflowId, testCases) {
    const results = [];
    
    for (const testCase of testCases) {
      const execution = await this.executeWorkflow(workflowId, testCase.input);
      results.push({
        name: testCase.name,
        passed: this.compareResults(testCase.expected, execution.output),
        input: testCase.input,
        output: execution.output
      });
    }
    
    return results;
  }
}
```

## Deployment Configuration

### n8n Docker Setup
```
n8n:
  image: n8nio/n8n:latest
  environment:
    - N8N_HOST=${N8N_HOST}
    - N8N_PROTOCOL=https
    - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
    - DB_TYPE=postgresdb
    - DB_POSTGRESDB_HOST=postgres
    - EXECUTIONS_DATA_PRUNE=true
    - EXECUTIONS_DATA_MAX_AGE=168
  volumes:
    - n8n_data:/home/node/.n8n
    - ./workflows:/home/node/.n8n/workflows
  depends_on:
    - postgres
    - redis
```

## Integration Points

### Environment Variables
```
# n8n Configuration
N8N_HOST=n8n.yourdomain.com
N8N_ENCRYPTION_KEY=your-encryption-key

# API Keys
OPENAI_API_KEY=sk-your-openai-key
COHERE_API_KEY=your-cohere-key

# Database
REDIS_URL=redis://localhost:6379
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

### Workflow Credentials
1. **OpenAI**: API key for embeddings
2. **Cohere**: API key for reranking
3. **Redis**: Connection credentials
4. **Supabase**: Service role key
5. **Slack**: Webhook URL for alerts

## Performance Targets

| Metric | Target | Component |
|--------|--------|-----------|
| Workflow Execution | < 5s | Document Processing |
| Search Latency | < 2s | AI Search Pipeline |
| Error Rate | < 1% | All Workflows |
| Throughput | 100/min | Combined Workflows |

## Troubleshooting

### Common Issues
1. **Memory Issues**: Increase node memory limits
2. **Timeout Errors**: Optimize database queries
3. **Rate Limits**: Implement proper throttling
4. **Connection Errors**: Use connection pooling

### Debug Commands
```bash
# Check n8n logs
docker-compose logs n8n

# Test workflow manually
curl -X POST http://localhost:5678/webhook/test

# Monitor workflow executions
n8n executions list
```

## Implementation Checklist

### Core Setup
- [ ] Install and configure n8n
- [ ] Set up database connection
- [ ] Configure environment variables
- [ ] Import workflow templates

### Integrations
- [ ] Connect to Redis vector search
- [ ] Set up Supabase integration
- [ ] Configure Cohere reranking
- [ ] Test OpenAI embeddings

### Monitoring
- [ ] Set up error handling
- [ ] Configure logging
- [ ] Implement health checks
- [ ] Set up alerting

### Testing
- [ ] Create test cases
- [ ] Run workflow tests
- [ ] Performance testing
- [ ] Load testing

This guide provides all necessary components to implement the 5 n8n workflow tasks from the roadmap with production-ready automation pipelines.