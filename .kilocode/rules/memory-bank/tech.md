# Technologies

## Core Technologies

- **n8n**: Workflow automation platform used for orchestrating AI services and data flows
- **n8n-MCP**: MCP server providing comprehensive access to 535+ n8n nodes, documentation, and workflow management tools
- **Redis**: In-memory data store used for caching, vector search, and session management
- **Supabase**: Open-source Firebase alternative for database management and authentication
- **Cohere**: AI platform for reranking search results and natural language processing
- **OpenAI**: GPT models (GPT-5 and GPT-5-mini) for response generation and personalization
- **Model Context Protocol (MCP)**: Framework for integrating AI tools and services

## Development Setup

- **Workflow Management**: n8n with n8n-MCP for comprehensive node documentation and workflow automation
- **Environment Configuration**: Environment variables stored in n8n-secrets.env
- **Project Configuration**: MCP configuration in .mcp.json and .roo/mcp.json
- **Version Control**: Git (implied by .gitignore pattern in .kilocodeignore)

## Technical Constraints

- **AI Cost Management**: Semantic caching implemented to reduce API costs
- **Performance**: 10,000 token context window limit for conversation management
- **Data Privacy**: Sensitive data excluded via .kilocodeignore (secrets, SSH keys, etc.)
- **Scalability**: Architecture designed for horizontal scaling of workflow nodes

## Dependencies

- **AI Services**: OpenAI, Cohere, and Redis MCP servers
- **Database**: Supabase PostgreSQL database
- **Caching**: Redis for both semantic caching and vector storage
- **Authentication**: Supabase Auth (implied by Supabase usage)
- **Workflow Management**: n8n-MCP for comprehensive node documentation and workflow automation

## Tool Usage Patterns

- **n8n Workflows**: Visual workflow design for AI orchestration
- **n8n-MCP Integration**: Comprehensive access to 535+ nodes with validation and documentation tools
- **MCP Integration**: Standardized integration pattern for AI tools
- **Hybrid Search**: Consistent pattern of combining vector and database search
- **Semantic Caching**: Standardized caching with similarity threshold of 0.8
- **Error Handling**: Fallback mechanisms with error logging and admin notifications
- **Workflow Validation**: Pre-deployment validation using n8n-MCP tools to ensure reliability

## Configuration Files

- **.mcp.json**: Main MCP server configuration including n8n-MCP, Supabase, and Redis servers
- **.roo/mcp.json**: Additional MCP server configurations with environment variables
- **n8n-secrets.env**: Environment variables for n8n instance
- **workflow.json**: Base workflow configuration
