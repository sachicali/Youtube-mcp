/**
 * Tool Registry Utility
 * 
 * Manages MCP tool registration, discovery, validation, and execution
 * with comprehensive error handling and logging.
 */

import type { 
  MCPTool, 
  MCPToolResponse, 
  MCPContext, 
  MCPToolRegistry,
  MCPToolExecutionResult,
  MCPValidationResult,
  MCPErrorCode,
  JSONSchema
} from '@/types/mcp.types';
import { MCPErrorCodes } from '@/types/mcp.types';
import type { ConfigurationService } from '@/services/configuration.service';
import type { LoggerUtil } from '@/utils/logger.util';

export class ToolRegistryUtil implements MCPToolRegistry {
  private tools: Map<string, MCPTool> = new Map();
  private config: ConfigurationService;
  private logger: LoggerUtil;
  private initialized: boolean = false;

  constructor(config: ConfigurationService, logger: LoggerUtil) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Initialize the tool registry
   */
  async initialize(): Promise<void> {
    try {
      // Register built-in tools
      await this.registerBuiltInTools();
      
      this.initialized = true;
      this.logger.info('Tool registry initialized', {
        toolCount: this.tools.size,
        tools: Array.from(this.tools.keys()),
      });
    } catch (error) {
      this.logger.error('Failed to initialize tool registry', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Register a new tool
   */
  register(tool: MCPTool): void {
    // Validate tool definition
    const validation = this.validateTool(tool);
    if (!validation.valid) {
      const errorMessage = validation.errors.map(e => e.message).join(', ');
      throw new Error(`Invalid tool definition: ${errorMessage}`);
    }

    // Check for existing tool with same name
    if (this.tools.has(tool.name)) {
      this.logger.warn('Overwriting existing tool', { toolName: tool.name });
    }

    this.tools.set(tool.name, tool);
    this.logger.info('Tool registered', {
      toolName: tool.name,
      description: tool.description,
    });
  }

  /**
   * Unregister a tool
   */
  unregister(toolName: string): boolean {
    const existed = this.tools.has(toolName);
    this.tools.delete(toolName);
    
    if (existed) {
      this.logger.info('Tool unregistered', { toolName });
    }
    
    return existed;
  }

  /**
   * Get a specific tool
   */
  get(toolName: string): MCPTool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * List all registered tools
   */
  list(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Check if a tool exists
   */
  has(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Clear all tools
   */
  clear(): void {
    const toolCount = this.tools.size;
    this.tools.clear();
    this.logger.info('All tools cleared', { clearedCount: toolCount });
  }

  /**
   * Get tool count
   */
  count(): number {
    return this.tools.size;
  }

  /**
   * Get registered tool count (alias for external interface)
   */
  getRegisteredToolCount(): number {
    return this.tools.size;
  }

  /**
   * List tools for MCP response
   */
  listTools(): Array<{ name: string; description: string; inputSchema: JSONSchema }> {
    return this.list().map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * Execute a tool with comprehensive error handling
   */
  async executeTool(
    toolName: string, 
    input: unknown, 
    context: MCPContext
  ): Promise<MCPToolResponse> {
    const startTime = Date.now();
    
    this.logger.info('Executing tool', {
      toolName,
      requestId: context.requestId,
      userId: context.auth?.userId,
    });

    try {
      // Check if tool exists
      const tool = this.tools.get(toolName);
      if (!tool) {
        throw new ToolNotFoundError(`Tool '${toolName}' not found`);
      }

      // Validate input against schema
      const validation = this.validateInput(tool.inputSchema, input);
      if (!validation.valid) {
        const errorMessage = validation.errors.map(e => `${e.path}: ${e.message}`).join(', ');
        throw new ValidationError(`Input validation failed: ${errorMessage}`);
      }

      // Execute the tool
      const result = await tool.handler(input, context);
      
      const executionTime = Date.now() - startTime;
      this.logger.info('Tool executed successfully', {
        toolName,
        executionTime,
        requestId: context.requestId,
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      this.logger.error('Tool execution failed', {
        toolName,
        executionTime,
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Convert error to MCP format
      if (error instanceof ToolNotFoundError) {
        throw new MCPToolError(MCPErrorCodes.TOOL_NOT_FOUND, error.message);
      }
      
      if (error instanceof ValidationError) {
        throw new MCPToolError(MCPErrorCodes.VALIDATION_FAILED, error.message);
      }

      if (error instanceof MCPToolError) {
        throw error;
      }

      // Generic error
      throw new MCPToolError(
        MCPErrorCodes.INTERNAL_ERROR,
        `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate tool definition
   */
  private validateTool(tool: MCPTool): MCPValidationResult {
    const errors: Array<{ path: string; message: string; code: string }> = [];

    // Validate name
    if (!tool.name || typeof tool.name !== 'string') {
      errors.push({
        path: 'name',
        message: 'Tool name is required and must be a string',
        code: 'MISSING_NAME',
      });
    } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(tool.name)) {
      errors.push({
        path: 'name',
        message: 'Tool name must start with a letter and contain only letters, numbers, and underscores',
        code: 'INVALID_NAME',
      });
    }

    // Validate description
    if (!tool.description || typeof tool.description !== 'string') {
      errors.push({
        path: 'description',
        message: 'Tool description is required and must be a string',
        code: 'MISSING_DESCRIPTION',
      });
    }

    // Validate input schema
    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
      errors.push({
        path: 'inputSchema',
        message: 'Tool input schema is required and must be a valid JSON Schema',
        code: 'MISSING_SCHEMA',
      });
    }

    // Validate handler
    if (!tool.handler || typeof tool.handler !== 'function') {
      errors.push({
        path: 'handler',
        message: 'Tool handler is required and must be a function',
        code: 'MISSING_HANDLER',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate input against JSON Schema
   */
  private validateInput(schema: JSONSchema, input: unknown): MCPValidationResult {
    const errors: Array<{ path: string; message: string; code: string }> = [];

    try {
      // Basic type validation
      if (schema.type) {
        const actualType = this.getJSONType(input);
        if (schema.type !== actualType) {
          errors.push({
            path: '',
            message: `Expected type '${schema.type}', got '${actualType}'`,
            code: 'TYPE_MISMATCH',
          });
        }
      }

      // Required properties validation
      if (schema.type === 'object' && schema.required && typeof input === 'object' && input !== null) {
        const obj = input as Record<string, unknown>;
        for (const requiredProp of schema.required) {
          if (!(requiredProp in obj)) {
            errors.push({
              path: requiredProp,
              message: `Required property '${requiredProp}' is missing`,
              code: 'MISSING_PROPERTY',
            });
          }
        }
      }

      // Enum validation
      if (schema.enum && !schema.enum.includes(input)) {
        errors.push({
          path: '',
          message: `Value must be one of: ${schema.enum.map(v => JSON.stringify(v)).join(', ')}`,
          code: 'ENUM_VIOLATION',
        });
      }

      // String length validation
      if (schema.type === 'string' && typeof input === 'string') {
        if (schema.minLength !== undefined && input.length < schema.minLength) {
          errors.push({
            path: '',
            message: `String length must be at least ${schema.minLength}`,
            code: 'MIN_LENGTH',
          });
        }
        if (schema.maxLength !== undefined && input.length > schema.maxLength) {
          errors.push({
            path: '',
            message: `String length must be at most ${schema.maxLength}`,
            code: 'MAX_LENGTH',
          });
        }
      }

      // Number range validation
      if (schema.type === 'number' && typeof input === 'number') {
        if (schema.minimum !== undefined && input < schema.minimum) {
          errors.push({
            path: '',
            message: `Number must be at least ${schema.minimum}`,
            code: 'MIN_VALUE',
          });
        }
        if (schema.maximum !== undefined && input > schema.maximum) {
          errors.push({
            path: '',
            message: `Number must be at most ${schema.maximum}`,
            code: 'MAX_VALUE',
          });
        }
      }

    } catch (error) {
      errors.push({
        path: '',
        message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
        code: 'VALIDATION_ERROR',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get JSON type of a value
   */
  private getJSONType(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * Calculate consistency score based on video performance variance
   */
  private calculateConsistencyScore(videos: Array<{ performanceScore: number }>): number {
    if (videos.length < 2) return 100;
    
    const scores = videos.map(v => v.performanceScore);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Convert to consistency score (lower deviation = higher consistency)
    // Normalize to 0-100 scale where 100 is perfect consistency
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;
    const consistencyScore = Math.max(0, 100 - (coefficientOfVariation * 100));
    
    return Math.round(consistencyScore * 100) / 100;
  }

  /**
   * Parse ISO 8601 duration to seconds
   */
  private parseDurationToSeconds(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Identify channel strengths based on performance metrics
   */
  private identifyChannelStrengths(
    avgViews: number,
    avgEngagement: number,
    subscriberEngagementRate: number,
    videosPerWeek: number
  ): string[] {
    const strengths: string[] = [];
    
    if (avgViews > 100000) strengths.push('High viewership');
    if (avgEngagement > 5) strengths.push('Excellent engagement');
    else if (avgEngagement > 3) strengths.push('Good engagement');
    
    if (subscriberEngagementRate > 50) strengths.push('Strong subscriber loyalty');
    else if (subscriberEngagementRate > 20) strengths.push('Good subscriber engagement');
    
    if (videosPerWeek > 3) strengths.push('High content frequency');
    else if (videosPerWeek > 1) strengths.push('Consistent content schedule');
    
    if (strengths.length === 0) strengths.push('Growth opportunity');
    
    return strengths;
  }

  /**
   * Analyze engagement distribution across videos
   */
  private analyzeEngagementDistribution(videoMetrics: Array<{ engagementScore: number; viewCount: number }>): {
    high: number;
    medium: number;
    low: number;
    averageEngagement: number;
  } {
    let high = 0, medium = 0, low = 0;
    const totalEngagement = videoMetrics.reduce((sum, v) => sum + v.engagementScore, 0);
    
    videoMetrics.forEach(video => {
      if (video.engagementScore > 5) high++;
      else if (video.engagementScore > 2) medium++;
      else low++;
    });
    
    return {
      high,
      medium,
      low,
      averageEngagement: videoMetrics.length > 0 ?
        Math.round((totalEngagement / videoMetrics.length) * 10000) / 10000 : 0,
    };
  }

  /**
   * Perform competitive comparison between channels
   */
  private performCompetitiveComparison(channelAnalyses: Array<any>): {
    leader: any;
    rankings: Array<{ rank: number; channel: any; score: number }>;
    insights: string[];
  } {
    const validChannels = channelAnalyses.filter(c => !c.error && c.performance);
    
    if (validChannels.length === 0) {
      return {
        leader: null,
        rankings: [],
        insights: ['No valid channels to compare'],
      };
    }
    
    // Calculate competitive scores
    const scoredChannels = validChannels.map(channel => {
      const perf = channel.performance;
      
      // Weighted scoring: views (40%), engagement (30%), consistency (20%), frequency (10%)
      const viewScore = Math.min(perf.averageViews / 100000 * 40, 40);
      const engagementScore = Math.min(perf.averageEngagementRate * 6, 30);
      const consistencyScore = channel.engagementAnalysis ?
        (channel.engagementAnalysis.consistency / 100) * 20 : 10;
      const frequencyScore = Math.min(perf.videosPerWeek * 2, 10);
      
      const totalScore = viewScore + engagementScore + consistencyScore + frequencyScore;
      
      return {
        channel,
        score: Math.round(totalScore * 100) / 100,
      };
    });
    
    // Sort by score descending
    scoredChannels.sort((a, b) => b.score - a.score);
    
    const rankings = scoredChannels.map((item, index) => ({
      rank: index + 1,
      channel: item.channel,
      score: item.score,
    }));
    
    const leader = rankings[0];
    
    // Generate insights
    const insights: string[] = [];
    
    if (leader) {
      insights.push(`${leader.channel.channel.title} leads with a score of ${leader.score}`);
      
      const topPerformer = validChannels.reduce((prev, curr) =>
        prev.performance.averageViews > curr.performance.averageViews ? prev : curr
      );
      insights.push(`Highest average views: ${topPerformer.channel.title} (${topPerformer.performance.averageViews.toLocaleString()})`);
      
      const mostEngaged = validChannels.reduce((prev, curr) =>
        prev.performance.averageEngagementRate > curr.performance.averageEngagementRate ? prev : curr
      );
      insights.push(`Best engagement rate: ${mostEngaged.channel.title} (${mostEngaged.performance.averageEngagementRate}%)`);
      
      const mostConsistent = validChannels.reduce((prev, curr) =>
        prev.performance.videosPerWeek > curr.performance.videosPerWeek ? prev : curr
      );
      insights.push(`Most consistent publisher: ${mostConsistent.channel.title} (${mostConsistent.performance.videosPerWeek} videos/week)`);
    }
    
    return {
      leader: leader ? leader.channel : null,
      rankings,
      insights,
    };
  }

  /**
   * Format seconds to readable time format
   */
  private formatSecondsToTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Analyze keyword matches in video content
   */
  private analyzeKeywordMatches(
    keywords: string[],
    title: string,
    description: string,
    tags: string[]
  ): {
    foundKeywords: string[];
    titleMatches: number;
    descriptionMatches: number;
    tagMatches: number;
    relevanceScore: number;
  } {
    const foundKeywords: string[] = [];
    let titleMatches = 0;
    let descriptionMatches = 0;
    let tagMatches = 0;

    const titleLower = title.toLowerCase();
    const descriptionLower = description.toLowerCase();
    const tagsLower = tags.map(tag => tag.toLowerCase());

    keywords.forEach((keyword: string) => {
      const keywordLower = keyword.toLowerCase();
      let found = false;

      // Check title
      if (titleLower.includes(keywordLower)) {
        titleMatches++;
        found = true;
      }

      // Check description
      if (descriptionLower.includes(keywordLower)) {
        descriptionMatches++;
        found = true;
      }

      // Check tags
      if (tagsLower.some(tag => tag.includes(keywordLower))) {
        tagMatches++;
        found = true;
      }

      if (found) {
        foundKeywords.push(keyword);
      }
    });

    // Calculate relevance score (weighted: title=50%, description=30%, tags=20%)
    const maxPossibleMatches = keywords.length;
    const titleScore = maxPossibleMatches > 0 ? (titleMatches / maxPossibleMatches) * 50 : 0;
    const descriptionScore = maxPossibleMatches > 0 ? (descriptionMatches / maxPossibleMatches) * 30 : 0;
    const tagScore = maxPossibleMatches > 0 ? (tagMatches / maxPossibleMatches) * 20 : 0;
    
    const relevanceScore = titleScore + descriptionScore + tagScore;

    return {
      foundKeywords,
      titleMatches,
      descriptionMatches,
      tagMatches,
      relevanceScore: Math.round(relevanceScore * 100) / 100,
    };
  }

  /**
   * Generate insights from keyword search results
   */
  private generateKeywordSearchInsights(
    keywords: string[],
    keywordStats: Record<string, { count: number; videos: string[] }>,
    results: Array<any>
  ): {
    topKeyword: string | null;
    averageRelevanceScore: number;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    
    // Find most popular keyword
    let topKeyword: string | null = null;
    let maxCount = 0;
    
    Object.entries(keywordStats).forEach(([keyword, stats]) => {
      if (stats.count > maxCount) {
        maxCount = stats.count;
        topKeyword = keyword;
      }
    });

    // Calculate average relevance score
    const totalRelevance = results.reduce((sum, result) => sum + result.keywordAnalysis.relevanceScore, 0);
    const averageRelevanceScore = results.length > 0 ?
      Math.round((totalRelevance / results.length) * 100) / 100 : 0;

    // Generate recommendations
    if (results.length === 0) {
      recommendations.push('No results found. Try broader keywords or different search terms.');
    } else {
      if (averageRelevanceScore < 30) {
        recommendations.push('Low relevance scores detected. Consider refining your keywords for better matches.');
      }
      
      if (topKeyword) {
        recommendations.push(`"${topKeyword}" appears most frequently in search results (${maxCount} videos).`);
      }
      
      const highRelevanceVideos = results.filter(r => r.keywordAnalysis.relevanceScore > 70).length;
      if (highRelevanceVideos > 0) {
        recommendations.push(`${highRelevanceVideos} video(s) show high keyword relevance (>70%).`);
      }
      
      // Suggest content opportunities
      const underrepresentedKeywords = keywords.filter(k => keywordStats[k.toLowerCase()].count < 2);
      if (underrepresentedKeywords.length > 0) {
        recommendations.push(`Content opportunity: Keywords "${underrepresentedKeywords.join('", "')}" have limited coverage.`);
      }
    }

    return {
      topKeyword,
      averageRelevanceScore,
      recommendations,
    };
  }

  /**
   * Extract topics from text content
   */
  private extractTopicsFromText(text: string): string[] {
    const topics: string[] = [];
    const lowerText = text.toLowerCase();
    
    // Common YouTube topic keywords
    const topicKeywords = [
      'gaming', 'music', 'tech', 'technology', 'ai', 'tutorial', 'review', 'unboxing',
      'cooking', 'fitness', 'workout', 'travel', 'vlog', 'comedy', 'news', 'politics',
      'sports', 'education', 'science', 'health', 'beauty', 'fashion', 'diy', 'art',
      'crypto', 'blockchain', 'investing', 'business', 'startup', 'productivity',
      'motivation', 'lifestyle', 'food', 'recipe', 'movie', 'film', 'tv', 'anime',
      'minecraft', 'fortnite', 'valorant', 'league', 'pokemon', 'react', 'javascript',
      'python', 'coding', 'programming', 'web', 'mobile', 'app', 'ios', 'android'
    ];
    
    topicKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        topics.push(keyword);
      }
    });
    
    return [...new Set(topics)]; // Remove duplicates
  }

  /**
   * Generate trend predictions and recommendations
   */
  private generateTrendPredictions(
    topTopics: Array<{ topic: string; frequency: number }>,
    durationPatterns: { short: number; medium: number; long: number },
    bestPublishHours: Array<{ hour: number; videoCount: number }>,
    trendingVideos: Array<any>
  ): string[] {
    const predictions: string[] = [];
    
    // Topic-based predictions
    if (topTopics.length > 0) {
      const dominantTopic = topTopics[0];
      predictions.push(`"${dominantTopic.topic}" is currently trending with ${dominantTopic.frequency} videos in top results.`);
      
      if (topTopics.length > 1) {
        predictions.push(`Emerging topics: ${topTopics.slice(1, 3).map(t => t.topic).join(', ')}`);
      }
    }
    
    // Duration-based predictions
    const totalVideos = durationPatterns.short + durationPatterns.medium + durationPatterns.long;
    if (totalVideos > 0) {
      const shortPercentage = (durationPatterns.short / totalVideos) * 100;
      const mediumPercentage = (durationPatterns.medium / totalVideos) * 100;
      
      if (shortPercentage > 60) {
        predictions.push('Short-form content (<5min) is dominating trending videos. Consider creating bite-sized content.');
      } else if (mediumPercentage > 50) {
        predictions.push('Medium-form content (5-20min) shows strong performance. Detailed tutorials and reviews are trending.');
      } else {
        predictions.push('Long-form content (>20min) is performing well. In-depth analysis and comprehensive guides are valued.');
      }
    }
    
    // Timing predictions
    if (bestPublishHours.length > 0) {
      const topHour = bestPublishHours[0];
      predictions.push(`Optimal publish time: ${topHour.hour}:00 UTC (${topHour.videoCount} trending videos published at this hour).`);
    }
    
    // Engagement predictions
    const highEngagementVideos = trendingVideos.filter(v => v.statistics.engagementRate > 5).length;
    if (highEngagementVideos > trendingVideos.length * 0.3) {
      predictions.push('High engagement rates (>5%) are common in trending content. Focus on community interaction.');
    }
    
    return predictions;
  }

  /**
   * Identify content opportunity based on analysis
   */
  private identifyContentOpportunity(
    topTopics: Array<{ topic: string; frequency: number }>,
    durationPatterns: { short: number; medium: number; long: number }
  ): string {
    if (topTopics.length === 0) {
      return 'Diverse content landscape - opportunity for niche specialization';
    }
    
    const totalDuration = durationPatterns.short + durationPatterns.medium + durationPatterns.long;
    const dominantFormat = totalDuration > 0 ?
      (durationPatterns.short > Math.max(durationPatterns.medium, durationPatterns.long) ? 'short' :
       durationPatterns.medium > durationPatterns.long ? 'medium' : 'long') : 'unknown';
    
    const dominantTopic = topTopics[0].topic;
    
    return `${dominantFormat}-form ${dominantTopic} content shows strong trending potential`;
  }

  /**
   * Generate trend insights from analysis data
   */
  private generateTrendInsights(
    sortedTrends: Array<any>,
    trendingKeywords: Array<{ keyword: string; frequency: number }>,
    category?: string,
    timeframe?: string
  ): string[] {
    const insights: string[] = [];
    
    if (sortedTrends.length === 0) {
      insights.push('No significant trends detected in the current timeframe.');
      return insights;
    }

    // Top trend analysis
    const topTrend = sortedTrends[0];
    insights.push(`Highest trending video: "${topTrend.video.title}" (trend score: ${topTrend.metrics.trendScore})`);

    // Keyword analysis
    if (trendingKeywords.length > 0) {
      const topKeyword = trendingKeywords[0];
      insights.push(`Most frequent trending keyword: "${topKeyword.keyword}" (appears in ${topKeyword.frequency} videos)`);
    }

    // Engagement insights
    const highEngagementTrends = sortedTrends.filter(t => t.metrics.engagementRate > 5);
    if (highEngagementTrends.length > 0) {
      insights.push(`${highEngagementTrends.length} trending videos show high engagement (>5%)`);
    }

    // Recency insights
    const recentTrends = sortedTrends.filter(t => t.metrics.daysSincePublished <= 3);
    if (recentTrends.length > sortedTrends.length * 0.5) {
      insights.push('Most trends are very recent (within 3 days) - indicating rapid viral spread');
    }

    // Category-specific insights
    if (category) {
      insights.push(`${category} category shows strong trending activity in the ${timeframe} timeframe`);
    }

    return insights;
  }

  /**
   * Generate trend recommendations
   */
  private generateTrendRecommendations(
    trendingKeywords: Array<{ keyword: string; frequency: number }>,
    emergingTrends: Array<{ keyword: string; frequency: number }>,
    timeframe?: string
  ): string[] {
    const recommendations: string[] = [];

    if (trendingKeywords.length > 0) {
      const topKeywords = trendingKeywords.slice(0, 3).map(k => k.keyword).join(', ');
      recommendations.push(`Consider creating content around trending topics: ${topKeywords}`);
    }

    if (emergingTrends.length > 0) {
      const emergingTopics = emergingTrends.slice(0, 2).map(k => k.keyword).join(', ');
      recommendations.push(`Early opportunity: "${emergingTopics}" are emerging trends with growth potential`);
    }

    if (timeframe === '24h') {
      recommendations.push('Rapid content creation recommended - trends are moving fast in the 24h window');
    } else if (timeframe === '30d') {
      recommendations.push('Long-term trend analysis shows stable patterns - good for strategic content planning');
    }

    if (recommendations.length === 0) {
      recommendations.push('Monitor trends closely and create content that aligns with audience interests');
    }

    return recommendations;
  }

  /**
   * Analyze channel performance and generate insights
   */
  private analyzeChannelPerformance(channel: any, recentVideos: any[]): any {
    const stats = channel.statistics;
    const subscriberCount = parseInt(stats?.subscriberCount || '0');
    const viewCount = parseInt(stats?.viewCount || '0');
    const videoCount = parseInt(stats?.videoCount || '0');

    // Calculate averages
    const avgViewsPerVideo = videoCount > 0 ? Math.round(viewCount / videoCount) : 0;
    const avgViewsPerSubscriber = subscriberCount > 0 ? Math.round(viewCount / subscriberCount) : 0;

    // Analyze recent video performance
    let recentPerformance = null;
    if (recentVideos.length > 0) {
      const totalRecentViews = recentVideos.reduce((sum, video) => sum + parseInt(video.statistics?.viewCount || '0'), 0);
      const avgRecentViews = Math.round(totalRecentViews / recentVideos.length);
      const totalRecentLikes = recentVideos.reduce((sum, video) => sum + parseInt(video.statistics?.likeCount || '0'), 0);
      const avgEngagement = totalRecentViews > 0 ? Math.round((totalRecentLikes / totalRecentViews) * 10000) / 100 : 0;

      recentPerformance = {
        avgViewsLast10Videos: avgRecentViews,
        avgEngagementRate: avgEngagement,
        performanceVsChannel: avgViewsPerVideo > 0 ? Math.round((avgRecentViews / avgViewsPerVideo) * 100) : 0,
      };
    }

    // Channel growth indicators
    const growthIndicators = {
      subscriberToVideoRatio: videoCount > 0 ? Math.round(subscriberCount / videoCount) : 0,
      viewToSubscriberRatio: avgViewsPerSubscriber,
      contentFrequency: this.estimateContentFrequency(recentVideos),
    };

    return {
      channelMetrics: {
        avgViewsPerVideo,
        avgViewsPerSubscriber,
        subscriberCount,
        viewCount,
        videoCount,
      },
      recentPerformance,
      growthIndicators,
      insights: this.generateChannelInsights(stats, recentPerformance, growthIndicators),
    };
  }

  /**
   * Generate competitor search queries based on channel info
   */
  private generateCompetitorSearchQueries(title: string, description: string): string[] {
    const queries: string[] = [];
    
    // Extract key terms from title
    const titleWords = title.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    if (titleWords.length > 0) {
      queries.push(titleWords.slice(0, 2).join(' '));
    }

    // Extract topics from description
    const topics = this.extractTopicsFromText(description);
    topics.slice(0, 2).forEach(topic => {
      if (!queries.includes(topic)) {
        queries.push(topic);
      }
    });

    // Add generic search terms
    queries.push('similar channels', 'youtube creator');

    return queries;
  }

  /**
   * Find competitor channels
   */
  private async findCompetitors(youtubeService: any, searchQueries: string[], excludeChannelId: string): Promise<any> {
    const competitors: any[] = [];
    let quotaCost = 0;

    for (const query of searchQueries) {
      try {
        const searchResponse = await youtubeService.makeAPIRequest('search', {
          part: 'snippet',
          type: 'channel',
          q: query,
          maxResults: '5',
        });
        quotaCost += 100;

        if (searchResponse.items) {
          const channelIds = searchResponse.items
            .map((item: any) => item.id.channelId)
            .filter((id: string) => id !== excludeChannelId)
            .slice(0, 3);

          if (channelIds.length > 0) {
            const channelsResponse = await youtubeService.makeAPIRequest('channels', {
              part: 'snippet,statistics',
              id: channelIds.join(','),
            });
            quotaCost += 1;

            if (channelsResponse.items) {
              channelsResponse.items.forEach((channel: any) => {
                competitors.push({
                  id: channel.id,
                  title: channel.snippet.title,
                  subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
                  videoCount: parseInt(channel.statistics?.videoCount || '0'),
                  viewCount: parseInt(channel.statistics?.viewCount || '0'),
                });
              });
            }
          }
        }
      } catch (error) {
        // Continue with other queries if one fails
        continue;
      }
    }

    // Sort by subscriber count and remove duplicates
    const uniqueCompetitors = competitors
      .filter((comp, index, self) => self.findIndex(c => c.id === comp.id) === index)
      .sort((a, b) => b.subscriberCount - a.subscriberCount)
      .slice(0, 5);

    return {
      competitors: uniqueCompetitors,
      analysis: this.analyzeCompetitors(uniqueCompetitors),
      quotaCost,
    };
  }

  /**
   * Generate channel recommendations
   */
  private generateChannelRecommendations(channelInsights: any, recentVideos: any[], competitorAnalysis: any): string[] {
    const recommendations: string[] = [];
    const insights = channelInsights.insights;
    const recent = channelInsights.recentPerformance;

    // Performance-based recommendations
    if (recent && recent.performanceVsChannel < 80) {
      recommendations.push('Recent videos are underperforming vs channel average. Consider analyzing successful content patterns.');
    }

    if (insights.includes('low engagement')) {
      recommendations.push('Focus on improving audience engagement through calls-to-action and interactive content.');
    }

    if (insights.includes('inconsistent posting')) {
      recommendations.push('Establish a consistent posting schedule to improve audience retention and growth.');
    }

    // Growth recommendations
    const metrics = channelInsights.channelMetrics;
    if (metrics.avgViewsPerSubscriber < 10) {
      recommendations.push('Low views per subscriber ratio. Focus on creating content that resonates with your existing audience.');
    }

    if (metrics.subscriberCount > 1000 && metrics.avgViewsPerVideo < metrics.subscriberCount * 0.1) {
      recommendations.push('Views per video are low relative to subscriber count. Consider refreshing content strategy.');
    }

    // Competitor-based recommendations
    if (competitorAnalysis && competitorAnalysis.competitors.length > 0) {
      const avgCompetitorSubs = competitorAnalysis.competitors.reduce((sum: number, comp: any) => sum + comp.subscriberCount, 0) / competitorAnalysis.competitors.length;
      
      if (metrics.subscriberCount < avgCompetitorSubs * 0.5) {
        recommendations.push('Significant growth opportunity exists. Analyze competitor content strategies and posting patterns.');
      }
    }

    // Content recommendations
    if (recentVideos.length > 0) {
      const avgDuration = recentVideos.reduce((sum, video) => sum + this.parseDurationToSeconds(video.contentDetails?.duration || 'PT0S'), 0) / recentVideos.length;
      
      if (avgDuration < 300) {
        recommendations.push('Consider creating longer-form content to increase watch time and algorithm performance.');
      } else if (avgDuration > 1200) {
        recommendations.push('Experiment with shorter, more digestible content to improve retention rates.');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Channel shows strong performance metrics. Continue current strategy and monitor trends.');
    }

    return recommendations;
  }

  /**
   * Estimate content frequency from recent videos
   */
  private estimateContentFrequency(recentVideos: any[]): string {
    if (recentVideos.length < 2) return 'Unknown';

    const dates = recentVideos
      .map(video => new Date(video.snippet.publishedAt))
      .sort((a, b) => b.getTime() - a.getTime());

    let totalDays = 0;
    for (let i = 0; i < dates.length - 1; i++) {
      totalDays += (dates[i].getTime() - dates[i + 1].getTime()) / (1000 * 60 * 60 * 24);
    }

    const avgDaysBetween = totalDays / (dates.length - 1);

    if (avgDaysBetween <= 1.5) return 'Daily';
    if (avgDaysBetween <= 3.5) return 'Every 2-3 days';
    if (avgDaysBetween <= 7.5) return 'Weekly';
    if (avgDaysBetween <= 15) return 'Bi-weekly';
    if (avgDaysBetween <= 31) return 'Monthly';
    return 'Irregular';
  }

  /**
   * Generate channel insights
   */
  private generateChannelInsights(stats: any, recentPerformance: any, growthIndicators: any): string[] {
    const insights: string[] = [];
    const subscriberCount = parseInt(stats?.subscriberCount || '0');
    const videoCount = parseInt(stats?.videoCount || '0');

    // Subscriber insights
    if (subscriberCount < 1000) {
      insights.push('Growing channel - focus on consistency and niche content');
    } else if (subscriberCount < 10000) {
      insights.push('Established audience - optimize for engagement and retention');
    } else if (subscriberCount < 100000) {
      insights.push('Strong channel - diversify content and collaborate with others');
    } else {
      insights.push('Major channel - focus on brand partnerships and expansion');
    }

    // Engagement insights
    if (recentPerformance && recentPerformance.avgEngagementRate < 2) {
      insights.push('low engagement');
    } else if (recentPerformance && recentPerformance.avgEngagementRate > 5) {
      insights.push('high audience engagement');
    }

    // Content frequency insights
    if (growthIndicators.contentFrequency === 'Irregular') {
      insights.push('inconsistent posting');
    } else if (growthIndicators.contentFrequency === 'Daily') {
      insights.push('high content frequency');
    }

    // Growth potential
    if (growthIndicators.viewToSubscriberRatio > 20) {
      insights.push('strong viral potential');
    }

    return insights;
  }

  /**
   * Analyze competitor data
   */
  private analyzeCompetitors(competitors: any[]): any {
    if (competitors.length === 0) {
      return { summary: 'No competitors found for analysis' };
    }

    const totalSubs = competitors.reduce((sum, comp) => sum + comp.subscriberCount, 0);
    const avgSubs = Math.round(totalSubs / competitors.length);
    const topCompetitor = competitors[0];

    return {
      summary: `Found ${competitors.length} similar channels`,
      averageSubscribers: avgSubs,
      topCompetitor: {
        title: topCompetitor.title,
        subscribers: topCompetitor.subscriberCount,
      },
      competitionLevel: avgSubs > 100000 ? 'High' : avgSubs > 10000 ? 'Medium' : 'Low',
    };
  }

  /**
   * Register built-in tools
   */
  private async registerBuiltInTools(): Promise<void> {
    // Register placeholder tools for the 7 planned tools
    const builtInTools: MCPTool[] = [
      {
        name: 'getVideoTranscript',
        description: 'Extract transcript from a YouTube video URL or video ID',
        inputSchema: {
          type: 'object',
          properties: {
            videoUrl: {
              type: 'string',
              description: 'YouTube video URL or direct video ID (supports youtube.com/watch, youtu.be, and direct video IDs)',
              minLength: 11,
            },
            language: {
              type: 'string',
              description: 'Preferred language code (optional, defaults to English)',
              default: 'en',
              pattern: '^[a-z]{2}(-[A-Z]{2})?$',
            },
          },
          required: ['videoUrl'],
          additionalProperties: false,
        },
        handler: async (input: unknown, context: MCPContext): Promise<MCPToolResponse> => {
          try {
            // Import services dynamically to avoid circular dependencies
            const { YouTubeService } = await import('@/services/youtube.service');
            const { ConfigurationService } = await import('@/services/configuration.service');
            const { LoggerUtil } = await import('@/utils/logger.util');
            
            // Validate input
            const validatedInput = input as { videoUrl: string; language?: string };
            
            // Get environment from context (this should be available in the execution context)
            const env = (context as any).env as import('@/types/environment.types').CloudflareEnvironment;
            if (!env) {
              throw new Error('Environment not available in execution context');
            }

            // Initialize services
            const config = new ConfigurationService(env);
            await config.initialize();
            
            const logger = new LoggerUtil(config.getConfiguration());
            const youtubeService = new YouTubeService(config, logger, env);

            // Extract transcript
            const transcript = await youtubeService.getVideoTranscript(
              validatedInput.videoUrl,
              validatedInput.language || 'en'
            );

            // Format response
            const response = {
              videoId: transcript.videoId,
              title: `Video transcript for ${transcript.videoId}`,
              language: transcript.language,
              isAutoGenerated: transcript.isAutoGenerated,
              transcript: {
                fullText: transcript.fullText,
                segments: transcript.segments,
                wordCount: transcript.wordCount,
                estimatedReadingTime: transcript.estimatedReadingTime
              }
            };

            return {
              content: [{
                type: 'text',
                text: JSON.stringify(response, null, 2),
              }],
              isError: false,
            };

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            return {
              content: [{
                type: 'text',
                text: `Error extracting transcript: ${errorMessage}`,
              }],
              isError: true,
            };
          }
        },
      },
      {
        name: 'getVideoAnalytics',
        description: 'Get comprehensive analytics and statistics for a YouTube video',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'YouTube video URL (any format) or video ID',
              minLength: 11,
            },
            includeChannel: {
              type: 'boolean',
              description: 'Include detailed channel analytics',
              default: true,
            },
            includeEngagement: {
              type: 'boolean',
              description: 'Calculate engagement metrics and ratios',
              default: true,
            },
          },
          required: ['url'],
          additionalProperties: false,
        },
        handler: async (input: unknown, context: MCPContext): Promise<MCPToolResponse> => {
          try {
            // Import services dynamically to avoid circular dependencies
            const { YouTubeService } = await import('@/services/youtube.service');
            const { ConfigurationService } = await import('@/services/configuration.service');
            const { LoggerUtil } = await import('@/utils/logger.util');
            
            // Validate input
            const validatedInput = input as {
              url: string;
              includeChannel?: boolean;
              includeEngagement?: boolean;
            };
            
            // Get environment from context
            const env = (context as any).env as import('@/types/environment.types').CloudflareEnvironment;
            if (!env) {
              throw new Error('Environment not available in execution context');
            }

            // Initialize services
            const config = new ConfigurationService(env);
            await config.initialize();
            
            const logger = new LoggerUtil(config.getConfiguration());
            const youtubeService = new YouTubeService(config, logger, env);

            // Extract video ID from URL
            const videoId = YouTubeService.extractVideoId(validatedInput.url);
            if (!videoId) {
              throw new Error(`Invalid YouTube URL or video ID: ${validatedInput.url}`);
            }

            // Validate video ID format
            if (!YouTubeService.isValidVideoId(videoId)) {
              throw new Error(`Invalid video ID format: ${videoId}`);
            }

            // Get comprehensive video information
            const videoInfo = await youtubeService.getVideoInfo(videoId);
            
            // Get video metrics
            const metrics = await youtubeService.getVideoMetrics(videoId);

            // Get channel information if requested
            let channelInfo: any = null;
            if (validatedInput.includeChannel !== false) {
              try {
                // Make YouTube API request for channel information
                const channelResponse = await youtubeService.makeAPIRequest('channels', {
                  part: 'snippet,statistics',
                  id: videoInfo.channelId,
                });

                if (channelResponse.items && channelResponse.items.length > 0) {
                  const channel = channelResponse.items[0];
                  channelInfo = {
                    id: channel.id,
                    title: channel.snippet.title,
                    customUrl: channel.snippet.customUrl,
                    publishedAt: channel.snippet.publishedAt,
                    subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
                    videoCount: parseInt(channel.statistics?.videoCount || '0'),
                    viewCount: parseInt(channel.statistics?.viewCount || '0'),
                  };
                }
              } catch (error) {
                logger.warn('Failed to get channel information', {
                  channelId: videoInfo.channelId,
                  error: error instanceof Error ? error.message : String(error)
                });
              }
            }

            // Calculate advanced analytics if requested
            let analytics: any = {};
            if (validatedInput.includeEngagement !== false) {
              const publishDate = new Date(metrics.publishedAt);
              const now = new Date();
              const daysFromUpload = Math.floor((now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24));
              
              // Calculate engagement metrics
              const engagementRate = metrics.viewCount > 0 ?
                ((metrics.likeCount + metrics.commentCount) / metrics.viewCount) * 100 : 0;
              const likeToViewRatio = metrics.viewCount > 0 ?
                (metrics.likeCount / metrics.viewCount) * 100 : 0;
              const commentToViewRatio = metrics.viewCount > 0 ?
                (metrics.commentCount / metrics.viewCount) * 100 : 0;
              const averageViewsPerDay = daysFromUpload > 0 ?
                metrics.viewCount / daysFromUpload : metrics.viewCount;

              // Determine performance category
              let performanceCategory: 'viral' | 'high' | 'average' | 'low' = 'low';
              if (engagementRate > 10) performanceCategory = 'viral';
              else if (engagementRate > 5) performanceCategory = 'high';
              else if (engagementRate > 2) performanceCategory = 'average';

              analytics = {
                engagementRate: Math.round(engagementRate * 100) / 100,
                likeToViewRatio: Math.round(likeToViewRatio * 100) / 100,
                commentToViewRatio: Math.round(commentToViewRatio * 100) / 100,
                averageViewsPerDay: Math.round(averageViewsPerDay),
                performanceCategory,
                daysFromUpload,
              };
            }

            // Parse video duration for better formatting
            const parseDuration = (duration: string): string => {
              const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
              if (!match) return duration;
              
              const hours = parseInt(match[1] || '0');
              const minutes = parseInt(match[2] || '0');
              const seconds = parseInt(match[3] || '0');
              
              if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
              }
              return `${minutes}:${seconds.toString().padStart(2, '0')}`;
            };

            // Calculate quota cost (estimated)
            let quotaCost = 1; // Base video request
            if (channelInfo) quotaCost += 1; // Channel request
            
            // Build comprehensive analytics response
            const response = {
              video: {
                id: videoInfo.videoId,
                title: videoInfo.title,
                description: videoInfo.description.substring(0, 500) + (videoInfo.description.length > 500 ? '...' : ''),
                publishedAt: metrics.publishedAt,
                duration: parseDuration(videoInfo.contentDetails.duration),
                categoryId: videoInfo.categoryId,
                defaultLanguage: (videoInfo as any).defaultLanguage,
                tags: videoInfo.tags.slice(0, 10), // Limit tags for readability
              },
              statistics: {
                viewCount: metrics.viewCount,
                likeCount: metrics.likeCount,
                commentCount: metrics.commentCount,
                favoriteCount: metrics.favoriteCount,
                ...(metrics.dislikeCount !== undefined && { dislikeCount: metrics.dislikeCount }),
              },
              ...(channelInfo && {
                channel: channelInfo,
              }),
              ...(Object.keys(analytics).length > 0 && {
                analytics: analytics,
              }),
              metadata: {
                retrievedAt: new Date().toISOString(),
                cached: false, // This will be updated by caching logic
                quota_cost: quotaCost,
              },
            };

            return {
              content: [{
                type: 'text',
                text: JSON.stringify(response, null, 2),
              }],
              isError: false,
            };

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            return {
              content: [{
                type: 'text',
                text: `Error getting video analytics: ${errorMessage}`,
              }],
              isError: true,
            };
          }
        },
      },
      {
        name: 'analyzeChannelPerformance',
        description: 'Analyze channel performance and find top-performing videos with detailed insights',
        inputSchema: {
          type: 'object',
          properties: {
            channelId: {
              type: 'string',
              description: 'YouTube channel ID (format: UC...)',
              pattern: '^UC[a-zA-Z0-9_-]{22}$',
            },
            videoCount: {
              type: 'number',
              description: 'Number of recent videos to analyze',
              minimum: 1,
              maximum: 50,
              default: 10,
            },
            includeAnalytics: {
              type: 'boolean',
              description: 'Include detailed performance analytics',
              default: true,
            },
          },
          required: ['channelId'],
          additionalProperties: false,
        },
        handler: async (input: unknown, context: MCPContext): Promise<MCPToolResponse> => {
          try {
            // Import services dynamically
            const { YouTubeService } = await import('@/services/youtube.service');
            const { ConfigurationService } = await import('@/services/configuration.service');
            const { LoggerUtil } = await import('@/utils/logger.util');
            
            // Validate input
            const validatedInput = input as {
              channelId: string;
              videoCount?: number;
              includeAnalytics?: boolean;
            };
            
            // Get environment from context
            const env = (context as any).env as import('@/types/environment.types').CloudflareEnvironment;
            if (!env) {
              throw new Error('Environment not available in execution context');
            }

            // Initialize services
            const config = new ConfigurationService(env);
            await config.initialize();
            
            const logger = new LoggerUtil(config.getConfiguration());
            const youtubeService = new YouTubeService(config, logger, env);

            const channelId = validatedInput.channelId;
            const videoCount = validatedInput.videoCount || 10;
            const includeAnalytics = validatedInput.includeAnalytics !== false;

            // Get channel information
            const channelResponse = await youtubeService.makeAPIRequest('channels', {
              part: 'snippet,statistics,brandingSettings',
              id: channelId,
            });

            if (!channelResponse.items || channelResponse.items.length === 0) {
              throw new Error(`Channel not found: ${channelId}`);
            }

            const channelData = channelResponse.items[0];
            const channelInfo = {
              id: channelData.id,
              title: channelData.snippet.title,
              description: channelData.snippet.description.substring(0, 300) + (channelData.snippet.description.length > 300 ? '...' : ''),
              customUrl: channelData.snippet.customUrl,
              publishedAt: channelData.snippet.publishedAt,
              country: channelData.snippet.country,
              subscriberCount: parseInt(channelData.statistics?.subscriberCount || '0'),
              videoCount: parseInt(channelData.statistics?.videoCount || '0'),
              viewCount: parseInt(channelData.statistics?.viewCount || '0'),
              hiddenSubscriberCount: channelData.statistics?.hiddenSubscriberCount || false,
            };

            // Get recent videos from channel
            const searchResponse = await youtubeService.makeAPIRequest('search', {
              part: 'id,snippet',
              channelId: channelId,
              type: 'video',
              order: 'date',
              maxResults: videoCount.toString(),
            });

            if (!searchResponse.items || searchResponse.items.length === 0) {
              throw new Error(`No videos found for channel: ${channelId}`);
            }

            // Get detailed metrics for each video
            const videoIds = searchResponse.items.map((item: any) => item.id.videoId);
            const videosResponse = await youtubeService.makeAPIRequest('videos', {
              part: 'snippet,statistics,contentDetails',
              id: videoIds.join(','),
            });

            const videos = [];
            let totalViews = 0;
            let totalLikes = 0;
            let totalComments = 0;
            let highestPerformer = { video: null as any, score: 0 };

            for (const video of videosResponse.items || []) {
              const stats = video.statistics;
              const viewCount = parseInt(stats?.viewCount || '0');
              const likeCount = parseInt(stats?.likeCount || '0');
              const commentCount = parseInt(stats?.commentCount || '0');

              // Calculate engagement score
              const engagementScore = viewCount > 0 ?
                ((likeCount + commentCount) / viewCount) * 100 : 0;

              // Calculate performance score (weighted metric)
              const performanceScore = (viewCount * 0.6) + (likeCount * 0.25) + (commentCount * 0.15);

              if (performanceScore > highestPerformer.score) {
                highestPerformer = { video, score: performanceScore };
              }

              totalViews += viewCount;
              totalLikes += likeCount;
              totalComments += commentCount;

              // Parse duration
              const parseDuration = (duration: string): string => {
                const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                if (!match) return duration;
                
                const hours = parseInt(match[1] || '0');
                const minutes = parseInt(match[2] || '0');
                const seconds = parseInt(match[3] || '0');
                
                if (hours > 0) {
                  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
                return `${minutes}:${seconds.toString().padStart(2, '0')}`;
              };

              videos.push({
                id: video.id,
                title: video.snippet.title,
                publishedAt: video.snippet.publishedAt,
                duration: parseDuration(video.contentDetails?.duration || 'PT0S'),
                viewCount,
                likeCount,
                commentCount,
                favoriteCount: parseInt(stats?.favoriteCount || '0'),
                engagementScore: Math.round(engagementScore * 100) / 100,
                performanceScore: Math.round(performanceScore),
              });
            }

            // Sort videos by performance score
            videos.sort((a, b) => b.performanceScore - a.performanceScore);

            // Calculate channel analytics
            let analytics: any = {};
            if (includeAnalytics) {
              const avgViews = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;
              const avgLikes = videos.length > 0 ? Math.round(totalLikes / videos.length) : 0;
              const avgComments = videos.length > 0 ? Math.round(totalComments / videos.length) : 0;
              const avgEngagement = videos.length > 0 ?
                videos.reduce((sum, v) => sum + v.engagementScore, 0) / videos.length : 0;

              // Channel performance insights
              const subscriberToViewRatio = channelInfo.subscriberCount > 0 ?
                avgViews / channelInfo.subscriberCount : 0;
              
              // Performance category
              let performanceCategory: 'excellent' | 'good' | 'average' | 'needs_improvement' = 'needs_improvement';
              if (avgEngagement > 5) performanceCategory = 'excellent';
              else if (avgEngagement > 3) performanceCategory = 'good';
              else if (avgEngagement > 1) performanceCategory = 'average';

              analytics = {
                averageMetrics: {
                  views: avgViews,
                  likes: avgLikes,
                  comments: avgComments,
                  engagementRate: Math.round(avgEngagement * 100) / 100,
                },
                performanceInsights: {
                  category: performanceCategory,
                  subscriberToViewRatio: Math.round(subscriberToViewRatio * 10000) / 10000,
                  totalEngagement: totalLikes + totalComments,
                  consistencyScore: this.calculateConsistencyScore(videos),
                },
                topPerformingVideo: highestPerformer.video ? {
                  id: highestPerformer.video.id,
                  title: highestPerformer.video.snippet.title,
                  viewCount: parseInt(highestPerformer.video.statistics?.viewCount || '0'),
                  performanceScore: Math.round(highestPerformer.score),
                } : null,
              };
            }

            // Calculate quota cost
            let quotaCost = 1; // Channel request
            quotaCost += 100; // Search request (100 units)
            quotaCost += 1; // Videos batch request

            const response = {
              channel: channelInfo,
              videos: videos,
              summary: {
                analyzedVideoCount: videos.length,
                totalViews: totalViews,
                totalLikes: totalLikes,
                totalComments: totalComments,
                averageViewsPerVideo: videos.length > 0 ? Math.round(totalViews / videos.length) : 0,
              },
              ...(Object.keys(analytics).length > 0 && { analytics }),
              metadata: {
                analyzedAt: new Date().toISOString(),
                quotaCost: quotaCost,
                videoRange: `Last ${videos.length} videos`,
              },
            };

            return {
              content: [{
                type: 'text',
                text: JSON.stringify(response, null, 2),
              }],
              isError: false,
            };

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            return {
              content: [{
                type: 'text',
                text: `Error analyzing channel performance: ${errorMessage}`,
              }],
              isError: true,
            };
          }
        },
      },
      {
        name: 'compareWithCompetitors',
        description: 'Compare multiple channels for comprehensive competitive analysis',
        inputSchema: {
          type: 'object',
          properties: {
            channels: {
              type: 'array',
              items: {
                type: 'string',
                pattern: '^UC[a-zA-Z0-9_-]{22}$',
              },
              description: 'Array of YouTube channel IDs to compare (2-5 channels)',
              minItems: 2,
              maxItems: 5,
            },
            videoSampleSize: {
              type: 'number',
              description: 'Number of recent videos to analyze per channel',
              minimum: 5,
              maximum: 20,
              default: 10,
            },
            includeEngagementAnalysis: {
              type: 'boolean',
              description: 'Include detailed engagement metrics comparison',
              default: true,
            },
          },
          required: ['channels'],
          additionalProperties: false,
        },
        handler: async (input: unknown, context: MCPContext): Promise<MCPToolResponse> => {
          try {
            // Import services dynamically
            const { YouTubeService } = await import('@/services/youtube.service');
            const { ConfigurationService } = await import('@/services/configuration.service');
            const { LoggerUtil } = await import('@/utils/logger.util');
            
            // Validate input
            const validatedInput = input as {
              channels: string[];
              videoSampleSize?: number;
              includeEngagementAnalysis?: boolean;
            };
            
            // Get environment from context
            const env = (context as any).env as import('@/types/environment.types').CloudflareEnvironment;
            if (!env) {
              throw new Error('Environment not available in execution context');
            }

            // Initialize services
            const config = new ConfigurationService(env);
            await config.initialize();
            
            const logger = new LoggerUtil(config.getConfiguration());
            const youtubeService = new YouTubeService(config, logger, env);

            const channelIds = validatedInput.channels;
            const videoSampleSize = validatedInput.videoSampleSize || 10;
            const includeEngagement = validatedInput.includeEngagementAnalysis !== false;

            // Analyze each channel
            const channelAnalyses = [];
            let totalQuotaCost = 0;

            for (const channelId of channelIds) {
              try {
                // Get channel information
                const channelResponse = await youtubeService.makeAPIRequest('channels', {
                  part: 'snippet,statistics',
                  id: channelId,
                });

                if (!channelResponse.items || channelResponse.items.length === 0) {
                  logger.warn(`Channel not found: ${channelId}`);
                  continue;
                }

                const channelData = channelResponse.items[0];
                totalQuotaCost += 1; // Channel request

                // Get recent videos
                const searchResponse = await youtubeService.makeAPIRequest('search', {
                  part: 'id,snippet',
                  channelId: channelId,
                  type: 'video',
                  order: 'date',
                  maxResults: videoSampleSize.toString(),
                });

                totalQuotaCost += 100; // Search request

                if (!searchResponse.items || searchResponse.items.length === 0) {
                  logger.warn(`No videos found for channel: ${channelId}`);
                  continue;
                }

                // Get detailed video metrics
                const videoIds = searchResponse.items.map((item: any) => item.id.videoId);
                const videosResponse = await youtubeService.makeAPIRequest('videos', {
                  part: 'snippet,statistics,contentDetails',
                  id: videoIds.join(','),
                });

                totalQuotaCost += 1; // Videos batch request

                // Calculate channel metrics
                let totalViews = 0;
                let totalLikes = 0;
                let totalComments = 0;
                let totalDuration = 0;
                const videoMetrics = [];

                for (const video of videosResponse.items || []) {
                  const stats = video.statistics;
                  const viewCount = parseInt(stats?.viewCount || '0');
                  const likeCount = parseInt(stats?.likeCount || '0');
                  const commentCount = parseInt(stats?.commentCount || '0');

                  // Parse duration to seconds
                  const duration = this.parseDurationToSeconds(video.contentDetails?.duration || 'PT0S');

                  totalViews += viewCount;
                  totalLikes += likeCount;
                  totalComments += commentCount;
                  totalDuration += duration;

                  const engagementScore = viewCount > 0 ?
                    ((likeCount + commentCount) / viewCount) * 100 : 0;

                  videoMetrics.push({
                    viewCount,
                    likeCount,
                    commentCount,
                    duration,
                    engagementScore: Math.round(engagementScore * 10000) / 10000,
                  });
                }

                // Calculate averages and performance indicators
                const videoCount = videoMetrics.length;
                const avgViews = videoCount > 0 ? totalViews / videoCount : 0;
                const avgLikes = videoCount > 0 ? totalLikes / videoCount : 0;
                const avgComments = videoCount > 0 ? totalComments / videoCount : 0;
                const avgDuration = videoCount > 0 ? totalDuration / videoCount : 0;
                const avgEngagement = videoCount > 0 ?
                  videoMetrics.reduce((sum, v) => sum + v.engagementScore, 0) / videoCount : 0;

                // Calculate subscriber engagement rate
                const subscriberCount = parseInt(channelData.statistics?.subscriberCount || '0');
                const subscriberEngagementRate = subscriberCount > 0 ?
                  (avgViews / subscriberCount) * 100 : 0;

                // Determine content frequency (videos per week)
                const oldestVideo = searchResponse.items[searchResponse.items.length - 1];
                const newestVideo = searchResponse.items[0];
                const timeSpan = new Date(newestVideo.snippet.publishedAt).getTime() -
                               new Date(oldestVideo.snippet.publishedAt).getTime();
                const weeksSpan = timeSpan / (1000 * 60 * 60 * 24 * 7);
                const videosPerWeek = weeksSpan > 0 ? videoCount / weeksSpan : 0;

                channelAnalyses.push({
                  channel: {
                    id: channelData.id,
                    title: channelData.snippet.title,
                    description: channelData.snippet.description.substring(0, 200) +
                               (channelData.snippet.description.length > 200 ? '...' : ''),
                    customUrl: channelData.snippet.customUrl,
                    subscriberCount,
                    totalVideoCount: parseInt(channelData.statistics?.videoCount || '0'),
                    totalViewCount: parseInt(channelData.statistics?.viewCount || '0'),
                  },
                  performance: {
                    analyzedVideos: videoCount,
                    averageViews: Math.round(avgViews),
                    averageLikes: Math.round(avgLikes),
                    averageComments: Math.round(avgComments),
                    averageDurationSeconds: Math.round(avgDuration),
                    averageEngagementRate: Math.round(avgEngagement * 10000) / 10000,
                    subscriberEngagementRate: Math.round(subscriberEngagementRate * 100) / 100,
                    videosPerWeek: Math.round(videosPerWeek * 100) / 100,
                  },
                  strengths: this.identifyChannelStrengths(avgViews, avgEngagement, subscriberEngagementRate, videosPerWeek),
                  ...(includeEngagement && {
                    engagementAnalysis: {
                      consistency: this.calculateConsistencyScore(videoMetrics.map(v => ({ performanceScore: v.viewCount }))),
                      topPerformingVideoViews: Math.max(...videoMetrics.map(v => v.viewCount)),
                      engagementDistribution: this.analyzeEngagementDistribution(videoMetrics),
                    }
                  }),
                });

              } catch (error) {
                logger.error(`Failed to analyze channel ${channelId}`, {
                  error: error instanceof Error ? error.message : String(error)
                });
                
                channelAnalyses.push({
                  channel: { id: channelId, error: 'Analysis failed' },
                  error: error instanceof Error ? error.message : String(error),
                });
              }
            }

            // Perform competitive comparison
            const comparison = this.performCompetitiveComparison(channelAnalyses);

            const response = {
              comparison: {
                channelCount: channelAnalyses.length,
                leader: comparison.leader,
                rankings: comparison.rankings,
                insights: comparison.insights,
              },
              channels: channelAnalyses,
              metadata: {
                analyzedAt: new Date().toISOString(),
                videoSampleSize,
                includeEngagementAnalysis: includeEngagement,
                quotaCost: totalQuotaCost,
              },
            };

            return {
              content: [{
                type: 'text',
                text: JSON.stringify(response, null, 2),
              }],
              isError: false,
            };

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            return {
              content: [{
                type: 'text',
                text: `Error performing competitive analysis: ${errorMessage}`,
              }],
              isError: true,
            };
          }
        },
      },
      {
        name: 'searchContentByKeywords',
        description: 'Search for videos containing specific keywords in titles, descriptions, and available transcripts',
        inputSchema: {
          type: 'object',
          properties: {
            keywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'Keywords to search for in video content',
              minItems: 1,
              maxItems: 10,
            },
            channelId: {
              type: 'string',
              description: 'Channel ID to search within (optional)',
              pattern: '^UC[a-zA-Z0-9_-]{22}$',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results to return',
              minimum: 1,
              maximum: 50,
              default: 20,
            },
            publishedAfter: {
              type: 'string',
              description: 'Search for videos published after this date (RFC 3339 format)',
              pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z$',
            },
            order: {
              type: 'string',
              description: 'Sort order for results',
              enum: ['relevance', 'date', 'viewCount', 'rating'],
              default: 'relevance',
            },
          },
          required: ['keywords'],
          additionalProperties: false,
        },
        handler: async (input: unknown, context: MCPContext): Promise<MCPToolResponse> => {
          try {
            // Import services dynamically
            const { YouTubeService } = await import('@/services/youtube.service');
            const { ConfigurationService } = await import('@/services/configuration.service');
            const { LoggerUtil } = await import('@/utils/logger.util');
            
            // Validate input
            const validatedInput = input as {
              keywords: string[];
              channelId?: string;
              maxResults?: number;
              publishedAfter?: string;
              order?: 'relevance' | 'date' | 'viewCount' | 'rating';
            };
            
            // Get environment from context
            const env = (context as any).env as import('@/types/environment.types').CloudflareEnvironment;
            if (!env) {
              throw new Error('Environment not available in execution context');
            }

            // Initialize services
            const config = new ConfigurationService(env);
            await config.initialize();
            
            const logger = new LoggerUtil(config.getConfiguration());
            const youtubeService = new YouTubeService(config, logger, env);

            const keywords = validatedInput.keywords;
            const channelId = validatedInput.channelId;
            const maxResults = validatedInput.maxResults || 20;
            const publishedAfter = validatedInput.publishedAfter;
            const order = validatedInput.order || 'relevance';

            // Build search query
            const searchQuery = keywords.map(k => `"${k}"`).join(' OR ');
            
            // Build search parameters
            const searchParams: Record<string, string> = {
              part: 'id,snippet',
              type: 'video',
              q: searchQuery,
              maxResults: maxResults.toString(),
              order: order,
            };

            if (channelId) {
              searchParams.channelId = channelId;
            }

            if (publishedAfter) {
              searchParams.publishedAfter = publishedAfter;
            }

            let quotaCost = 100; // Base search cost

            // Perform search
            const searchResponse = await youtubeService.makeAPIRequest('search', searchParams);

            if (!searchResponse.items || searchResponse.items.length === 0) {
              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    results: [],
                    summary: {
                      keywords,
                      totalResults: 0,
                      searchQuery,
                      message: 'No videos found matching the search criteria',
                    },
                    metadata: {
                      searchedAt: new Date().toISOString(),
                      quotaCost,
                    },
                  }, null, 2),
                }],
                isError: false,
              };
            }

            // Get detailed video information
            const videoIds = searchResponse.items.map((item: any) => item.id.videoId);
            const videosResponse = await youtubeService.makeAPIRequest('videos', {
              part: 'snippet,statistics,contentDetails',
              id: videoIds.join(','),
            });

            quotaCost += 1; // Videos request

            // Process results and analyze keyword matches
            const results = [];
            const keywordStats: Record<string, { count: number; videos: string[] }> = {};
            
            // Initialize keyword stats
            keywords.forEach(keyword => {
              keywordStats[keyword.toLowerCase()] = { count: 0, videos: [] };
            });

            for (const video of videosResponse.items || []) {
              const snippet = video.snippet;
              const stats = video.statistics;
              
              // Analyze keyword matches
              const matches = this.analyzeKeywordMatches(
                keywords,
                snippet.title,
                snippet.description,
                snippet.tags || []
              );

              // Update keyword statistics
              matches.foundKeywords.forEach(keyword => {
                keywordStats[keyword.toLowerCase()].count++;
                keywordStats[keyword.toLowerCase()].videos.push(video.id);
              });

              // Parse duration
              const duration = this.parseDurationToSeconds(video.contentDetails?.duration || 'PT0S');

              results.push({
                video: {
                  id: video.id,
                  title: snippet.title,
                  description: snippet.description.substring(0, 300) +
                             (snippet.description.length > 300 ? '...' : ''),
                  publishedAt: snippet.publishedAt,
                  channelId: snippet.channelId,
                  channelTitle: snippet.channelTitle,
                  duration: this.formatSecondsToTime(duration),
                  thumbnails: {
                    default: snippet.thumbnails.default?.url,
                    medium: snippet.thumbnails.medium?.url,
                    high: snippet.thumbnails.high?.url,
                  },
                },
                statistics: {
                  viewCount: parseInt(stats?.viewCount || '0'),
                  likeCount: parseInt(stats?.likeCount || '0'),
                  commentCount: parseInt(stats?.commentCount || '0'),
                },
                keywordAnalysis: {
                  foundKeywords: matches.foundKeywords,
                  titleMatches: matches.titleMatches,
                  descriptionMatches: matches.descriptionMatches,
                  tagMatches: matches.tagMatches,
                  relevanceScore: matches.relevanceScore,
                },
              });
            }

            // Sort results by relevance score
            results.sort((a, b) => b.keywordAnalysis.relevanceScore - a.keywordAnalysis.relevanceScore);

            // Generate insights
            const insights = this.generateKeywordSearchInsights(keywords, keywordStats, results);

            const response = {
              results: results,
              summary: {
                keywords,
                totalResults: results.length,
                searchQuery,
                topKeyword: insights.topKeyword,
                averageRelevanceScore: insights.averageRelevanceScore,
              },
              keywordStatistics: keywordStats,
              insights: insights.recommendations,
              metadata: {
                searchedAt: new Date().toISOString(),
                searchParameters: {
                  channelId,
                  maxResults,
                  publishedAfter,
                  order,
                },
                quotaCost,
              },
            };

            return {
              content: [{
                type: 'text',
                text: JSON.stringify(response, null, 2),
              }],
              isError: false,
            };

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            return {
              content: [{
                type: 'text',
                text: `Error searching for keywords: ${errorMessage}`,
              }],
              isError: true,
            };
          }
        },
      },
      {
        name: 'detectTrends',
        description: 'Detect trending topics and keywords',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'YouTube category to analyze',
              enum: ['Gaming', 'Music', 'Technology', 'Entertainment', 'Education', 'News'],
            },
            timeframe: {
              type: 'string',
              description: 'Time period for trend analysis',
              enum: ['24h', '7d', '30d'],
              default: '7d',
            },
            region: {
              type: 'string',
              description: 'Region code for localized trends',
              pattern: '^[A-Z]{2}$',
              default: 'US',
            },
          },
          additionalProperties: false,
        },
        handler: async (input: unknown, context: MCPContext): Promise<MCPToolResponse> => {
          try {
            // Import services dynamically
            const { YouTubeService } = await import('@/services/youtube.service');
            const { ConfigurationService } = await import('@/services/configuration.service');
            const { LoggerUtil } = await import('@/utils/logger.util');
            
            // Validate input
            const validatedInput = input as {
              category?: string;
              timeframe?: '24h' | '7d' | '30d';
              region?: string;
            };
            
            // Get environment from context
            const env = (context as any).env as import('@/types/environment.types').CloudflareEnvironment;
            if (!env) {
              throw new Error('Environment not available in execution context');
            }

            // Initialize services
            const config = new ConfigurationService(env);
            await config.initialize();
            
            const logger = new LoggerUtil(config.getConfiguration());
            const youtubeService = new YouTubeService(config, logger, env);

            const category = validatedInput.category;
            const timeframe = validatedInput.timeframe || '7d';
            const region = validatedInput.region || 'US';

            // Calculate date range based on timeframe
            const now = new Date();
            const publishedAfter = new Date();
            switch (timeframe) {
              case '24h':
                publishedAfter.setDate(now.getDate() - 1);
                break;
              case '7d':
                publishedAfter.setDate(now.getDate() - 7);
                break;
              case '30d':
                publishedAfter.setDate(now.getDate() - 30);
                break;
            }

            // Build search queries for trend detection
            const trendQueries = [
              'trending',
              'viral',
              'popular',
              ...(category ? [`${category.toLowerCase()}`] : [])
            ];

            let quotaCost = 0;
            const trendData = [];
            const keywordFrequency = new Map<string, number>();

            // Search for trending content with multiple queries
            for (const query of trendQueries.slice(0, 3)) { // Limit to 3 queries to manage quota
              try {
                const searchParams: Record<string, string> = {
                  part: 'id,snippet',
                  type: 'video',
                  q: query,
                  maxResults: '25',
                  order: 'relevance',
                  publishedAfter: publishedAfter.toISOString(),
                  regionCode: region,
                };

                const searchResponse = await youtubeService.makeAPIRequest('search', searchParams);
                quotaCost += 100; // Search request cost

                if (searchResponse.items && searchResponse.items.length > 0) {
                  // Get detailed video information
                  const videoIds = searchResponse.items.map((item: any) => item.id.videoId);
                  const videosResponse = await youtubeService.makeAPIRequest('videos', {
                    part: 'snippet,statistics',
                    id: videoIds.join(','),
                  });
                  quotaCost += 1; // Videos request cost

                  // Analyze videos for trends
                  for (const video of videosResponse.items || []) {
                    const snippet = video.snippet;
                    const stats = video.statistics;
                    
                    // Extract keywords from title and description
                    const text = `${snippet.title} ${snippet.description}`.toLowerCase();
                    const keywords = this.extractTopicsFromText(text);
                    
                    // Update keyword frequency
                    keywords.forEach(keyword => {
                      keywordFrequency.set(keyword, (keywordFrequency.get(keyword) || 0) + 1);
                    });

                    // Calculate trend score based on engagement
                    const viewCount = parseInt(stats?.viewCount || '0');
                    const likeCount = parseInt(stats?.likeCount || '0');
                    const commentCount = parseInt(stats?.commentCount || '0');
                    
                    const engagementRate = viewCount > 0 ?
                      ((likeCount + commentCount) / viewCount) * 100 : 0;
                    
                    // Calculate days since publication
                    const publishedDate = new Date(snippet.publishedAt);
                    const daysSincePublished = Math.max(1,
                      (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    
                    // Trend score: recent videos with high engagement get higher scores
                    const trendScore = (viewCount / 1000) * engagementRate * (30 / daysSincePublished);

                    trendData.push({
                      query,
                      video: {
                        id: video.id,
                        title: snippet.title,
                        channelTitle: snippet.channelTitle,
                        publishedAt: snippet.publishedAt,
                        categoryId: snippet.categoryId,
                      },
                      metrics: {
                        viewCount,
                        likeCount,
                        commentCount,
                        engagementRate: Math.round(engagementRate * 10000) / 10000,
                        daysSincePublished: Math.round(daysSincePublished * 10) / 10,
                        trendScore: Math.round(trendScore * 100) / 100,
                      },
                      keywords,
                    });
                  }
                }
              } catch (error) {
                logger.warn(`Failed to search for query: ${query}`, {
                  error: error instanceof Error ? error.message : String(error)
                });
              }
            }

            // Analyze trends
            const sortedTrends = trendData.sort((a, b) => b.metrics.trendScore - a.metrics.trendScore);
            
            // Get top trending keywords
            const trendingKeywords = Array.from(keywordFrequency.entries())
              .sort(([, a], [, b]) => b - a)
              .slice(0, 15)
              .map(([keyword, frequency]) => ({ keyword, frequency }));

            // Identify emerging trends (keywords with high frequency but recent appearance)
            const emergingTrends = trendingKeywords
              .filter(item => item.frequency >= 3)
              .slice(0, 8);

            // Generate trend insights
            const insights = this.generateTrendInsights(
              sortedTrends,
              trendingKeywords,
              category,
              timeframe
            );

            const response = {
              trends: {
                topTrendingVideos: sortedTrends.slice(0, 10),
                trendingKeywords: trendingKeywords.slice(0, 10),
                emergingTopics: emergingTrends,
                insights,
              },
              analysis: {
                totalVideosAnalyzed: trendData.length,
                timeframe,
                region,
                category: category || 'All categories',
                topTrendScore: sortedTrends.length > 0 ? sortedTrends[0].metrics.trendScore : 0,
                averageEngagementRate: trendData.length > 0 ?
                  Math.round((trendData.reduce((sum, item) => sum + item.metrics.engagementRate, 0) / trendData.length) * 10000) / 10000 : 0,
              },
              recommendations: this.generateTrendRecommendations(trendingKeywords, emergingTrends, timeframe),
              metadata: {
                analyzedAt: new Date().toISOString(),
                searchQueries: trendQueries.slice(0, 3),
                quotaCost,
              },
            };

            return {
              content: [{
                type: 'text',
                text: JSON.stringify(response, null, 2),
              }],
              isError: false,
            };

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            return {
              content: [{
                type: 'text',
                text: `Error detecting trends: ${errorMessage}`,
              }],
              isError: true,
            };
          }
        },
      },
      {
        name: 'getChannelInsights',
        description: 'Get comprehensive insights for a YouTube channel',
        inputSchema: {
          type: 'object',
          properties: {
            channelId: {
              type: 'string',
              description: 'YouTube channel ID',
              pattern: '^UC[a-zA-Z0-9_-]{22}$',
            },
            includeCompetitors: {
              type: 'boolean',
              description: 'Include competitor analysis',
              default: false,
            },
          },
          required: ['channelId'],
          additionalProperties: false,
        },
        handler: async (input: unknown, context: MCPContext): Promise<MCPToolResponse> => {
          try {
            // Import services dynamically
            const { YouTubeService } = await import('@/services/youtube.service');
            const { ConfigurationService } = await import('@/services/configuration.service');
            const { LoggerUtil } = await import('@/utils/logger.util');
            
            // Validate input
            const validatedInput = input as {
              channelId: string;
              includeCompetitors?: boolean;
            };
            
            // Get environment from context
            const env = (context as any).env as import('@/types/environment.types').CloudflareEnvironment;
            if (!env) {
              throw new Error('Environment not available in execution context');
            }

            // Initialize services
            const config = new ConfigurationService(env);
            await config.initialize();
            
            const logger = new LoggerUtil(config.getConfiguration());
            const youtubeService = new YouTubeService(config, logger, env);

            const channelId = validatedInput.channelId;
            const includeCompetitors = validatedInput.includeCompetitors || false;

            let quotaCost = 0;

            // Get channel information
            const channelResponse = await youtubeService.makeAPIRequest('channels', {
              part: 'snippet,statistics,brandingSettings,contentDetails',
              id: channelId,
            });
            quotaCost += 1;

            if (!channelResponse.items || channelResponse.items.length === 0) {
              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    error: 'Channel not found',
                    channelId,
                    suggestions: [
                      'Verify the channel ID is correct',
                      'Check if the channel is public',
                      'Ensure the channel exists',
                    ],
                  }, null, 2),
                }],
                isError: true,
              };
            }

            const channel = channelResponse.items[0];
            const stats = channel.statistics;
            const snippet = channel.snippet;

            // Get recent videos from the channel
            const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
            let recentVideos: any[] = [];
            
            if (uploadsPlaylistId) {
              try {
                const playlistResponse = await youtubeService.makeAPIRequest('playlistItems', {
                  part: 'snippet',
                  playlistId: uploadsPlaylistId,
                  maxResults: '10',
                });
                quotaCost += 1;

                if (playlistResponse.items && playlistResponse.items.length > 0) {
                  const videoIds = playlistResponse.items.map((item: any) => item.snippet.resourceId.videoId);
                  const videosResponse = await youtubeService.makeAPIRequest('videos', {
                    part: 'snippet,statistics,contentDetails',
                    id: videoIds.join(','),
                  });
                  quotaCost += 1;

                  recentVideos = videosResponse.items || [];
                }
              } catch (error) {
                logger.warn('Failed to fetch recent videos', {
                  channelId,
                  error: error instanceof Error ? error.message : String(error)
                });
              }
            }

            // Analyze channel performance
            const channelInsights = this.analyzeChannelPerformance(channel, recentVideos);

            // Search for similar channels (competitors) if requested
            let competitorAnalysis = null;
            if (includeCompetitors) {
              try {
                // Search for channels in similar category/niche
                const searchQueries = this.generateCompetitorSearchQueries(snippet.title, snippet.description);
                competitorAnalysis = await this.findCompetitors(youtubeService, searchQueries.slice(0, 2), channelId);
                quotaCost += competitorAnalysis.quotaCost;
              } catch (error) {
                logger.warn('Failed to analyze competitors', {
                  channelId,
                  error: error instanceof Error ? error.message : String(error)
                });
              }
            }

            // Generate recommendations
            const recommendations = this.generateChannelRecommendations(channelInsights, recentVideos, competitorAnalysis);

            const response = {
              channel: {
                id: channelId,
                title: snippet.title,
                description: snippet.description.substring(0, 500) + (snippet.description.length > 500 ? '...' : ''),
                customUrl: snippet.customUrl,
                publishedAt: snippet.publishedAt,
                country: snippet.country,
                thumbnails: {
                  high: snippet.thumbnails.high?.url,
                },
                branding: {
                  bannerImageUrl: channel.brandingSettings?.image?.bannerExternalUrl,
                  keywords: channel.brandingSettings?.channel?.keywords,
                },
              },
              statistics: {
                subscriberCount: parseInt(stats?.subscriberCount || '0'),
                viewCount: parseInt(stats?.viewCount || '0'),
                videoCount: parseInt(stats?.videoCount || '0'),
                hiddenSubscriberCount: stats?.hiddenSubscriberCount === 'true',
              },
              insights: channelInsights,
              recentContent: {
                videos: recentVideos.slice(0, 5).map(video => ({
                  id: video.id,
                  title: video.snippet.title,
                  publishedAt: video.snippet.publishedAt,
                  viewCount: parseInt(video.statistics?.viewCount || '0'),
                  likeCount: parseInt(video.statistics?.likeCount || '0'),
                  commentCount: parseInt(video.statistics?.commentCount || '0'),
                  duration: this.formatSecondsToTime(this.parseDurationToSeconds(video.contentDetails?.duration || 'PT0S')),
                })),
                totalAnalyzed: recentVideos.length,
              },
              ...(competitorAnalysis && { competitorAnalysis }),
              recommendations,
              metadata: {
                analyzedAt: new Date().toISOString(),
                includeCompetitors,
                quotaCost,
              },
            };

            return {
              content: [{
                type: 'text',
                text: JSON.stringify(response, null, 2),
              }],
              isError: false,
            };

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            return {
              content: [{
                type: 'text',
                text: `Error analyzing channel insights: ${errorMessage}`,
              }],
              isError: true,
            };
          }
        },
      },
    ];

    // Register all built-in tools
    for (const tool of builtInTools) {
      this.register(tool);
    }
  }
}

/**
 * Custom error classes for tool execution
 */
export class ToolNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolNotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class MCPToolError extends Error {
  public readonly code: MCPErrorCode;
  
  constructor(code: MCPErrorCode, message: string) {
    super(message);
    this.name = 'MCPToolError';
    this.code = code;
  }
}