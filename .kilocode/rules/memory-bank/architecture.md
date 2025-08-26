# System Architecture

## Overview

The system is an AI-powered e-commerce platform for ceramic products that combines multiple AI services and data sources to provide intelligent search and consultation capabilities. The architecture follows a workflow-based approach using n8n for orchestration, with specialized services for different AI functions.

## Core Components

### 1. AI Consultant Workflow

- **Chat Trigger**: Receives user queries via web or Telegram channels
- **Context Manager**: Maintains conversation context using Redis with 10,000 token window
- **Semantic Cache**: Uses Redis MCP server to check for cached responses (threshold: 0.8 similarity)
- **Knowledge Retrieval**: Hybrid search combining vector search and database queries
- **Response Generation**: Uses OpenAI GPT-5 with reasoning capabilities and custom tools
- **Response Caching**: Stores new responses in Redis with 1-hour TTL

### 2. Product Search Workflow

- **HTTP Request Trigger**: REST API endpoint for search queries
- **Query Analysis**: JavaScript code node for intent classification and filter extraction
- **Vector Search**: Redis-based similarity search on ceramic product embeddings
- **Database Search**: Supabase queries for structured product data with availability filters
- **Result Reranking**: Cohere rerank-v3 model to combine and rank results
- **Personalization**: OpenAI GPT-5-mini for user history-based personalization
- **Analytics**: Redis logging of search queries and performance metrics

## Data Flow

1. User submits query (natural language)
2. System analyzes query intent and extracts filters
3. Parallel execution of:
   - Vector search on product embeddings
   - Database search with structured filters
4. Results combined and reranked using Cohere
5. Personalization applied based on user history
6. Final results formatted and returned to user
7. Analytics logged for optimization

## Key Technical Decisions

- **Workflow Orchestration**: Using n8n for visual workflow management and integration
- **Caching Strategy**: Semantic caching with Redis to reduce AI processing costs
- **Hybrid Search**: Combining vector and database search for optimal relevance
- **Multi-Provider AI**: Leveraging different AI providers for specialized tasks
- **Modular Architecture**: Separating concerns between search, consultation, and data access

## Critical Implementation Paths

- AI Consultant: webhook → context → cache check → knowledge retrieval → response generation → caching
- Product Search: HTTP request → query analysis → vector search + database search → reranking → personalization → response
- Data Integration: Supabase (product data) ↔ Redis (caching/vectors) ↔ AI services (Cohere, OpenAI)

## Source Code Paths

- Workflow definitions: AI-Consultant-Workflow.md, Product-Search-Workflow.md
- Configuration: .mcp.json, .roo/mcp.json
- Main workflow: workflow.json
- Environment: n8n-secrets.env
