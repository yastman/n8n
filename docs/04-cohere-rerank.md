# Cohere Rerank API v2.0 Implementation Guide

## Overview
Implementation guide for Cohere Rerank API v2.0 to improve search result quality.

## Roadmap Tasks (5 Total)
1. **Set up Cohere Rerank API v2.0 integration**
2. **Implement reranking for search results**
3. **Configure optimal reranking parameters**
4. **Set up caching for rerank results**
5. **Monitor and optimize rerank performance**

## Basic Implementation

### API Client Setup
```javascript
class CohereRerankClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.cohere.ai/v2';
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  async rerank(query, documents, options = {}) {
    const payload = {
      model: options.model || 'rerank-english-v3.0',
      query: query,
      documents: documents,
      top_k: options.topK || 10,
      return_documents: true
    };

    const response = await fetch(`${this.baseURL}/rerank`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload)
    });

    return await response.json();
  }
}
```

### Reranking Pipeline
```javascript
async function rerankSearchResults(query, searchResults, topK = 10) {
  const cohere = new CohereRerankClient(process.env.COHERE_API_KEY);
  
  const documents = searchResults.map(result => ({
    id: result.id,
    text: result.content
  }));
  
  const rerankResponse = await cohere.rerank(query, documents, { topK });
  
  return rerankResponse.results.map(result => {
    const originalResult = searchResults[result.index];
    return {
      ...originalResult,
      rerank_score: result.relevance_score,
      final_score: (originalResult.score * 0.3) + (result.relevance_score * 0.7)
    };
  });
}
```

## Integration with n8n

### Rerank Node Configuration
```json
{
  "name": "Cohere Rerank",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://api.cohere.ai/v2/rerank",
    "authentication": "headerAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Authorization",
          "value": "Bearer {{ $credentials.cohereApi.apiKey }}"
        }
      ]
    },
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "model",
          "value": "rerank-english-v3.0"
        },
        {
          "name": "query",
          "value": "={{ $json.query }}"
        },
        {
          "name": "documents",
          "value": "={{ $json.documents }}"
        },
        {
          "name": "top_k",
          "value": 10
        }
      ]
    }
  }
}
```

## Performance Optimization

### Caching Strategy
```javascript
const NodeCache = require('node-cache');
const rerankCache = new NodeCache({ stdTTL: 3600 });

class CachedRerankService extends CohereRerankClient {
  async rerank(query, documents, options = {}) {
    const cacheKey = this.generateCacheKey(query, documents);
    const cached = rerankCache.get(cacheKey);
    
    if (cached) return cached;
    
    const result = await super.rerank(query, documents, options);
    rerankCache.set(cacheKey, result);
    
    return result;
  }
  
  generateCacheKey(query, documents) {
    const docHashes = documents.map(doc => 
      require('crypto').createHash('md5').update(doc.text).digest('hex')
    );
    return `rerank:${query}:${docHashes.join(',')}`;
  }
}
```

## Monitoring and Metrics

### Performance Tracking
```javascript
class RerankMonitor {
  static trackUsage(query, documentsCount, responseTime, tokensUsed) {
    const metrics = {
      timestamp: new Date().toISOString(),
      query_length: query.length,
      documents_count: documentsCount,
      response_time_ms: responseTime,
      tokens_used: tokensUsed,
      cost_estimate: (tokensUsed / 1000) * 0.002 // Estimated cost
    };
    
    // Send to monitoring system
    console.log('Rerank metrics:', metrics);
  }
}
```

## Best Practices

### Rate Limiting
- Maximum 100 requests per minute
- Batch requests when possible
- Implement exponential backoff for retries

### Document Optimization
- Limit to 100 documents per request
- Truncate very long documents
- Use meaningful document IDs

### Cost Management
- Cache frequent queries
- Monitor token usage
- Set query limits per user

## Error Handling
```javascript
async function safeRerank(query, documents, options = {}) {
  try {
    return await rerankSearchResults(query, documents, options.topK);
  } catch (error) {
    console.error('Rerank failed:', error);
    // Fallback to original ranking
    return documents.slice(0, options.topK || 10);
  }
}
```