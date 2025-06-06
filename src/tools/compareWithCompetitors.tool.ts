/**
 * Compare With Competitors Tool
 * Compares multiple channels for comprehensive competitive analysis
 */

import type { MCPTool, MCPToolResponse, MCPContext } from '@/types/mcp.types';

export const compareWithCompetitorsTool: MCPTool = {
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

      // Helper functions
      const calculateConsistencyScore = (videos: Array<{ performanceScore: number }>): number => {
        if (videos.length < 2) return 100;
        
        const scores = videos.map(v => v.performanceScore);
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        const standardDeviation = Math.sqrt(variance);
        
        const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;
        const consistencyScore = Math.max(0, 100 - (coefficientOfVariation * 100));
        
        return Math.round(consistencyScore * 100) / 100;
      };

      const parseDurationToSeconds = (duration: string): number => {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;
        
        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');
        
        return hours * 3600 + minutes * 60 + seconds;
      };

      const identifyChannelStrengths = (
        avgViews: number,
        avgEngagement: number,
        subscriberEngagementRate: number,
        videosPerWeek: number
      ): string[] => {
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
      };

      const analyzeEngagementDistribution = (videoMetrics: Array<{ engagementScore: number; viewCount: number }>): {
        high: number;
        medium: number;
        low: number;
        averageEngagement: number;
      } => {
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
      };

      const performCompetitiveComparison = (channelAnalyses: Array<any>): {
        leader: any;
        rankings: Array<{ rank: number; channel: any; score: number }>;
        insights: string[];
      } => {
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
      };

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
            const duration = parseDurationToSeconds(video.contentDetails?.duration || 'PT0S');

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
            strengths: identifyChannelStrengths(avgViews, avgEngagement, subscriberEngagementRate, videosPerWeek),
            ...(includeEngagement && {
              engagementAnalysis: {
                consistency: calculateConsistencyScore(videoMetrics.map(v => ({ performanceScore: v.viewCount }))),
                topPerformingVideoViews: Math.max(...videoMetrics.map(v => v.viewCount)),
                engagementDistribution: analyzeEngagementDistribution(videoMetrics),
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
      const comparison = performCompetitiveComparison(channelAnalyses);

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
};