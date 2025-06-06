/**
 * Detect Trends Tool
 * Detects trending topics and keywords across YouTube content
 */

import type { MCPTool, MCPToolResponse, MCPContext } from '@/types/mcp.types';

export const detectTrendsTool: MCPTool = {
  name: 'detectTrends',
  description: 'Detect trending topics and keywords across YouTube content',
  inputSchema: {
    type: 'object',
    properties: {
      region: {
        type: 'string',
        description: 'Region code for trending videos (ISO 3166-1 alpha-2)',
        pattern: '^[A-Z]{2}$',
        default: 'US',
      },
      categoryId: {
        type: 'string',
        description: 'Video category ID to filter trends (optional)',
        pattern: '^\\d+$',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of trending videos to analyze',
        minimum: 10,
        maximum: 50,
        default: 25,
      },
      analysisDepth: {
        type: 'string',
        description: 'Depth of trend analysis',
        enum: ['basic', 'detailed', 'comprehensive'],
        default: 'detailed',
      },
      timeRange: {
        type: 'string',
        description: 'Time range for trend detection',
        enum: ['today', 'week', 'month'],
        default: 'today',
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
        region?: string;
        categoryId?: string;
        maxResults?: number;
        analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
        timeRange?: 'today' | 'week' | 'month';
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

      const region = validatedInput.region || 'US';
      const categoryId = validatedInput.categoryId;
      const maxResults = validatedInput.maxResults || 25;
      const analysisDepth = validatedInput.analysisDepth || 'detailed';
      const timeRange = validatedInput.timeRange || 'today';

      // Helper functions
      const extractKeywords = (text: string): string[] => {
        // Extract meaningful keywords from text
        const commonWords = new Set([
          'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
          'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
          'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
          'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
          'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
          'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'what', 'when',
          'where', 'why', 'how', 'who', 'which', 'all', 'any', 'both', 'each', 'few', 'more', 'most',
          'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
          'very', 's', 't', 'just', 'now', 'new', 'get', 'like', 'one', 'two', 'first', 'last',
          'good', 'great', 'best', 'make', 'see', 'way', 'time', 'day', 'year', 'work', 'life',
          'world', 'go', 'come', 'take', 'give', 'use', 'want', 'know', 'think', 'look', 'feel',
          'try', 'ask', 'need', 'seem', 'turn', 'leave', 'call', 'move', 'live', 'show', 'play',
          'run', 'believe', 'hold', 'bring', 'happen', 'write', 'provide', 'sit', 'stand', 'lose',
          'pay', 'meet', 'include', 'continue', 'set', 'learn', 'change', 'lead', 'understand',
          'watch', 'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add', 'spend', 'grow',
          'open', 'walk', 'win', 'offer', 'remember', 'love', 'consider', 'appear', 'buy', 'wait',
          'serve', 'die', 'send', 'expect', 'build', 'stay', 'fall', 'cut', 'reach', 'kill', 'remain'
        ]);

        const words = text.toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 2 && !commonWords.has(word))
          .filter(word => !/^\d+$/.test(word)); // Remove pure numbers

        // Count word frequency
        const wordCount: Record<string, number> = {};
        words.forEach(word => {
          wordCount[word] = (wordCount[word] || 0) + 1;
        });

        // Return top keywords
        return Object.entries(wordCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([word]) => word);
      };

      const categorizeTrend = (
        title: string,
        description: string,
        tags: string[]
      ): {
        category: string;
        subcategory: string;
        confidence: number;
      } => {
        const text = `${title} ${description} ${tags.join(' ')}`.toLowerCase();
        
        const categories = {
          'Entertainment': {
            patterns: ['funny', 'comedy', 'entertainment', 'celebrity', 'movie', 'tv show', 'series', 'actor'],
            subcategories: ['Comedy', 'Movies', 'TV Shows', 'Celebrity News']
          },
          'Gaming': {
            patterns: ['gaming', 'game', 'gameplay', 'streamer', 'esports', 'playthrough', 'review'],
            subcategories: ['Reviews', 'Gameplay', 'Esports', 'Streaming']
          },
          'Technology': {
            patterns: ['tech', 'technology', 'review', 'unboxing', 'smartphone', 'computer', 'ai', 'software'],
            subcategories: ['Reviews', 'Tutorials', 'News', 'AI/ML']
          },
          'Music': {
            patterns: ['music', 'song', 'album', 'artist', 'concert', 'cover', 'remix', 'lyrics'],
            subcategories: ['New Releases', 'Covers', 'Live Performances', 'Music Videos']
          },
          'Education': {
            patterns: ['tutorial', 'how to', 'learn', 'education', 'course', 'lesson', 'explained', 'guide'],
            subcategories: ['Tutorials', 'Courses', 'Explanations', 'Guides']
          },
          'News': {
            patterns: ['news', 'breaking', 'update', 'politics', 'current events', 'world', 'latest'],
            subcategories: ['Breaking News', 'Politics', 'World Events', 'Updates']
          },
          'Lifestyle': {
            patterns: ['lifestyle', 'vlog', 'daily', 'routine', 'fashion', 'beauty', 'food', 'travel'],
            subcategories: ['Vlogs', 'Fashion', 'Beauty', 'Food', 'Travel']
          },
          'Sports': {
            patterns: ['sports', 'football', 'basketball', 'soccer', 'baseball', 'highlights', 'match', 'game'],
            subcategories: ['Highlights', 'Analysis', 'Live Events', 'News']
          }
        };

        let bestMatch = { category: 'Other', subcategory: 'General', confidence: 0 };

        Object.entries(categories).forEach(([category, { patterns, subcategories }]) => {
          const matches = patterns.filter(pattern => text.includes(pattern)).length;
          const confidence = (matches / patterns.length) * 100;
          
          if (confidence > bestMatch.confidence) {
            bestMatch = {
              category,
              subcategory: subcategories[0], // Default to first subcategory
              confidence: Math.round(confidence)
            };
          }
        });

        return bestMatch;
      };

      const calculateTrendScore = (
        video: any,
        publishedHoursAgo: number
      ): number => {
        const views = parseInt(video.statistics?.viewCount || '0');
        const likes = parseInt(video.statistics?.likeCount || '0');
        const comments = parseInt(video.statistics?.commentCount || '0');

        // Calculate engagement rate
        const engagementRate = views > 0 ? ((likes + comments) / views) * 100 : 0;

        // Calculate velocity (views per hour)
        const velocity = publishedHoursAgo > 0 ? views / publishedHoursAgo : views;

        // Calculate trend score (weighted formula)
        // Views: 40%, Velocity: 30%, Engagement: 30%
        const viewsScore = Math.min(views / 1000000 * 40, 40); // Cap at 1M views
        const velocityScore = Math.min(velocity / 10000 * 30, 30); // Cap at 10K/hour
        const engagementScore = Math.min(engagementRate * 6, 30); // Cap at 5% engagement

        return Math.round((viewsScore + velocityScore + engagementScore) * 100) / 100;
      };

      const generateTrendInsights = (
        trendingVideos: Array<any>,
        keywordFrequency: Record<string, number>,
        categoryDistribution: Record<string, number>
      ): {
        topTrends: string[];
        emergingTopics: string[];
        categoryInsights: Array<{ category: string; percentage: number; trend: string }>;
        recommendations: string[];
      } => {
        // Top trends (most frequent keywords)
        const topTrends = Object.entries(keywordFrequency)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([keyword]) => keyword);

        // Emerging topics (keywords with high trend scores but moderate frequency)
        const emergingTopics = trendingVideos
          .filter(video => video.trendScore > 70)
          .flatMap(video => video.extractedKeywords)
          .filter(keyword => keywordFrequency[keyword] >= 2 && keywordFrequency[keyword] <= 5)
          .slice(0, 3);

        // Category insights
        const totalVideos = trendingVideos.length;
        const categoryInsights = Object.entries(categoryDistribution)
          .map(([category, count]) => ({
            category,
            percentage: Math.round((count / totalVideos) * 100),
            trend: count > totalVideos * 0.2 ? 'High' : count > totalVideos * 0.1 ? 'Medium' : 'Low'
          }))
          .sort((a, b) => b.percentage - a.percentage);

        // Generate recommendations
        const recommendations: string[] = [];
        
        if (topTrends.length > 0) {
          recommendations.push(`Focus on trending keywords: ${topTrends.slice(0, 3).join(', ')}`);
        }
        
        if (emergingTopics.length > 0) {
          recommendations.push(`Emerging opportunities: ${emergingTopics.join(', ')}`);
        }
        
        const topCategory = categoryInsights[0];
        if (topCategory) {
          recommendations.push(`${topCategory.category} content dominates trends (${topCategory.percentage}%)`);
        }
        
        const highEngagementVideos = trendingVideos.filter(v => v.engagementRate > 5).length;
        if (highEngagementVideos > 0) {
          recommendations.push(`${highEngagementVideos} videos show high engagement (>5%)`);
        }

        return {
          topTrends,
          emergingTopics,
          categoryInsights,
          recommendations,
        };
      };

      // Build search parameters for trending videos
      const searchParams: Record<string, string> = {
        part: 'snippet',
        chart: 'mostPopular',
        regionCode: region,
        maxResults: maxResults.toString(),
      };

      if (categoryId) {
        searchParams.videoCategoryId = categoryId;
      }

      let quotaCost = 1; // Base videos chart request

      // Get trending videos
      const trendingResponse = await youtubeService.makeAPIRequest('videos', searchParams);

      if (!trendingResponse.items || trendingResponse.items.length === 0) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              trends: [],
              summary: {
                region,
                totalAnalyzed: 0,
                message: 'No trending videos found for the specified criteria',
              },
              metadata: {
                analyzedAt: new Date().toISOString(),
                quotaCost,
              },
            }, null, 2),
          }],
          isError: false,
        };
      }

      // Get detailed statistics for trending videos
      const videoIds = trendingResponse.items.map((item: any) => item.id);
      const detailedResponse = await youtubeService.makeAPIRequest('videos', {
        part: 'snippet,statistics,contentDetails',
        id: videoIds.join(','),
      });

      quotaCost += 1; // Detailed videos request

      // Analyze trending videos
      const trendingVideos = [];
      const keywordFrequency: Record<string, number> = {};
      const categoryDistribution: Record<string, number> = {};

      for (const video of detailedResponse.items || []) {
        const snippet = video.snippet;
        const stats = video.statistics;
        
        // Calculate time since publication
        const publishedAt = new Date(snippet.publishedAt);
        const now = new Date();
        const hoursAgo = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);

        // Extract keywords
        const extractedKeywords = extractKeywords(`${snippet.title} ${snippet.description}`);
        
        // Update keyword frequency
        extractedKeywords.forEach(keyword => {
          keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
        });

        // Categorize trend
        const trendCategory = categorizeTrend(
          snippet.title,
          snippet.description,
          snippet.tags || []
        );

        // Update category distribution
        categoryDistribution[trendCategory.category] = 
          (categoryDistribution[trendCategory.category] || 0) + 1;

        // Calculate metrics
        const viewCount = parseInt(stats?.viewCount || '0');
        const likeCount = parseInt(stats?.likeCount || '0');
        const commentCount = parseInt(stats?.commentCount || '0');
        const engagementRate = viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;
        const trendScore = calculateTrendScore(video, hoursAgo);

        const videoAnalysis = {
          video: {
            id: video.id,
            title: snippet.title,
            channelTitle: snippet.channelTitle,
            publishedAt: snippet.publishedAt,
            hoursAgo: Math.round(hoursAgo * 10) / 10,
          },
          metrics: {
            viewCount,
            likeCount,
            commentCount,
            engagementRate: Math.round(engagementRate * 10000) / 10000,
            viewsPerHour: hoursAgo > 0 ? Math.round(viewCount / hoursAgo) : viewCount,
          },
          trendAnalysis: {
            trendScore,
            category: trendCategory.category,
            subcategory: trendCategory.subcategory,
            categoryConfidence: trendCategory.confidence,
            extractedKeywords: extractedKeywords.slice(0, 5),
          },
        };

        if (analysisDepth === 'comprehensive') {
          // Add additional analysis for comprehensive mode
          (videoAnalysis as any).additionalInsights = {
            titleLength: snippet.title.length,
            descriptionLength: snippet.description.length,
            hasCustomThumbnail: snippet.thumbnails?.maxres ? true : false,
            tagCount: snippet.tags ? snippet.tags.length : 0,
          };
        }

        trendingVideos.push(videoAnalysis);
      }

      // Sort by trend score
      trendingVideos.sort((a, b) => b.trendAnalysis.trendScore - a.trendAnalysis.trendScore);

      // Generate insights
      const insights = generateTrendInsights(trendingVideos, keywordFrequency, categoryDistribution);

      // Build response based on analysis depth
      let response: any = {
        trends: analysisDepth === 'basic' ? trendingVideos.slice(0, 10) : trendingVideos,
        insights,
        summary: {
          region,
          categoryId,
          totalAnalyzed: trendingVideos.length,
          timeRange,
          analysisDepth,
        },
        metadata: {
          analyzedAt: new Date().toISOString(),
          quotaCost,
        },
      };

      if (analysisDepth === 'detailed' || analysisDepth === 'comprehensive') {
        response.keywordFrequency = Object.entries(keywordFrequency)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 20)
          .reduce((acc, [keyword, count]) => {
            acc[keyword] = count;
            return acc;
          }, {} as Record<string, number>);

        response.categoryDistribution = categoryDistribution;
      }

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
};