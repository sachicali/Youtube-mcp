# Setup Guide - YouTube Scraping MCP Server

This comprehensive guide will walk you through setting up the YouTube Scraping MCP Server from scratch to production deployment.

## 📋 Prerequisites

### System Requirements

- **Node.js**: 18.0+ (with npm/pnpm)
- **Git**: For version control
- **Cloudflare Account**: Free tier sufficient
- **YouTube Data API Access**: Google Cloud Console account

### Development Tools

- **MCP Inspector**: For testing MCP tools
- **VS Code**: Recommended IDE with TypeScript support
- **Wrangler CLI**: Cloudflare Workers development tool

## 🚀 Step 1: Initial Setup

### 1.1 Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd youtube-scraping-mcp-server

# Install dependencies
npm install

# Verify TypeScript compilation
npm run type-check
```

### 1.2 Project Structure Verification

Ensure your project structure matches:

```
youtube-scraping-mcp-server/
├── src/
│   ├── index.ts                 # Cloudflare Workers entry point
│   ├── services/               # Service layer
│   │   ├── configuration.service.ts
│   │   └── youtube.service.ts
│   ├── utils/                  # Utility functions
│   │   ├── error-handler.util.ts
│   │   ├── logger.util.ts
│   │   └── tool-registry.util.ts
│   └── types/                  # TypeScript type definitions
│       ├── mcp.types.ts
│       ├── youtube.types.ts
│       ├── environment.types.ts
│       └── cloudflare.types.ts
├── docs/                       # Documentation
├── memory-bank/               # Project memory files
├── README.md                  # Main documentation
├── .env.example              # Environment template
├── package.json
├── tsconfig.json
└── wrangler.toml             # Cloudflare Workers config
```

## 🔑 Step 2: YouTube API Setup

### 2.1 Create Google Cloud Project

1. **Visit Google Cloud Console**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Sign in with your Google account

2. **Create New Project**:
   ```
   Project Name: YouTube MCP Server
   Organization: (your organization or leave blank)
   Location: (your preference)
   ```

3. **Enable YouTube Data API v3**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"

### 2.2 Create API Credentials

1. **Navigate to Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"

2. **Secure Your API Key**:
   ```bash
   # Copy the generated API key
   # Important: Restrict the key to YouTube Data API v3
   ```

3. **Set API Key Restrictions** (Recommended):
   - Application restrictions: None (for development)
   - API restrictions: YouTube Data API v3
   - For production: Add HTTP referrer restrictions

### 2.3 Test API Access

```bash
# Test your API key
curl "https://www.googleapis.com/youtube/v3/videos?id=dQw4w9WgXcQ&part=snippet&key=YOUR_API_KEY"
```

Expected response: JSON with video details

## ⚙️ Step 3: Environment Configuration

### 3.1 Create Environment File

```bash
# Copy the template
cp .env.example .env

# Edit the environment file
nano .env  # or use your preferred editor
```

### 3.2 Configure Required Variables

```env
# Required: YouTube API Configuration
YOUTUBE_API_KEY=your_actual_youtube_api_key_here

# Required: Cloudflare Configuration
CACHE_KV=CACHE

# Development Configuration
ENVIRONMENT=development
LOG_LEVEL=debug
DEBUG_MODE=true
```

**Important Notes**:
- For local development, the API key will be loaded from `.env` automatically
- For Cloudflare Workers deployment, set the API key as a secret:
  ```bash
  wrangler secret put YOUTUBE_API_KEY
  ```
- The system will first check Cloudflare environment, then fall back to `.env` file

### 3.3 Validate Configuration

```bash
# Check TypeScript compilation
npm run type-check

# Verify environment loading
npm run dev
```

## ☁️ Step 4: Cloudflare Workers Setup

### 4.1 Install Wrangler CLI

```bash
# Install globally
npm install -g wrangler

# Verify installation
wrangler --version

# Login to Cloudflare
wrangler login
```

### 4.2 Create KV Namespaces

```bash
# Create cache namespace
wrangler kv:namespace create "CACHE"

# Create rate limits namespace
wrangler kv:namespace create "RATE_LIMITS"
```

**Important**: Note the namespace IDs returned for `wrangler.toml` configuration.

### 4.3 Update wrangler.toml

Edit `wrangler.toml` with your namespace IDs:

```toml
name = "youtube-scraping-mcp-server"
main = "src/index.ts"
compatibility_date = "2024-10-04"
node_compat = true

[[kv_namespaces]]
binding = "CACHE"
id = "your-cache-namespace-id-here"
preview_id = "your-preview-cache-namespace-id-here"

[[kv_namespaces]]
binding = "RATE_LIMITS"
id = "your-rate-limits-namespace-id-here"
preview_id = "your-preview-rate-limits-namespace-id-here"

