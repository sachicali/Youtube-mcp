# YouTube Scraping MCP Server - Project Brief

## Project Overview
Building a production-ready YouTube Scraping MCP Server that provides YouTube analytics, transcript extraction, channel analysis, and trend detection capabilities through the Model Context Protocol.

## Core Requirements

### Primary Features
1. **Transcript Gathering**: Extract transcripts from YouTube videos using yt-dlp
2. **Video Analytics**: Gather views and statistical metrics
3. **Channel Analysis**: Analyze last 10 videos comparatively to find highest performing video
4. **Performance Analysis**: Rationalize why certain videos are high performers
5. **Competitive Analysis**: Compare with competitor channels using same 10-video analysis cycle
6. **Keyword Research**: Search for specific keywords in content to identify trends
7. **Trend Detection**: Determine if topics/keywords are trending

### Technical Requirements
- TypeScript with strong typing (avoid 'any', 'unknown', 'undefined')
- Cloudflare Workers deployment for edge computing
- yt-dlp for transcript extraction
- YouTube Data API v3 for metrics (10,000 units/day quota)
- Exponential backoff retry strategy
- Modular architecture: Services, Controllers, Utils, Types in separate folders
- MCP Inspector integration for testing

### MCP Tools to Implement
1. `getVideoTranscript` - Extract transcript from YouTube video
2. `getVideoAnalytics` - Get video metrics and statistics  
3. `analyzeChannelPerformance` - Analyze last 10 videos from channel
4. `findTopPerformingVideo` - Identify highest performing video with rationale
5. `compareWithCompetitors` - Compare channel with competitor analysis
6. `searchKeywordsInContent` - Search for keywords in video content
7. `detectTrendingTopics` - Identify trending topics and keywords

## Success Criteria
- Performance: < 500ms response time for cached requests
- Reliability: 99.9% uptime with proper error handling
- Scalability: Handle 1000+ requests/hour within quota limits
- Maintainability: Modular architecture with clear separation of concerns
- Usability: Comprehensive MCP tool integration with Claude/Cline

## Confidence Rating: 9/10