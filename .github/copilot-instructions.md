# YouTube Scraping MCP Server - GitHub Copilot Instructions

## Project Overview
This is a production-ready YouTube Scraping MCP Server built with TypeScript for Cloudflare Workers. It provides YouTube analytics, transcript extraction, channel analysis, and trend detection through the Model Context Protocol (MCP).

## Core Architecture Rules

### TypeScript Standards (CRITICAL)
- **ZERO any/unknown/undefined types** - All code must be strongly typed
- Use strict TypeScript mode with comprehensive type definitions
- Define interfaces before implementation
- Leverage the existing type system in `src/types/` directory

### Project Structure (STRICTLY ENFORCED)
```
src/
├── index.ts                 # Cloudflare Workers entry point
├── services/               # Business logic layer
├── utils/                  # Utility functions
└── types/                  # TypeScript definitions
```

### File Naming Conventions
- Services: `*.service.ts`
- Utilities: `*.util.ts`
- Types: `*.types.ts`
- NO unnecessary subfolders - keep structure flat

## MCP Server Patterns

### Tool Registry Pattern (IMPLEMENTED)
When creating new MCP tools, follow this exact pattern:
```typescript
interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  handler: (input: unknown) => Promise<MCPToolResponse>;
}
```

### Service Initialization Pattern (CRITICAL)
Use lazy loading singleton pattern for Cloudflare Workers:
```typescript
let serviceInstance: ServiceType | null = null;

function getService(): ServiceType {
  if (!serviceInstance) {
    serviceInstance = new ServiceType(config);
  }
  return serviceInstance;
}
```

### Error Boundary Pattern (IMPLEMENTED)
Always wrap operations with error boundaries:
```typescript
try {
  // Tool execution
} catch (error) {
  return errorHandler.createErrorResponse(/*...*/);
}
```

## Technology Stack

### Core Technologies
- **Runtime**: Cloudflare Workers (Edge Computing)
- **Language**: TypeScript 5.0+ with strict typing
- **Protocol**: Model Context Protocol (MCP) with JSON-RPC 2.0
- **APIs**: YouTube Data API v3
- **Storage**: Cloudflare KV for caching
- **Testing**: MCP Inspector

### API Integration Rules
- **YouTube API Quota**: 10,000 units/day - implement aggressive caching
- **Rate Limiting**: Use exponential backoff retry strategy
- **Caching Strategy**: Multi-layer (Memory → KV → API)
- **Error Handling**: Graceful fallbacks when APIs fail

## Implementation Guidelines

### When Adding New MCP Tools
1. Define TypeScript interfaces first in `src/types/youtube.types.ts`
2. Create JSON Schema for input validation
3. Implement in service layer with proper error handling
4. Register in `ToolRegistryUtil`
5. Add caching with appropriate TTL
6. Test with MCP Inspector

### Performance Requirements
- **Response Time**: < 500ms for cached requests
- **Memory Usage**: Optimize for Cloudflare Workers limits
- **Caching**: Intelligent TTL management to reduce API calls

### Error Handling Standards
- Use structured error responses with consistent format
- Implement circuit breaker pattern for external services
- Provide user-friendly error messages
- Log errors with context for debugging

## Current Tool Status

### ✅ Implemented Tools
- `getVideoTranscript` - Fully functional with multi-format URL support

### 🎯 Ready for Implementation (follow existing patterns)
- `getVideoAnalytics` - Video metrics and statistics
- `analyzeChannelPerformance` - Channel analysis
- `findTopPerformingVideo` - Top video identification
- `compareWithCompetitors` - Competitor analysis
- `searchKeywordsInContent` - Content search
- `detectTrendingTopics` - Trend detection

## Code Quality Standards

### Dependencies
- Use existing dependencies in `package.json`
- Prefer standard library when possible
- Add new dependencies only when necessary

### Testing
- Test all tools with MCP Inspector
- Write unit tests for services and utilities
- Validate error handling and edge cases

### Documentation
- Update API documentation when adding tools
- Follow existing documentation patterns
- Include comprehensive examples

## Environment Configuration

### Required Environment Variables
```env
YOUTUBE_API_KEY=your_youtube_api_key
ENVIRONMENT=development|production
LOG_LEVEL=debug|info|warn|error
```

### Cloudflare KV Namespaces
- `CACHE` - For response caching
- `RATE_LIMITS` - For quota tracking

## Security Considerations
- Never expose API keys in code
- Use Cloudflare secrets for production
- Validate all inputs with JSON Schema
- Implement proper CORS handling

## Performance Optimization
- Leverage Cloudflare edge computing
- Implement intelligent caching strategies
- Use lazy loading for service initialization
- Optimize for cold start performance

## Memory Bank Integration
- Always read memory bank files when making significant changes
- Update `memory-bank/activeContext.md` after major implementations
- Document architectural decisions in `memory-bank/systemPatterns.md`

## Common Patterns to Follow

### YouTube URL Parsing
Use the existing pattern for multi-format URL support:
- Standard: `https://www.youtube.com/watch?v=VIDEO_ID`
- Shorts: `https://www.youtube.com/shorts/VIDEO_ID`
- Mobile: `https://m.youtube.com/watch?v=VIDEO_ID`
- Short URL: `https://youtu.be/VIDEO_ID`

### API Response Caching
Implement multi-layer caching with appropriate TTLs:
- Transcript data: 24 hours
- Video analytics: 1 hour
- Channel data: 6 hours

### Quota Management
- Track API usage per operation
- Implement exponential backoff
- Use circuit breaker for failed services
- Provide quota status in responses

## Development Workflow
1. Check existing implementation patterns
2. Follow TypeScript strict mode
3. Implement error boundaries
4. Add comprehensive logging
5. Test with MCP Inspector
6. Update documentation
7. Update memory bank files

Remember: This is a production-ready system with 3,000+ lines of strongly-typed code. Always maintain the high standards established in the existing codebase.
