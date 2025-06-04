# System Patterns - YouTube Scraping MCP Server

## Architecture Overview

The YouTube Scraping MCP Server follows a layered architecture pattern optimized for Cloudflare Workers, emphasizing modularity, type safety, and performance.

## Core Patterns

### 1. MCP Tool Registry Pattern
```typescript
interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  handler: (input: unknown) => Promise<MCPToolResponse>;
}

class ToolRegistry {
  private tools = new Map<string, MCPTool>();
  
  register(tool: MCPTool): void;
  execute(toolName: string, input: unknown): Promise<MCPToolResponse>;
}
```

**Benefits:**
- Modular tool registration
- Type-safe tool execution
- Easy tool discovery and validation
- Centralized error handling

### 2. Service Layer Pattern
```typescript
interface YouTubeService {
  getVideoAnalytics(videoId: string): Promise<VideoMetrics>;
  getChannelVideos(channelId: string, count: number): Promise<VideoInfo[]>;
}

interface TranscriptService {
  extractTranscript(videoId: string, language?: string): Promise<VideoTranscript>;
}
```

**Benefits:**
- Clear separation of concerns
- Dependency injection for testing
- Interface-based design for flexibility
- Reusable business logic

### 3. Multi-Layer Caching Pattern
```
Request → Memory Cache → KV Cache → API Call
         ↓              ↓          ↓
      < 100ms        < 200ms    < 500ms
```

**Implementation:**
- L1: In-memory cache (5 minutes TTL)
- L2: Cloudflare KV cache (1 hour TTL)
- L3: Long-term KV cache (24 hours TTL)

**Benefits:**
- Optimal performance for repeated requests
- Reduced API quota consumption
- Automatic cache warming
- Graceful cache invalidation

### 4. Rate Limiting Pattern
```typescript
interface RateLimiter {
  checkQuota(operation: string): Promise<boolean>;
  consumeQuota(operation: string, cost: number): Promise<void>;
  getRetryDelay(operation: string): Promise<number>;
}
```

**Features:**
- Per-operation quota tracking
- Exponential backoff implementation
- Burst allowance for peak loads
- Circuit breaker for failed services

### 5. Error Boundary Pattern
```typescript
interface ErrorHandler {
  handleQuotaExceeded(): MCPToolResponse;
  handleRateLimit(retryAfter: number): MCPToolResponse;
  handleAPIError(error: APIError): MCPToolResponse;
  handleValidationError(details: ValidationError[]): MCPToolResponse;
}
```

**Benefits:**
- Consistent error response format
- Graceful degradation
- User-friendly error messages
- Detailed error logging

## Component Relationships

### Request Flow Pattern
```mermaid
sequenceDiagram
    participant Client
    participant MCPHandler
    participant ToolRegistry
    participant Service
    participant Cache
    participant API
    
    Client->>MCPHandler: MCP Request
    MCPHandler->>ToolRegistry: Execute Tool
    ToolRegistry->>Service: Business Logic
    Service->>Cache: Check Cache
    alt Cache Hit
        Cache-->>Service: Cached Data
    else Cache Miss
        Service->>API: API Call
        API-->>Service: Fresh Data
        Service->>Cache: Store Data
    end
    Service-->>ToolRegistry: Processed Data
    ToolRegistry-->>MCPHandler: Tool Response
    MCPHandler-->>Client: MCP Response
```

### Dependency Injection Pattern
```typescript
interface ServiceContainer {
  youtubeService: YouTubeService;
  transcriptService: TranscriptService;
  cacheService: CacheService;
  rateLimitService: RateLimitService;
}

class MCPServer {
  constructor(private services: ServiceContainer) {}
}
```

**Benefits:**
- Testable components
- Flexible service swapping
- Clear dependency graph
- Easy mocking for tests

## Design Patterns

### 1. Factory Pattern for Tools
```typescript
class ToolFactory {
  static createTranscriptTool(services: ServiceContainer): MCPTool {
    return {
      name: 'getVideoTranscript',
      description: 'Extract transcript from YouTube video',
      inputSchema: transcriptInputSchema,
      handler: async (input) => {
        const validInput = validateTranscriptInput(input);
        return services.transcriptService.extractTranscript(validInput.videoId);
      }
    };
  }
}
```

### 2. Strategy Pattern for API Clients
```typescript
interface APIStrategy {
  makeRequest(endpoint: string, params: Record<string, string>): Promise<Response>;
}

class YouTubeAPIStrategy implements APIStrategy {
  async makeRequest(endpoint: string, params: Record<string, string>): Promise<Response> {
    // YouTube API specific implementation
  }
}
```

### 3. Observer Pattern for Events
```typescript
interface EventEmitter {
  on(event: string, handler: EventHandler): void;
  emit(event: string, data: unknown): void;
}

// Usage for quota monitoring, cache events, etc.
```

## Performance Patterns

