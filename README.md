# YouTube Scraping MCP Server

A comprehensive Model Context Protocol (MCP) server for YouTube data analysis and content extraction. Built with TypeScript and designed for Cloudflare Workers with advanced features including real-time WebSocket support, multi-user authentication, and comprehensive analytics.

## 🚀 Features

### Core MCP Tools
- **Video Transcript Extraction** - Get captions/transcripts from YouTube videos
- **Video Analytics** - Detailed performance metrics and statistics  
- **Channel Analytics** - Channel-level insights and growth metrics
- **Comment Analysis** - Extract and analyze video comments
- **Video Search** - Advanced YouTube search with filtering
- **Trending Analysis** - Track trending videos and patterns
- **Competitor Analysis** - Compare channels and performance metrics

### Advanced Capabilities
- **Real-time WebSocket Connections** - Live data streaming and notifications
- **Multi-user Authentication** - API key-based user management with quota tracking
- **Intelligent Caching** - Multi-layer caching (Memory → KV → API) for optimal performance
- **Rate Limiting & Quota Management** - Built-in YouTube API quota optimization
- **Health Monitoring** - Comprehensive health checks and metrics
- **Multiple Protocol Support** - WebSocket, HTTP REST API, and standard MCP over HTTP

## 🏗️ Architecture

### Core Infrastructure
- **MCP Server** - JSON-RPC 2.0 compliant with full protocol support
- **Tool Registry** - Modular tool registration with validation and execution
- **Configuration Management** - Environment-based configuration with validation
- **Error Handling** - Multi-level error boundaries with structured responses
- **Logging System** - Comprehensive logging with context management

### Remote MCP Capabilities
- **WebSocket Transport** - Real-time bidirectional communication
- **Authentication Service** - Session management with KV persistence
- **Connection Management** - Connection lifecycle and health monitoring
- **Multi-protocol Router** - Handles WebSocket, HTTP, and MCP requests

## 📋 Prerequisites

- **Node.js** 18+ 
- **Cloudflare Account** with Workers and KV enabled
- **YouTube Data API v3 Key** from Google Cloud Console
- **Wrangler CLI** for Cloudflare Workers deployment

## ⚡ Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd youtube-mcp-server
npm install
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
YOUTUBE_API_KEY=your_youtube_api_key_here
ENVIRONMENT=development
```

### 3. Development Setup
```bash
# Start development server
npm run dev

# The server will be available at:
# - WebSocket: ws://localhost:8787/ws
# - HTTP API: http://localhost:8787/api/
# - MCP Protocol: http://localhost:8787/mcp
# - Health Check: http://localhost:8787/health
```

### 4. Production Deployment
```bash
# Deploy to Cloudflare Workers
npm run deploy

# Your server will be available at:
# https://your-worker.your-subdomain.workers.dev
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `YOUTUBE_API_KEY` | YouTube Data API v3 key | ✅ | - |
| `ENVIRONMENT` | Deployment environment | ✅ | `development` |
| `DEBUG` | Enable debug logging | ❌ | `false` |
| `RATE_LIMIT_REQUESTS` | Max requests per window | ❌ | `100` |
| `RATE_LIMIT_WINDOW` | Rate limit window (ms) | ❌ | `60000` |

### Cloudflare KV Namespaces

Required KV namespaces in `wrangler.toml`:
- `YOUTUBE_MCP_KV` - Main data storage
- `CACHE_KV` - Caching layer (optional)

## 📡 API Usage

### WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:8787/ws');

// Authenticate
ws.send(JSON.stringify({
  id: 'auth-1',
  type: 'request',
  method: 'authenticate',
  params: {
    apiKey: 'your-api-key',
    clientInfo: {
      name: 'My App',
      version: '1.0.0',
      platform: 'web'
    }
  }
}));

// Execute tool
ws.send(JSON.stringify({
  id: 'tool-1',
  type: 'request',
  method: 'tools/call',
  params: {
    name: 'getVideoTranscript',
    arguments: {
      videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ'
    }
  }
}));
```

### HTTP API
```bash
# List available tools
curl http://localhost:8787/api/tools

# Execute tool
curl -X POST http://localhost:8787/api/tools/getVideoTranscript \
  -H "Content-Type: application/json" \
  -d '{"videoUrl": "https://youtube.com/watch?v=dQw4w9WgXcQ"}'
```

### MCP Protocol
```bash
# List tools
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'

