/**
 * Analyze Channel Performance Tool
 * Analyzes channel performance and finds top-performing videos with detailed insights
 */

import type { MCPTool, MCPToolResponse, MCPContext } from '@/types/mcp.types';

export const analyzeChannelPerformanceTool: MCPTool = {
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

      // Helper function to calculate consistency score
      const calculateConsistencyScore = (videos: Array<{ performanceScore: number }>): number => {
        if (videos.length < 2) return 100;
        
        const scores = videos.map(v => v.performanceScore);
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        const standardDeviation = Math.sqrt(variance);
        
        // Convert to consistency score (lower deviation = higher consistency)
        const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;
        const consistencyScore = Math.max(0, 100 - (coefficientOfVariation * 100));
        
        return Math.round(consistencyScore * 100) / 100;
      };

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
            consistencyScore: calculateConsistencyScore(videos),
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
};