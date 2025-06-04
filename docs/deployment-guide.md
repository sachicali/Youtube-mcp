# Deployment Guide - YouTube Scraping MCP Server

Complete guide for deploying the YouTube Scraping MCP Server to production using Cloudflare Workers.

## 📋 Pre-Deployment Checklist

### ✅ Requirements Verification

- [ ] **Development Testing**: All tools tested locally with MCP Inspector
- [ ] **TypeScript Compilation**: Zero errors and warnings
- [ ] **Environment Configuration**: All required variables set
- [ ] **YouTube API**: Key tested and quota available
- [ ] **Cloudflare Account**: Setup with Workers plan
- [ ] **KV Namespaces**: Created and configured
- [ ] **Domain Setup**: (Optional) Custom domain configured

### 📊 Performance Verification

- [ ] **Response Times**: < 500ms for API calls, < 100ms for cached
- [ ] **Error Handling**: All error scenarios tested
- [ ] **Caching**: Multi-layer cache working correctly
- [ ] **Rate Limiting**: Quota management tested
- [ ] **Memory Usage**: Within Cloudflare Workers limits

## 🚀 Step 1: Production Environment Setup

### 1.1 Cloudflare Account Preparation

```bash
# Ensure you have the latest Wrangler CLI
npm install -g wrangler@latest

# Login to Cloudflare
wrangler login

# Verify account access
wrangler whoami
```

### 1.2 Create Production KV Namespaces

```bash
# Create production KV namespaces
wrangler kv:namespace create "CACHE" --env production
wrangler kv:namespace create "RATE_LIMITS" --env production

# Note the namespace IDs for wrangler.toml
```

Expected output:
```
🌀 Creating namespace with title "youtube-scraping-mcp-server-CACHE-production"
✅ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "CACHE", id = "abcd1234efgh5678ijkl9012mnop3456" }
```

### 1.3 Update wrangler.toml for Production

```toml
name = "youtube-scraping-mcp-server"
main = "src/index.ts"
compatibility_date = "2024-10-04"
node_compat = true

# Development environment
[env.development]
vars = { ENVIRONMENT = "development", LOG_LEVEL = "debug" }

[[env.development.kv_namespaces]]
binding = "CACHE"
id = "your-dev-cache-namespace-id"
preview_id = "your-dev-cache-preview-id"

[[env.development.kv_namespaces]]
binding = "RATE_LIMITS"
id = "your-dev-rate-limits-namespace-id"
preview_id = "your-dev-rate-limits-preview-id"

# Production environment
[env.production]
vars = { ENVIRONMENT = "production", LOG_LEVEL = "warn" }

[[env.production.kv_namespaces]]
binding = "CACHE"
id = "your-production-cache-namespace-id"

[[env.production.kv_namespaces]]
binding = "RATE_LIMITS"
id = "your-production-rate-limits-namespace-id"
```

## 🔐 Step 2: Secrets Management

### 2.1 Set Production Secrets

```bash
# Set YouTube API key for production
wrangler secret put YOUTUBE_API_KEY --env production
# Enter your production YouTube API key when prompted

# Verify secrets are set
wrangler secret list --env production
```

### 2.2 Environment Variables Configuration

Production environment variables in wrangler.toml:

```toml
[env.production.vars]
ENVIRONMENT = "production"
LOG_LEVEL = "warn"
CACHE_TTL = "86400"
MAX_RETRIES = "3"
RATE_LIMIT_PER_MINUTE = "60"
QUOTA_WARNING_THRESHOLD = "80"
ENABLE_METRICS = "true"
CORS_ALLOWED_ORIGINS = "https://yourdomain.com"
```

## 🏗️ Step 3: Build and Deploy

### 3.1 Pre-Deployment Testing

```bash
# Clean build
npm run clean
npm install

# Type checking
npm run type-check

# Build verification
npm run build

# Local testing
npm run dev
```