[vars]
ENVIRONMENT = "development"
LOG_LEVEL = "info"
```

### 4.4 Set Production Secrets

```bash
# Set YouTube API key as secret
wrangler secret put YOUTUBE_API_KEY
# Enter your API key when prompted
```

## 🔧 Step 5: Development Environment

### 5.1 Start Development Server

```bash
# Start local development server
npm run dev

# Server will start on http://localhost:8787
# Watch for "Ready on http://localhost:8787" message
```

### 5.2 Verify Server Health

```bash
# Test health endpoint
curl http://localhost:8787/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-12-06T...",
  "services": {
    "mcp": "ready",
    "youtube": "ready",
    "cache": "ready"
  }
}
```

### 5.3 Test MCP Protocol

```bash
# Test MCP initialization
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "0.1.0",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

## 🛠️ Step 6: MCP Inspector Setup

### 6.1 Install MCP Inspector

```bash
# Install MCP Inspector globally
npm install -g @modelcontextprotocol/inspector

# Verify installation
mcp-inspector --version
```

### 6.2 Connect to Server

```bash
# Start MCP Inspector
mcp-inspector

# In the inspector interface:
# 1. Set server URL: http://localhost:8787
# 2. Click "Connect"
# 3. Verify tools are listed
```

### 6.3 Test Functional Tool

In MCP Inspector:

1. **Select `getVideoTranscript` tool**
2. **Enter test input**:
   ```json
   {
     "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
   }
   ```
3. **Execute tool**
4. **Verify response** contains transcript data

## 📊 Step 7: Verification and Testing

### 7.1 Tool Registry Verification

```bash
# List available tools
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

Expected: List of 7 YouTube tools

### 7.2 Functional Tool Test

```bash
# Test getVideoTranscript tool
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "getVideoTranscript",
      "arguments": {
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      }
    }
  }'
```

### 7.3 Error Handling Test

```bash
# Test with invalid video URL
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "getVideoTranscript",
      "arguments": {
        "url": "https://www.youtube.com/watch?v=invalid"
      }
    }
  }'
```

Expected: Structured error response

## 🚀 Step 8: Production Deployment

### 8.1 Pre-deployment Checklist

- [ ] All environment variables configured
- [ ] KV namespaces created and configured
- [ ] YouTube API key tested and working
- [ ] TypeScript compilation successful
- [ ] MCP Inspector tests passing
- [ ] Error handling verified

### 8.2 Deploy to Cloudflare Workers

```bash
# Build and deploy
npm run deploy

# Verify deployment
curl https://your-worker-subdomain.workers.dev/health
```

### 8.3 Configure Custom Domain (Optional)

```bash
# Add custom domain
wrangler domains add yourdomain.com

# Follow DNS configuration instructions
# Update CNAME record as instructed
```

## 🐛 Troubleshooting

### Common Issues

#### 1. TypeScript Compilation Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript version
npx tsc --version
```

#### 2. YouTube API Quota Issues

```bash
# Check quota usage in Google Cloud Console
# Enable quota monitoring
# Implement caching to reduce API calls
```

#### 3. KV Namespace Issues

```bash
# Verify namespace IDs in wrangler.toml
wrangler kv:namespace list

# Check binding names match code
```

#### 4. MCP Inspector Connection Issues

```bash
# Ensure server is running
curl http://localhost:8787/health

# Check CORS configuration
# Verify network connectivity
```

### Debug Mode

Enable debug logging:

```env
# In .env file
LOG_LEVEL=debug
DEBUG_MODE=true
```

### Performance Issues

```bash
# Monitor response times
curl -w "@curl-format.txt" http://localhost:8787/health

# Check cache hit rates in logs
# Optimize KV operations
```

## 📝 Next Steps

### Development Workflow

1. **Implement Additional Tools**:
   - Use `getVideoTranscript` as reference
   - Follow established patterns
   - Test with MCP Inspector

2. **Testing Strategy**:
   - Unit tests for services
   - Integration tests with MCP Inspector
   - Performance benchmarking

3. **Production Monitoring**:
   - Set up error alerting
   - Monitor API quota usage
   - Track performance metrics

### Advanced Configuration

- **Custom Caching Strategy**: Optimize TTLs for your use case
- **Rate Limiting**: Implement per-client limits
- **Security Hardening**: Add authentication and input validation
- **Monitoring**: Set up comprehensive logging and alerting

## 🔗 Additional Resources

- **[API Reference](api-reference.md)**: Complete API documentation
- **[Deployment Guide](deployment-guide.md)**: Production deployment details
- **[Development Guide](development-guide.md)**: Developer documentation
- **[MCP Inspector Testing](mcp-inspector-testing.md)**: Testing procedures

## 📞 Support

If you encounter issues:

1. **Check Logs**: Enable debug mode for detailed logging
2. **Verify Configuration**: Ensure all environment variables are set
3. **Test Components**: Isolate issues by testing individual components
4. **Documentation**: Reference API and development guides
5. **Community**: Check GitHub issues and discussions

**Setup Status**: ✅ Ready for Development | 🎯 MCP Inspector Testing Required | 🚀 Production Deployment Ready
