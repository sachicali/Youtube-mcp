# MCP Inspector Testing Guide - YouTube Scraping MCP Server

Complete guide for testing the YouTube Scraping MCP Server using MCP Inspector.

## 📋 Overview

MCP Inspector is the official testing tool for Model Context Protocol servers. This guide covers installation, configuration, and comprehensive testing procedures for all MCP tools.

## 🔧 Installation & Setup

### 1.1 Install MCP Inspector

```bash
# Install globally via npm
npm install -g @modelcontextprotocol/inspector

# Verify installation
mcp-inspector --version

# Expected output: @modelcontextprotocol/inspector v0.x.x
```

### 1.2 Alternative Installation Methods

```bash
# Using pnpm
pnpm add -g @modelcontextprotocol/inspector

# Using yarn
yarn global add @modelcontextprotocol/inspector

# Using npx (no installation required)
npx @modelcontextprotocol/inspector
```

### 1.3 Prerequisites

- **Node.js**: 18.0+
- **MCP Server**: Running on `http://localhost:8787`
- **YouTube API Key**: Configured in environment
- **Network Access**: Unrestricted internet connection

## 🚀 Quick Start Testing

### 2.1 Start Your MCP Server

```bash
# Navigate to project directory
cd youtube-scraping-mcp-server

# Ensure environment is configured
cp .env.example .env
# Edit .env with your YouTube API key

# Start development server
npm run dev

# Verify server is running
curl http://localhost:8787/health
```

### 2.2 Launch MCP Inspector

```bash
# Start MCP Inspector
mcp-inspector

# Server will start on http://localhost:3000
# Browser should open automatically
```

### 2.3 Connect to Your MCP Server

1. **Open MCP Inspector** in browser: `http://localhost:3000`
2. **Server URL**: Enter `http://localhost:8787`
3. **Protocol**: Ensure "JSON-RPC 2.0" is selected
4. **Click "Connect"**

Expected success indicators:
- ✅ Connection status shows "Connected"
- ✅ Server info displays project details
- ✅ Tools list shows 7 available tools

## 🛠️ Tool Testing Procedures

### 3.1 Test getVideoTranscript ✅ Functional

**Purpose**: Verify transcript extraction functionality

**Input Data**:
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Test Steps**:
1. Select **"getVideoTranscript"** from tools list
2. Enter the input JSON in the arguments field
3. Click **"Execute Tool"**
4. Wait for response (should be < 5 seconds)

**Expected Success Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Video Transcript:\n\nTitle: Never Gonna Give You Up\nDuration: 3:33\nLanguage: en\n\n[00:00] Never gonna give you up..."
    }
  ]
}
```

**Success Criteria**:
- ✅ Response time < 5 seconds
- ✅ Content type is "text"
- ✅ Transcript includes timestamps
- ✅ Video title and duration present
- ✅ No error messages

**Alternative Test URLs**:
```json
// Different URL formats
{"url": "https://youtu.be/dQw4w9WgXcQ"}
{"url": "https://www.youtube.com/shorts/dQw4w9WgXcQ"}
{"url": "https://m.youtube.com/watch?v=dQw4w9WgXcQ"}

// With language preference
{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "language": "en"}
```

### 3.2 Test Error Handling

**Purpose**: Verify graceful error handling

**Invalid URL Test**:
```json
{
  "url": "https://www.youtube.com/watch?v=invalid123"
}
```

**Expected Error Response**:
```json
{
  "error": {
    "code": -32004,
    "message": "Video not found",
    "data": {
      "videoId": "invalid123",
      "details": "Video may be private, deleted, or never existed"
    }
  }
}
```

**Malformed URL Test**:
```json
{
  "url": "not-a-valid-url"
}
```

**Expected Validation Error**:
```json
{
  "error": {
    "code": -32001,
    "message": "Input validation failed",
    "data": {
      "field": "url",
      "value": "not-a-valid-url",
      "expected": "Valid YouTube URL"
    }
  }
}
```

### 3.3 Test Remaining Tools (Ready for Implementation)

#### getVideoAnalytics

**Test Input**:
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "metrics": ["views", "likes", "comments"]
}
```

**Expected Behavior**: Tool should be registered but return implementation pending message

#### analyzeChannelPerformance

**Test Input**:
```json
{
  "channelUrl": "https://www.youtube.com/@rickastleyofficial",
  "videoCount": 5
}
```

#### findTopPerformingVideo

**Test Input**:
```json
{
  "channelUrl": "https://www.youtube.com/@rickastleyofficial",
  "timeframe": "30d"
}
```

#### compareWithCompetitors

**Test Input**:
```json
{
  "channelUrl": "https://www.youtube.com/@rickastleyofficial",
  "competitorUrls": ["https://www.youtube.com/@anotherartist"]
}
```

#### searchKeywordsInContent

**Test Input**:
```json
{
  "keywords": ["music", "80s"],
  "searchScope": "all",
  "limit": 10
}
```

#### detectTrendingTopics

**Test Input**:
```json
{
  "category": "music",
  "timeframe": "7d",
  "region": "US"
}
```

## 📊 Performance Testing

### 4.1 Response Time Testing

**Cached Content Test**:
1. Execute `getVideoTranscript` with same URL twice
2. First call: Should complete within 5 seconds
3. Second call: Should complete within 1 second (cached)