### 3.2 Deploy to Production

```bash
# Deploy to production environment
wrangler deploy --env production

# Expected output:
# ✅ Successfully deployed to https://youtube-scraping-mcp-server.your-subdomain.workers.dev
```

### 3.3 Verify Deployment

```bash
# Test health endpoint
curl https://your-worker-subdomain.workers.dev/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-12-06T...",
  "environment": "production",
  "services": {
    "mcp": "ready",
    "youtube": "ready",
    "cache": "ready"
  }
}
```

## 🌐 Step 4: Custom Domain Setup (Optional)

### 4.1 Add Custom Domain

```bash
# Add your custom domain
wrangler domains add yourdomain.com --env production

# Follow DNS configuration instructions
```

### 4.2 DNS Configuration

Add the following DNS records to your domain:

```
Type: CNAME
Name: api (or your preferred subdomain)
Value: youtube-scraping-mcp-server.your-subdomain.workers.dev
TTL: Auto
```

### 4.3 SSL/TLS Configuration

Cloudflare automatically provides SSL/TLS certificates for custom domains. Verify in Cloudflare Dashboard:

1. Go to **SSL/TLS** → **Overview**
2. Ensure SSL/TLS encryption mode is **Full (strict)**
3. Enable **Always Use HTTPS**

## 📊 Step 5: Production Monitoring

### 5.1 Enable Analytics

```bash
# Enable Workers Analytics
wrangler analytics --env production
```

### 5.2 Set Up Alerts

In Cloudflare Dashboard:

1. **Navigate to Notifications**
2. **Create new notification**:
   - **Type**: Workers
   - **Triggers**: Error rate > 5%, Response time > 1000ms
   - **Recipients**: Your email

### 5.3 Health Monitoring

Set up external monitoring for your health endpoints:

```bash
# Create monitoring script (monitor.sh)
#!/bin/bash
HEALTH_URL="https://yourdomain.com/health"
RESPONSE=$(curl -s -w "%{http_code}" "$HEALTH_URL")

if [[ "$RESPONSE" != *"200"* ]]; then
  echo "ALERT: Health check failed - $RESPONSE"
  # Add notification logic (email, Slack, etc.)
fi
```

## ⚡ Step 6: Performance Optimization

### 6.1 Cache Configuration

Optimize cache TTLs for production:

```toml
[env.production.vars]
MEMORY_CACHE_TTL = "300"      # 5 minutes
KV_CACHE_TTL = "3600"         # 1 hour
LONG_TERM_CACHE_TTL = "86400" # 24 hours
```

### 6.2 Rate Limiting Configuration

```toml
[env.production.vars]
RATE_LIMIT_PER_MINUTE = "100"
QUOTA_WARNING_THRESHOLD = "85"
CIRCUIT_BREAKER_THRESHOLD = "10"
CIRCUIT_BREAKER_TIMEOUT = "60000"
```

### 6.3 Performance Monitoring

Track key metrics:

- **Response times**: Target < 500ms
- **Cache hit rate**: Target > 80%
- **Error rate**: Target < 1%
- **API quota usage**: Monitor daily limits

## 🔧 Step 7: Production Configuration

### 7.1 CORS Configuration

For production API access:

```toml
[env.production.vars]
CORS_ALLOWED_ORIGINS = "https://yourdomain.com,https://app.yourdomain.com"
```

### 7.2 Security Headers

Production security configuration:

```typescript
// In src/index.ts - already implemented
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000',
};
```

### 7.3 Error Tracking

Production error handling:

```toml
[env.production.vars]
ERROR_NOTIFICATION_THRESHOLD = "5"
ENABLE_ERROR_TRACKING = "true"
```

## 🚨 Step 8: Deployment Verification

### 8.1 Functional Testing

Test all MCP tools in production:

```bash
# Test getVideoTranscript tool
curl -X POST https://yourdomain.com \
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

### 8.2 Load Testing

Basic load testing:

```bash
# Install Apache Bench (if not available)
# brew install httpie (on macOS)