### 1. Lazy Loading Pattern
```typescript
class ServiceLoader {
  private static youtubeService?: YouTubeService;
  
  static getYouTubeService(): YouTubeService {
    if (!this.youtubeService) {
      this.youtubeService = new YouTubeService(config);
    }
    return this.youtubeService;
  }
}
```

### 2. Request Batching Pattern
```typescript
class BatchProcessor {
  private batch: Request[] = [];
  private timeout?: number;
  
  add(request: Request): Promise<Response> {
    this.batch.push(request);
    return this.processBatch();
  }
  
  private async processBatch(): Promise<Response> {
    // Batch multiple requests into single API call
  }
}
```

### 3. Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures = 0;
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

## Security Patterns

### 1. Input Validation Pattern
```typescript
import { z } from 'zod';

const videoIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{11}$/);
const channelIdSchema = z.string().regex(/^UC[a-zA-Z0-9_-]{22}$/);

function validateInput<T>(schema: z.ZodSchema<T>, input: unknown): T {
  return schema.parse(input);
}
```

### 2. API Key Rotation Pattern
```typescript
class APIKeyManager {
  private keys: string[];
  private currentIndex = 0;
  
  getCurrentKey(): string {
    return this.keys[this.currentIndex];
  }
  
  rotateKey(): void {
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
  }
}
```

## Testing Patterns

### 1. Mock Service Pattern
```typescript
class MockYouTubeService implements YouTubeService {
  async getVideoAnalytics(videoId: string): Promise<VideoMetrics> {
    return mockVideoMetrics[videoId] || defaultMockMetrics;
  }
}
```

### 2. Test Double Pattern
```typescript
interface TestEnvironment {
  services: ServiceContainer;
  mocks: MockContainer;
  utilities: TestUtilities;
}

function createTestEnvironment(): TestEnvironment {
  // Create isolated test environment
}
```

## Monitoring Patterns

### 1. Metrics Collection Pattern
```typescript
interface MetricsCollector {
  recordRequestTime(toolName: string, duration: number): void;
  recordQuotaUsage(operation: string, cost: number): void;
  recordCacheHit(cacheLayer: string): void;
  recordError(error: Error, context: ErrorContext): void;
}
```

### 2. Health Check Pattern
```typescript
interface HealthChecker {
  checkAPI(): Promise<HealthStatus>;
  checkCache(): Promise<HealthStatus>;
  checkQuota(): Promise<HealthStatus>;
  getOverallHealth(): Promise<HealthStatus>;
}
```

## Key Architectural Decisions

### 1. Edge-First Design
- Optimized for Cloudflare Workers runtime
- Minimal cold start time
- Global distribution benefits

### 2. Type-Safe API Design
- Strong TypeScript typing throughout
- JSON Schema validation for MCP tools
- Compile-time error catching

### 3. Fault-Tolerant Architecture
- Multiple fallback mechanisms
- Graceful degradation patterns
- Comprehensive error handling

### 4. Performance-Optimized Caching
- Multi-layer cache strategy
- Intelligent cache warming
- Efficient cache invalidation

## Evolution Strategy

### Phase 1: Core Infrastructure ✅ 80% COMPLETE
- ✅ Complete MCP server implementation (378 lines)
- ✅ Advanced error handling and logging utilities (534 lines)
- ✅ Full request/response cycle with JSON-RPC 2.0 compliance
- ⚠️ Missing ConfigurationService and ToolRegistryUtil (critical blockers)

### Phase 2: Enhanced Features (NEXT)
- Tool registry with validation and execution pipeline
- First functional MCP tools (getVideoTranscript, getVideoAnalytics)
- Basic caching with Cloudflare KV integration
- YouTube API rate limiting implementation

### Phase 3: Production Optimization
- Advanced multi-layer caching implementation
- Performance optimization and monitoring
- Security hardening and quota management
- Comprehensive error recovery patterns

### Phase 4: Extensibility
- Plugin architecture for custom tools
- Advanced analysis capabilities
- Third-party integrations and extensions

## Implementation Status Update

### Completed Patterns ✅
1. **MCP Tool Registry Pattern**: Fully typed interfaces implemented
2. **Service Layer Pattern**: Complete interfaces and dependency injection ready
3. **Error Boundary Pattern**: Advanced error handling with recovery mechanisms
4. **Request/Response Pattern**: Full MCP JSON-RPC 2.0 compliance
5. **Logging Pattern**: Comprehensive structured logging with metrics
6. **Type Safety Pattern**: 907 lines of strongly-typed interfaces

### Active Implementation Patterns ⚠️
1. **Configuration Management**: Interface defined, implementation pending
2. **Tool Execution Pipeline**: Architecture ready, registry implementation needed
3. **Dependency Injection**: Pattern established, container implementation pending

### Ready for Implementation 🚀
1. **Caching Strategy**: Multi-layer pattern designed, ready for implementation
2. **Rate Limiting**: Exponential backoff pattern ready
3. **API Integration**: YouTube service interfaces defined

## Confidence Rating: 9/10
Excellent progress with production-ready core infrastructure. Clear path to completion with only 2 critical service files blocking full functionality.