**Benchmarking**:
```bash
# Use browser developer tools
# Network tab should show:
# - First request: ~2-5 seconds
# - Cached request: ~100-500ms
```

### 4.2 Load Testing

**Concurrent Requests**:
1. Open multiple MCP Inspector tabs
2. Execute same tool simultaneously
3. Verify all requests complete successfully
4. Check for rate limiting behavior

### 4.3 Memory Usage Monitoring

```bash
# Monitor server performance
# Check Cloudflare Workers metrics
# Verify memory usage stays within limits
```

## 🔍 Advanced Testing

### 5.1 MCP Protocol Compliance

**Initialize Connection Test**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "0.1.0",
    "capabilities": {},
    "clientInfo": {
      "name": "mcp-inspector",
      "version": "1.0.0"
    }
  }
}
```

**List Tools Test**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

**Expected Tools Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "getVideoTranscript",
        "description": "Extract transcript from YouTube video",
        "inputSchema": { /* ... */ }
      }
      // ... 6 more tools
    ]
  }
}
```

### 5.2 Schema Validation Testing

**Valid Input Test**:
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "language": "en"
}
```

**Invalid Input Tests**:
```json
// Missing required field
{}

// Wrong data type
{"url": 123}

// Invalid enum value
{"url": "valid-url", "language": "invalid-lang-code"}
```

### 5.3 Edge Cases Testing

**Private Video**:
```json
{
  "url": "https://www.youtube.com/watch?v=private_video_id"
}
```

**Age-Restricted Video**:
```json
{
  "url": "https://www.youtube.com/watch?v=age_restricted_id"
}
```

**Very Long URL**:
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=123&list=playlist&extra=params"
}
```

## 🐛 Troubleshooting

### 6.1 Connection Issues

**Problem**: Cannot connect to MCP server

**Solutions**:
```bash
# Check server is running
curl http://localhost:8787/health

# Verify port is correct
netstat -an | grep 8787

# Check firewall/proxy settings
# Ensure localhost:8787 is accessible
```

**Problem**: CORS errors in browser

**Solutions**:
```bash
# Check CORS configuration in server
# Verify browser security settings
# Try different browser or incognito mode
```

### 6.2 Tool Execution Issues

**Problem**: Tool returns error

**Debugging Steps**:
1. Check server logs: `npm run dev` (watch console output)
2. Verify API key is set: Check environment variables
3. Test with curl: Direct API call to validate
4. Check quota usage: Google Cloud Console

**Problem**: Slow response times

**Solutions**:
```bash
# Check internet connection
# Verify YouTube API quota
# Monitor server performance
# Clear browser cache
```

### 6.3 Response Format Issues

**Problem**: Unexpected response format

**Validation**:
```json
// All responses should follow MCP format
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "..."
      }
    ]
  }
}
```

## 📋 Testing Checklist

### Pre-Testing Setup
- [ ] MCP Inspector installed and working
- [ ] MCP Server running on localhost:8787
- [ ] YouTube API key configured
- [ ] Internet connection stable
- [ ] Browser developer tools available

### Protocol Testing
- [ ] Server connection successful
- [ ] Initialize method works
- [ ] Tools list returns 7 tools
- [ ] JSON-RPC 2.0 compliance verified

### Functional Testing
- [ ] getVideoTranscript works with valid URL
- [ ] Error handling for invalid URLs
- [ ] Schema validation working
- [ ] Response format is correct
- [ ] Performance within targets

### Error Testing
- [ ] Invalid URL handling
- [ ] Malformed JSON handling
- [ ] Network error simulation
- [ ] Quota exceeded simulation
- [ ] Rate limiting behavior

### Performance Testing
- [ ] First request < 5 seconds
- [ ] Cached request < 1 second
- [ ] Concurrent requests work
- [ ] Memory usage acceptable

### Edge Cases
- [ ] Private video handling
- [ ] Age-restricted content
- [ ] Very long URLs
- [ ] Special characters in URLs
- [ ] Different URL formats

## 📊 Test Report Template

```markdown
# MCP Inspector Test Report

**Date**: YYYY-MM-DD
**Tester**: Your Name
**Server Version**: v1.0.0
**Inspector Version**: v0.x.x

## Summary
- **Total Tests**: X
- **Passed**: X
- **Failed**: X
- **Performance**: ✅/❌

## Functional Tests
- getVideoTranscript: ✅/❌
- Error Handling: ✅/❌
- Schema Validation: ✅/❌

## Performance Results
- Average Response Time: Xms
- Cache Hit Rate: X%
- Concurrent Requests: X successful

## Issues Found
1. Issue description
2. Another issue

## Recommendations
1. Recommendation 1
2. Recommendation 2
```

## 🔗 Additional Resources

- **[MCP Specification](https://spec.modelcontextprotocol.io/)**: Official protocol documentation
- **[Setup Guide](setup-guide.md)**: Initial configuration
- **[API Reference](api-reference.md)**: Complete API documentation
- **[Development Guide](development-guide.md)**: Developer information

---

**Testing Status**: ✅ MCP Inspector Ready | 🧪 1/7 Tools Testable | 📊 Performance Metrics Available | 🔍 Error Scenarios Covered