# Test with 100 concurrent requests
ab -n 1000 -c 100 https://yourdomain.com/health
```

### 8.3 MCP Inspector Production Testing

```bash
# Connect MCP Inspector to production
mcp-inspector

# Use production URL: https://yourdomain.com
# Test all available tools
# Verify response times and error handling
```

## 📈 Step 9: Scaling Considerations

### 9.1 Quota Management

Monitor YouTube API quota usage:

```bash
# Check quota usage in Google Cloud Console
# Set up quota alerts at 80% usage
# Implement quota-aware caching
```

### 9.2 KV Storage Optimization

```bash
# Monitor KV usage
wrangler kv:key list --binding CACHE --env production

# Implement TTL optimization based on usage patterns
# Consider KV storage costs for high-volume usage
```

### 9.3 Geographic Distribution

Cloudflare Workers automatically distribute globally, but consider:

- **Regional API keys**: For YouTube API if needed
- **Data locality**: For compliance requirements
- **Cache warming**: For frequently accessed content

## 🔄 Step 10: Maintenance & Updates

### 10.1 Deployment Pipeline

Create automated deployment:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type checking
        run: npm run type-check
      
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          environment: 'production'
```

### 10.2 Rollback Strategy

```bash
# View deployment history
wrangler deployments list --env production

# Rollback to previous version if needed
wrangler rollback --env production
```

### 10.3 Update Procedures

1. **Test in development** environment first
2. **Deploy to staging** environment (if available)
3. **Monitor metrics** after deployment
4. **Rollback if issues** detected
5. **Update documentation** as needed

## 🐛 Troubleshooting

### Common Deployment Issues

#### 1. KV Namespace Errors

```bash
# Verify namespace IDs
wrangler kv:namespace list

# Check binding names in wrangler.toml
# Ensure IDs match between environments
```

#### 2. Secret Configuration

```bash
# List all secrets
wrangler secret list --env production

# Update secrets if needed
wrangler secret put YOUTUBE_API_KEY --env production
```

#### 3. CORS Issues

```bash
# Check CORS configuration in environment variables
# Verify allowed origins match your domain
# Test with browser developer tools
```

#### 4. Performance Issues

```bash
# Monitor with Cloudflare Analytics
# Check cache hit rates
# Verify API quota usage
# Monitor error rates
```

### Debugging Production Issues

Enable debug mode temporarily:

```bash
# Update environment variable
wrangler secret put DEBUG_MODE --env production
# Set to "true" for debugging, remember to disable after

# Monitor logs
wrangler tail --env production
```

## 📞 Support & Monitoring

### Health Check Endpoints

- **Basic Health**: `GET /health`
- **API Status**: `GET /health/api`
- **Cache Status**: `GET /health/cache`

### Monitoring Dashboard

Create monitoring dashboard with:

- **Response times** (target: < 500ms)
- **Error rates** (target: < 1%)
- **API quota usage** (daily limit: 10,000)
- **Cache hit rates** (target: > 80%)
- **Worker invocations** per day

### Alert Thresholds

Set up alerts for:

- Error rate > 5%
- Response time > 1000ms
- API quota > 90%
- Cache hit rate < 60%

## 🎯 Production Checklist

- [ ] **Deployment successful** with zero errors
- [ ] **Health endpoints** responding correctly
- [ ] **All MCP tools** functional in production
- [ ] **Custom domain** configured (if applicable)
- [ ] **SSL/TLS** certificates active
- [ ] **Monitoring** and alerts configured
- [ ] **Performance** metrics within targets
- [ ] **Security headers** enabled
- [ ] **Error tracking** operational
- [ ] **Backup procedures** documented

---

**Deployment Status**: 🚀 Production Ready | ⚡ Performance Optimized | 🛡️ Security Hardened | 📊 Monitoring Enabled