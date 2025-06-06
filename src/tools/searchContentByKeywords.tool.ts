/**
 * Search Content By Keywords Tool
 * Searches for videos containing specific keywords in titles, descriptions, and available transcripts
 */

import type { MCPTool, MCPToolResponse, MCPContext } from '@/types/mcp.types';

export const searchContentByKeywordsTool: MCPTool = {
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

      // Helper functions
      const formatSecondsToTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
      };

      const parseDurationToSeconds = (duration: string): number => {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;
        
        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');
        
        return hours * 3600 + minutes * 60 + seconds;
      };

      const analyzeKeywordMatches = (
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
      } => {
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
      };

      const generateKeywordSearchInsights = (
        keywords: string[],
        keywordStats: Record<string, { count: number; videos: string[] }>,
        results: Array<any>
      ): {
        topKeyword: string | null;
        averageRelevanceScore: number;
        recommendations: string[];
      } => {
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
      };

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
        const matches = analyzeKeywordMatches(
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
        const duration = parseDurationToSeconds(video.contentDetails?.duration || 'PT0S');

        results.push({
          video: {
            id: video.id,
            title: snippet.title,
            description: snippet.description.substring(0, 300) +
                       (snippet.description.length > 300 ? '...' : ''),
            publishedAt: snippet.publishedAt,
            channelId: snippet.channelId,
            channelTitle: snippet.channelTitle,
            duration: formatSecondsToTime(duration),
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
      const insights = generateKeywordSearchInsights(keywords, keywordStats, results);

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
};