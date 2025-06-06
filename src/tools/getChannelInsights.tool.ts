/**
 * Get Channel Insights Tool
 * Provides comprehensive channel insights including performance metrics and growth analysis
 */

import type { MCPTool, MCPToolResponse, MCPContext } from '@/types/mcp.types';

export const getChannelInsightsTool: MCPTool = {
  name: 'getChannelInsights',
  description: 'Get comprehensive channel insights including performance metrics and growth analysis',
  inputSchema: {
    type: 'object',
    properties: {
      channelId: {
        type: 'string',
        description: 'YouTube channel ID (format: UC...)',
        pattern: '^UC[a-zA-Z0-9_-]{22}$',
      },
      analysisDepth: {
        type: 'string',
        description: 'Depth of analysis to perform',
        enum: ['basic', 'detailed', 'comprehensive'],
        default: 'detailed',
      },
      includeRecentVideos: {
        type: 'boolean',
        description: 'Include analysis of recent videos',
        default: true,
      },
      videoSampleSize: {
        type: 'number',
        description: 'Number of recent videos to analyze for insights',
        minimum: 5,
        maximum: 50,
        default: 20,
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
        analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
        includeRecentVideos?: boolean;
        videoSampleSize?: number;
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
      const analysisDepth = validatedInput.analysisDepth || 'detailed';
      const includeRecentVideos = validatedInput.includeRecentVideos !== false;
      const videoSampleSize = validatedInput.videoSampleSize || 20;

      // Helper functions
      const formatNumberWithCommas = (num: number): string => {
        return num.toLocaleString();
      };

      const calculateGrowthCategory = (
        subscriberCount: number,
        avgViews: number,
        videosPerWeek: number
      ): {
        category: 'emerging' | 'growing' | 'established' | 'mature';
        factors: string[];
      } => {
        const factors: string[] = [];
        
        if (subscriberCount < 1000) {
          factors.push('Low subscriber count');
          return { category: 'emerging', factors };
        } else if (subscriberCount < 100000) {
          factors.push('Building subscriber base');
          if (avgViews > subscriberCount * 0.1) factors.push('Good view-to-subscriber ratio');
          if (videosPerWeek > 1) factors.push('Consistent content schedule');
          return { category: 'growing', factors };
        } else if (subscriberCount < 1000000) {
          factors.push('Significant subscriber base');
          if (avgViews > subscriberCount * 0.05) factors.push('Healthy engagement');
          if (videosPerWeek > 0.5) factors.push('Regular content production');
          return { category: 'established', factors };
        } else {
          factors.push('Large subscriber base');
          if (avgViews > subscriberCount * 0.02) factors.push('Strong audience retention');
          return { category: 'mature', factors };
        }
      };

      const analyzeContentStrategy = (videos: Array<any>): {
        uploadPattern: string;
        avgTitleLength: number;
        topCategories: Array<{ category: string; count: number }>;
        contentInsights: string[];
      } => {
        if (videos.length === 0) {
          return {
            uploadPattern: 'No recent videos',
            avgTitleLength: 0,
            topCategories: [],
            contentInsights: ['No content to analyze'],
          };
        }

        // Analyze upload pattern
        const uploadDates = videos.map(v => new Date(v.snippet.publishedAt));
        const timeSpans = [];
        for (let i = 1; i < uploadDates.length; i++) {
          const span = uploadDates[i - 1].getTime() - uploadDates[i].getTime();
          timeSpans.push(span / (1000 * 60 * 60 * 24)); // Convert to days
        }
        
        const avgDaysBetween = timeSpans.length > 0 ? 
          timeSpans.reduce((sum, span) => sum + span, 0) / timeSpans.length : 0;
        
        let uploadPattern = 'Irregular';
        if (avgDaysBetween <= 2) uploadPattern = 'Daily';
        else if (avgDaysBetween <= 4) uploadPattern = 'Every few days';
        else if (avgDaysBetween <= 8) uploadPattern = 'Weekly';
        else if (avgDaysBetween <= 16) uploadPattern = 'Bi-weekly';
        else if (avgDaysBetween <= 32) uploadPattern = 'Monthly';

        // Analyze title lengths
        const titleLengths = videos.map(v => v.snippet.title.length);
        const avgTitleLength = titleLengths.reduce((sum, len) => sum + len, 0) / titleLengths.length;

        // Categorize content (simplified categorization)
        const categories: Record<string, number> = {};
        videos.forEach(video => {
          const title = video.snippet.title.toLowerCase();
          const description = video.snippet.description.toLowerCase();
          const text = `${title} ${description}`;

          if (text.includes('tutorial') || text.includes('how to') || text.includes('guide')) {
            categories['Educational'] = (categories['Educational'] || 0) + 1;
          } else if (text.includes('review') || text.includes('unboxing')) {
            categories['Review'] = (categories['Review'] || 0) + 1;
          } else if (text.includes('vlog') || text.includes('daily') || text.includes('life')) {
            categories['Lifestyle'] = (categories['Lifestyle'] || 0) + 1;
          } else if (text.includes('gaming') || text.includes('gameplay') || text.includes('game')) {
            categories['Gaming'] = (categories['Gaming'] || 0) + 1;
          } else if (text.includes('music') || text.includes('song') || text.includes('cover')) {
            categories['Music'] = (categories['Music'] || 0) + 1;
          } else {
            categories['General'] = (categories['General'] || 0) + 1;
          }
        });

        const topCategories = Object.entries(categories)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([category, count]) => ({ category, count }));

        // Generate content insights
        const contentInsights: string[] = [];
        contentInsights.push(`Uploads ${uploadPattern.toLowerCase()}`);
        contentInsights.push(`Average title length: ${Math.round(avgTitleLength)} characters`);
        
        if (topCategories.length > 0) {
          contentInsights.push(`Primary content: ${topCategories[0].category} (${topCategories[0].count} videos)`);
        }
        
        if (avgTitleLength < 30) {
          contentInsights.push('Consider longer, more descriptive titles');
        } else if (avgTitleLength > 80) {
          contentInsights.push('Consider shorter, more concise titles');
        }

        return {
          uploadPattern,
          avgTitleLength: Math.round(avgTitleLength),
          topCategories,
          contentInsights,
        };
      };

      const generateChannelRecommendations = (
        channelData: any,
        videoMetrics: any,
        growthCategory: any
      ): string[] => {
        const recommendations: string[] = [];
        
        // Based on growth category
        switch (growthCategory.category) {
          case 'emerging':
            recommendations.push('Focus on consistent content creation to build audience');
            recommendations.push('Optimize video titles and thumbnails for discovery');
            break;
          case 'growing':
            recommendations.push('Maintain regular upload schedule to retain momentum');
            recommendations.push('Engage with community through comments and live streams');
            break;
          case 'established':
            recommendations.push('Consider diversifying content formats');
            recommendations.push('Collaborate with other creators in your niche');
            break;
          case 'mature':
            recommendations.push('Focus on quality over quantity');
            recommendations.push('Leverage your influence for brand partnerships');
            break;
        }

        // Based on performance metrics
        if (videoMetrics && videoMetrics.avgEngagementRate < 2) {
          recommendations.push('Work on improving audience engagement through better CTAs');
        }
        
        if (videoMetrics && videoMetrics.avgViews < channelData.subscriberCount * 0.1) {
          recommendations.push('Review content strategy - low view-to-subscriber ratio');
        }

        return recommendations;
      };

      let quotaCost = 0;

      // Get basic channel information
      const channelResponse = await youtubeService.makeAPIRequest('channels', {
        part: 'snippet,statistics,brandingSettings',
        id: channelId,
      });

      quotaCost += 1;

      if (!channelResponse.items || channelResponse.items.length === 0) {
        throw new Error(`Channel not found: ${channelId}`);
      }

      const channelData = channelResponse.items[0];
      
      // Basic channel information
      const basicInfo = {
        id: channelData.id,
        title: channelData.snippet.title,
        description: channelData.snippet.description.substring(0, 500) + 
                    (channelData.snippet.description.length > 500 ? '...' : ''),
        customUrl: channelData.snippet.customUrl,
        publishedAt: channelData.snippet.publishedAt,
        country: channelData.snippet.country,
        defaultLanguage: channelData.snippet.defaultLanguage,
        subscriberCount: parseInt(channelData.statistics?.subscriberCount || '0'),
        videoCount: parseInt(channelData.statistics?.videoCount || '0'),
        viewCount: parseInt(channelData.statistics?.viewCount || '0'),
        hiddenSubscriberCount: channelData.statistics?.hiddenSubscriberCount || false,
      };

      let response: any = {
        channel: basicInfo,
        insights: {
          growthStage: calculateGrowthCategory(basicInfo.subscriberCount, 0, 0),
        },
        metadata: {
          analyzedAt: new Date().toISOString(),
          analysisDepth,
          quotaCost,
        },
      };

      // If basic analysis, return early
      if (analysisDepth === 'basic') {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
          isError: false,
        };
      }

      // Get recent videos for detailed analysis
      let videoMetrics: any = null;
      let contentStrategy: any = null;

      if (includeRecentVideos) {
        try {
          const searchResponse = await youtubeService.makeAPIRequest('search', {
            part: 'id,snippet',
            channelId: channelId,
            type: 'video',
            order: 'date',
            maxResults: videoSampleSize.toString(),
          });

          quotaCost += 100; // Search request

          if (searchResponse.items && searchResponse.items.length > 0) {
            const videoIds = searchResponse.items.map((item: any) => item.id.videoId);
            const videosResponse = await youtubeService.makeAPIRequest('videos', {
              part: 'snippet,statistics,contentDetails',
              id: videoIds.join(','),
            });

            quotaCost += 1; // Videos batch request

            // Calculate video metrics
            let totalViews = 0;
            let totalLikes = 0;
            let totalComments = 0;
            const videoAnalysis = [];

            for (const video of videosResponse.items || []) {
              const stats = video.statistics;
              const viewCount = parseInt(stats?.viewCount || '0');
              const likeCount = parseInt(stats?.likeCount || '0');
              const commentCount = parseInt(stats?.commentCount || '0');

              totalViews += viewCount;
              totalLikes += likeCount;
              totalComments += commentCount;

              videoAnalysis.push({
                ...video,
                engagementRate: viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0,
              });
            }

            const videoCount = videoAnalysis.length;
            const avgViews = videoCount > 0 ? totalViews / videoCount : 0;
            const avgLikes = videoCount > 0 ? totalLikes / videoCount : 0;
            const avgComments = videoCount > 0 ? totalComments / videoCount : 0;
            const avgEngagement = videoCount > 0 ?
              videoAnalysis.reduce((sum, v) => sum + v.engagementRate, 0) / videoCount : 0;

            // Calculate upload frequency
            const oldestVideo = searchResponse.items[searchResponse.items.length - 1];
            const newestVideo = searchResponse.items[0];
            const timeSpan = new Date(newestVideo.snippet.publishedAt).getTime() -
                           new Date(oldestVideo.snippet.publishedAt).getTime();
            const weeksSpan = timeSpan / (1000 * 60 * 60 * 24 * 7);
            const videosPerWeek = weeksSpan > 0 ? videoCount / weeksSpan : 0;

            videoMetrics = {
              analyzedVideoCount: videoCount,
              avgViews: Math.round(avgViews),
              avgLikes: Math.round(avgLikes),
              avgComments: Math.round(avgComments),
              avgEngagementRate: Math.round(avgEngagement * 10000) / 10000,
              videosPerWeek: Math.round(videosPerWeek * 100) / 100,
              subscriberEngagementRate: basicInfo.subscriberCount > 0 ?
                Math.round((avgViews / basicInfo.subscriberCount) * 10000) / 100 : 0,
            };

            // Analyze content strategy
            contentStrategy = analyzeContentStrategy(videosResponse.items || []);

            // Update growth stage calculation with video data
            response.insights.growthStage = calculateGrowthCategory(
              basicInfo.subscriberCount,
              avgViews,
              videosPerWeek
            );
          }
        } catch (error) {
          logger.warn('Failed to fetch recent videos', { error });
        }
      }

      // Add detailed insights
      if (videoMetrics) {
        response.performance = videoMetrics;
      }

      if (contentStrategy) {
        response.contentStrategy = contentStrategy;
      }

      // Generate recommendations
      if (analysisDepth === 'detailed' || analysisDepth === 'comprehensive') {
        response.recommendations = generateChannelRecommendations(
          basicInfo,
          videoMetrics,
          response.insights.growthStage
        );
      }

      // Add comprehensive analysis
      if (analysisDepth === 'comprehensive') {
        response.insights.keyMetrics = {
          totalViews: formatNumberWithCommas(basicInfo.viewCount),
          totalSubscribers: formatNumberWithCommas(basicInfo.subscriberCount),
          totalVideos: formatNumberWithCommas(basicInfo.videoCount),
          avgViewsPerVideo: basicInfo.videoCount > 0 ?
            formatNumberWithCommas(Math.round(basicInfo.viewCount / basicInfo.videoCount)) : '0',
          subscribersPerVideo: basicInfo.videoCount > 0 ?
            formatNumberWithCommas(Math.round(basicInfo.subscriberCount / basicInfo.videoCount)) : '0',
        };

        // Channel age and activity analysis
        const channelCreated = new Date(basicInfo.publishedAt);
        const now = new Date();
        const channelAgeYears = (now.getTime() - channelCreated.getTime()) / (1000 * 60 * 60 * 24 * 365);
        
        response.insights.channelAge = {
          years: Math.round(channelAgeYears * 100) / 100,
          createdAt: basicInfo.publishedAt,
          videosPerYear: channelAgeYears > 0 ? Math.round(basicInfo.videoCount / channelAgeYears) : 0,
          subscribersPerYear: channelAgeYears > 0 ? 
            Math.round(basicInfo.subscriberCount / channelAgeYears) : 0,
        };
      }

      response.metadata.quotaCost = quotaCost;

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
          text: `Error getting channel insights: ${errorMessage}`,
        }],
        isError: true,
      };
    }
  },
};