# Call tool
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "getVideoTranscript",
      "arguments": {
        "videoUrl": "https://youtube.com/watch?v=dQw4w9WgXcQ"
      }
    }
  }'
```

## 🛠️ MCP Inspector Integration

Use the official MCP Inspector to test and debug your server:

```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Connect to your server
mcp-inspector http://localhost:8787/mcp
```

## 🔍 Tools Reference

### getVideoTranscript
Extract video transcripts and captions.

**Input:**
```json
{
  "videoUrl": "https://youtube.com/watch?v=VIDEO_ID"
}
```

**Output:**
```json
{
  "content": [{
    "type": "text",
    "text": "Video transcript content..."
  }]
}
```

### getVideoAnalytics
Get comprehensive video analytics and metrics.

**Input:**
```json
{
  "videoUrl": "https://youtube.com/watch?v=VIDEO_ID",
  "includeEngagement": true
}
```

### getChannelAnalytics
Analyze channel performance and growth metrics.

**Input:**
```json
{
  "channelUrl": "https://youtube.com/@channel",
  "timeRange": "30d"
}
```

## 📊 Monitoring & Health

### Health Check Endpoint
```bash
curl http://localhost:8787/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-06T12:00:00.000Z",
  "metrics": {
    "activeConnections": 5,
    "totalRequests": 1250,
    "averageResponseTime": 145,
    "errorRate": 0.02,
    "quotaUsage": 2500
  },
  "services": {
    "youtube": "online",
    "cache": "online",
    "database": "online"
  }
}
```

### Connection Statistics
Monitor WebSocket connections and usage patterns through the health endpoint or admin API.

## 🔒 Security & Quota Management

### API Key Management
- Generate API keys through the admin interface (coming soon)
- Each key has individual quota limits and permissions
- Keys are cached for performance with KV persistence

### Quota Limits
- **Default:** 10,000 YouTube API units/day per user
- **Multiplier Support:** Premium users can have higher limits
- **Automatic Reset:** Daily quota reset at midnight UTC
- **Warning Thresholds:** Alerts at 80% usage

### Rate Limiting
- **WebSocket:** Per-connection rate limiting
- **HTTP API:** Global and per-IP rate limiting
- **Quota Enforcement:** Real-time quota validation

## 🚀 Performance Optimization

### Caching Strategy
1. **Memory Cache** - Hot data for sub-10ms response
2. **Cloudflare KV** - Persistent cache with TTL
3. **YouTube API** - Only when cache misses

### Response Time Targets
- **Cached Requests:** < 50ms
- **KV Cache Hits:** < 200ms  
- **API Requests:** < 500ms

### Quota Optimization
- **Smart Caching:** Aggressive caching with intelligent invalidation
- **Batch Requests:** Combine multiple API calls when possible
- **Fallback Strategies:** Graceful degradation when quota exceeded

## 📝 Development

### Project Structure
```
src/
├── services/           # Core business logic
├── utils/             # Utilities and helpers
├── types/             # TypeScript type definitions
├── tools/             # MCP tool implementations
└── remote-mcp-server.ts # Main server orchestrator
```

### Adding New Tools
1. Create tool file in `src/tools/`
2. Implement MCP tool interface
3. Register in tool registry
4. Add input/output schemas
5. Write tests and documentation

### Type Safety
- **Zero `any` types** - Complete type safety
- **Strict TypeScript** - No implicit any or undefined
- **Interface-first** - Define types before implementation

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:integration
```

### MCP Inspector Testing
```bash
# Start server in development mode
npm run dev

# In another terminal, run MCP Inspector
mcp-inspector http://localhost:8787/mcp
```

## 📚 Documentation

- **[Setup Guide](docs/setup-guide.md)** - Detailed setup instructions
- **[API Reference](docs/api-reference.md)** - Complete API documentation  
- **[Deployment Guide](docs/deployment-guide.md)** - Production deployment
- **[MCP Inspector Testing](docs/mcp-inspector-testing.md)** - Testing with MCP Inspector

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure TypeScript compilation passes
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Issues:** GitHub Issues
- **Documentation:** `/docs` directory  
- **Community:** Discussion forums (link TBA)

---

**Built with ❤️ for the Model Context Protocol ecosystem**

*This MCP server provides both standard MCP functionality and advanced remote capabilities with real-time WebSocket support, making it one of the most comprehensive MCP implementations available.*