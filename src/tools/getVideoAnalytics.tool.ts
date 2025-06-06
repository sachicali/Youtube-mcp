/**
 * Get Video Analytics Tool
 * Provides comprehensive video analytics including performance metrics, engagement analysis, and optimization insights
 */

import type { MCPTool, MCPToolResponse, MCPContext } from '@/types/mcp.types';

export const getVideoAnalyticsTool: MCPTool = {
  name: 'getVideoAnalytics',
  description: 'Get comprehensive video analytics including performance metrics, engagement analysis, and optimization insights',
  inputSchema: {
    type: 'object',
    properties: {
      videoUrl: {
        type: 'string',
        description: 'YouTube video URL or direct video ID (supports youtube.com/watch, youtu.be, and direct video IDs)',
        minLength: 11,
      },
      includeTranscript: {
        type: 'boolean',
        description: 'Include transcript analysis in the analytics',
        default: false,
      },
      analysisDepth: {
        type: 'string',
        description: 'Depth of analytics analysis',
        enum: ['basic', 'detailed', 'comprehensive'],
        default: 'detailed',
      },
      compareWithChannel: {
        type: 'boolean',
        description: 'Compare video performance with channel averages',
        default: true,
      },
    },
    required: ['videoUrl'],
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
        videoUrl: string;
        includeTranscript?: boolean;
        analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
        compareWithChannel?: boolean;
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

      const videoUrl = validatedInput.videoUrl;
      const includeTranscript = validatedInput.includeTranscript || false;
      const analysisDepth = validatedInput.analysisDepth || 'detailed';
      const compareWithChannel = validatedInput.compareWithChannel !== false;

      // Helper functions
      const parseYouTubeUrl = (url: string): { videoId: string; format: string } => {
        const patterns = [
          { 
            regex: /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
            format: 'standard'
          },
          { 
            regex: /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
            format: 'shorts'
          }
        ];
        
        // If it's already a video ID
        if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
          return { videoId: url, format: 'direct' };
        }
        
        for (const pattern of patterns) {
          const match = url.match(pattern.regex);
          if (match) {
            return { videoId: match[1], format: pattern.format };
          }
        }
        
        throw new Error(`Invalid YouTube URL format: ${url}`);
      };

      const parseDurationToSeconds = (duration: string): number => {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;
        
        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');
        
        return hours * 3600 + minutes * 60 + seconds;
      };

      const formatDuration = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
      };

      const calculateEngagementMetrics = (stats: any): {
        engagementRate: number;
        likeToViewRatio: number;
        commentToViewRatio: number;
        likeToDislikeRatio: number;
        engagementScore: number;
      } => {
        const viewCount = parseInt(stats?.viewCount || '0');
        const likeCount = parseInt(stats?.likeCount || '0');
        const commentCount = parseInt(stats?.commentCount || '0');

        const likeToViewRatio = viewCount > 0 ? (likeCount / viewCount) * 100 : 0;
        const commentToViewRatio = viewCount > 0 ? (commentCount / viewCount) * 100 : 0;
        const engagementRate = likeToViewRatio + commentToViewRatio;

        // Engagement score (weighted: likes 60%, comments 40%)
        const engagementScore = (likeToViewRatio * 0.6) + (commentToViewRatio * 0.4);

        return {
          engagementRate: Math.round(engagementRate * 10000) / 10000,
          likeToViewRatio: Math.round(likeToViewRatio * 10000) / 10000,
          commentToViewRatio: Math.round(commentToViewRatio * 10000) / 10000,
          likeToDislikeRatio: 0, // YouTube no longer provides dislike counts
          engagementScore: Math.round(engagementScore * 10000) / 10000,
        };
      };

      const categorizePerformance = (
        viewCount: number,
        engagementRate: number,
        durationSeconds: number,
        publishedHoursAgo: number
      ): {
        category: 'viral' | 'high' | 'good' | 'average' | 'low';
        factors: string[];
        recommendations: string[];
      } => {
        const factors: string[] = [];
        const recommendations: string[] = [];

        // Calculate views per hour
        const viewsPerHour = publishedHoursAgo > 0 ? viewCount / publishedHoursAgo : viewCount;

        let category: 'viral' | 'high' | 'good' | 'average' | 'low' = 'low';

        // Performance categorization
        if (viewCount > 1000000 && engagementRate > 3) {
          category = 'viral';
          factors.push('Exceptional view count', 'High engagement');
        } else if (viewCount > 100000 || engagementRate > 5) {
          category = 'high';
          if (viewCount > 100000) factors.push('High view count');
          if (engagementRate > 5) factors.push('Excellent engagement');
        } else if (viewCount > 10000 || engagementRate > 3) {
          category = 'good';
          if (viewCount > 10000) factors.push('Good view count');
          if (engagementRate > 3) factors.push('Good engagement');
        } else if (viewCount > 1000 || engagementRate > 1) {
          category = 'average';
          if (viewCount > 1000) factors.push('Moderate views');
          if (engagementRate > 1) factors.push('Basic engagement');
        } else {
          category = 'low';
          factors.push('Low visibility');
        }

        // Generate recommendations based on performance
        if (category === 'low' || category === 'average') {
          if (engagementRate < 1) {
            recommendations.push('Improve call-to-actions to boost engagement');
          }
          if (durationSeconds > 600) {
            recommendations.push('Consider shorter, more concise content');
          }
          recommendations.push('Optimize title and thumbnail for better click-through rate');
          recommendations.push('Promote video on social media and community posts');
        } else if (category === 'good') {
          recommendations.push('Analyze what worked well and replicate in future videos');
          recommendations.push('Consider creating follow-up content on similar topics');
        } else {
          recommendations.push('Study this video\'s success factors for future content');
          recommendations.push('Consider creating a series on this topic');
        }

        return { category, factors, recommendations };
      };

      const analyzeContentOptimization = (
        snippet: any,
        stats: any,
        durationSeconds: number
      ): {
        titleOptimization: { score: number; suggestions: string[] };
        descriptionOptimization: { score: number; suggestions: string[] };
        tagOptimization: { score: number; suggestions: string[] };
        thumbnailOptimization: { score: number; suggestions: string[] };
      } => {
        const title = snippet.title || '';
        const description = snippet.description || '';
        const tags = snippet.tags || [];

        // Title optimization
        const titleScore = Math.min(100, 
          (title.length > 30 ? 25 : 0) +
          (title.length < 100 ? 25 : 0) +
          (/[!?:]/.test(title) ? 25 : 0) +
          (title.split(' ').length > 3 ? 25 : 0)
        );

        const titleSuggestions: string[] = [];
        if (title.length < 30) titleSuggestions.push('Consider a longer, more descriptive title');
        if (title.length > 100) titleSuggestions.push('Shorten title for better mobile display');
        if (!/[!?:]/.test(title)) titleSuggestions.push('Add emotional punctuation for impact');
        if (!title.toLowerCase().includes('how') && !title.toLowerCase().includes('what') && !title.toLowerCase().includes('why')) {
          titleSuggestions.push('Consider question-based titles for better engagement');
        }

        // Description optimization
        const descriptionScore = Math.min(100,
          (description.length > 100 ? 30 : 0) +
          (description.includes('http') ? 20 : 0) +
          (description.split('\n').length > 3 ? 25 : 0) +
          (description.length > 500 ? 25 : 0)
        );

        const descriptionSuggestions: string[] = [];
        if (description.length < 100) descriptionSuggestions.push('Add more detailed description');
        if (!description.includes('http')) descriptionSuggestions.push('Include relevant links');
        if (description.split('\n').length <= 3) descriptionSuggestions.push('Use line breaks for better readability');

        // Tag optimization
        const tagScore = Math.min(100,
          (tags.length > 5 ? 40 : tags.length * 8) +
          (tags.some((tag: string) => tag.length > 2) ? 30 : 0) +
          (tags.length < 15 ? 30 : 0)
        );

        const tagSuggestions: string[] = [];
        if (tags.length < 5) tagSuggestions.push('Add more relevant tags');
        if (tags.length > 15) tagSuggestions.push('Focus on most relevant tags only');
        if (tags.every((tag: string) => tag.length <= 2)) tagSuggestions.push('Use longer, more specific tags');

        // Thumbnail optimization (basic analysis based on available data)
        const thumbnailScore = snippet.thumbnails?.maxres ? 80 : 60;
        const thumbnailSuggestions: string[] = [];
        if (!snippet.thumbnails?.maxres) {
          thumbnailSuggestions.push('Upload a custom high-resolution thumbnail');
        }
        thumbnailSuggestions.push('Ensure thumbnail is visually appealing and represents content');

        return {
          titleOptimization: { score: titleScore, suggestions: titleSuggestions },
          descriptionOptimization: { score: descriptionScore, suggestions: descriptionSuggestions },
          tagOptimization: { score: tagScore, suggestions: tagSuggestions },
          thumbnailOptimization: { score: thumbnailScore, suggestions: thumbnailSuggestions },
        };
      };

      // Parse video URL
      const { videoId, format } = parseYouTubeUrl(videoUrl);
      let quotaCost = 0;

      // Get video details
      const videoResponse = await youtubeService.makeAPIRequest('videos', {
        part: 'snippet,statistics,contentDetails,status',
        id: videoId,
      });

      quotaCost += 1;

      if (!videoResponse.items || videoResponse.items.length === 0) {
        throw new Error(`Video not found: ${videoId}`);
      }

      const video = videoResponse.items[0];
      const snippet = video.snippet;
      const stats = video.statistics;
      const contentDetails = video.contentDetails;

      // Parse duration and calculate time since publication
      const durationSeconds = parseDurationToSeconds(contentDetails?.duration || 'PT0S');
      const publishedAt = new Date(snippet.publishedAt);
      const now = new Date();
      const hoursAgo = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);

      // Calculate engagement metrics
      const engagement = calculateEngagementMetrics(stats);

      // Categorize performance
      const performance = categorizePerformance(
        parseInt(stats?.viewCount || '0'),
        engagement.engagementRate,
        durationSeconds,
        hoursAgo
      );

      // Basic video information
      const basicAnalytics = {
        video: {
          id: videoId,
          title: snippet.title,
          description: snippet.description.substring(0, 300) + 
                      (snippet.description.length > 300 ? '...' : ''),
          channelId: snippet.channelId,
          channelTitle: snippet.channelTitle,
          publishedAt: snippet.publishedAt,
          duration: formatDuration(durationSeconds),
          durationSeconds,
          hoursAgo: Math.round(hoursAgo * 10) / 10,
          category: snippet.categoryId,
          format,
        },
        metrics: {
          viewCount: parseInt(stats?.viewCount || '0'),
          likeCount: parseInt(stats?.likeCount || '0'),
          commentCount: parseInt(stats?.commentCount || '0'),
          favoriteCount: parseInt(stats?.favoriteCount || '0'),
        },
        engagement: engagement,
        performance: {
          category: performance.category,
          factors: performance.factors,
          viewsPerHour: hoursAgo > 0 ? Math.round(parseInt(stats?.viewCount || '0') / hoursAgo) : parseInt(stats?.viewCount || '0'),
        },
      };

      let response: any = {
        analytics: basicAnalytics,
        metadata: {
          analyzedAt: new Date().toISOString(),
          analysisDepth,
          quotaCost,
        },
      };

      // Return early for basic analysis
      if (analysisDepth === 'basic') {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
          isError: false,
        };
      }

      // Add detailed analysis
      response.optimization = analyzeContentOptimization(snippet, stats, durationSeconds);
      response.recommendations = performance.recommendations;

      // Channel comparison
      if (compareWithChannel) {
        try {
          const channelVideosResponse = await youtubeService.makeAPIRequest('search', {
            part: 'id',
            channelId: snippet.channelId,
            type: 'video',
            order: 'date',
            maxResults: '10',
          });

          quotaCost += 100; // Search request

          if (channelVideosResponse.items && channelVideosResponse.items.length > 1) {
            const otherVideoIds = channelVideosResponse.items
              .map((item: any) => item.id.videoId)
              .filter((id: string) => id !== videoId)
              .slice(0, 5);

            if (otherVideoIds.length > 0) {
              const otherVideosResponse = await youtubeService.makeAPIRequest('videos', {
                part: 'statistics',
                id: otherVideoIds.join(','),
              });

              quotaCost += 1;

              const channelAvgs = {
                avgViews: 0,
                avgLikes: 0,
                avgComments: 0,
                avgEngagement: 0,
              };

              let validVideos = 0;
              for (const otherVideo of otherVideosResponse.items || []) {
                const otherStats = otherVideo.statistics;
                const views = parseInt(otherStats?.viewCount || '0');
                const likes = parseInt(otherStats?.likeCount || '0');
                const comments = parseInt(otherStats?.commentCount || '0');

                if (views > 0) {
                  channelAvgs.avgViews += views;
                  channelAvgs.avgLikes += likes;
                  channelAvgs.avgComments += comments;
                  channelAvgs.avgEngagement += views > 0 ? ((likes + comments) / views) * 100 : 0;
                  validVideos++;
                }
              }

              if (validVideos > 0) {
                channelAvgs.avgViews = Math.round(channelAvgs.avgViews / validVideos);
                channelAvgs.avgLikes = Math.round(channelAvgs.avgLikes / validVideos);
                channelAvgs.avgComments = Math.round(channelAvgs.avgComments / validVideos);
                channelAvgs.avgEngagement = Math.round((channelAvgs.avgEngagement / validVideos) * 10000) / 10000;

                const currentViews = parseInt(stats?.viewCount || '0');
                const viewsComparison = channelAvgs.avgViews > 0 ? 
                  ((currentViews - channelAvgs.avgViews) / channelAvgs.avgViews) * 100 : 0;
                const engagementComparison = channelAvgs.avgEngagement > 0 ?
                  ((engagement.engagementRate - channelAvgs.avgEngagement) / channelAvgs.avgEngagement) * 100 : 0;

                response.channelComparison = {
                  channelAverages: channelAvgs,
                  performance: {
                    viewsVsAverage: Math.round(viewsComparison * 100) / 100,
                    engagementVsAverage: Math.round(engagementComparison * 100) / 100,
                    isAboveAverage: currentViews > channelAvgs.avgViews && engagement.engagementRate > channelAvgs.avgEngagement,
                  },
                  basedOnVideos: validVideos,
                };
              }
            }
          }
        } catch (error) {
          logger.warn('Failed to fetch channel comparison data', { error });
        }
      }

      // Include transcript analysis if requested
      if (includeTranscript && analysisDepth === 'comprehensive') {
        try {
          const transcript = await youtubeService.getVideoTranscript(videoId, 'en');
          
          if (transcript.segments && transcript.segments.length > 0) {
            response.transcriptAnalysis = {
              available: true,
              wordCount: transcript.wordCount,
              estimatedReadingTime: transcript.estimatedReadingTime,
              language: transcript.language,
              isAutoGenerated: transcript.isAutoGenerated,
              keyInsights: [
                `Transcript contains ${transcript.wordCount} words`,
                `Estimated reading time: ${transcript.estimatedReadingTime} minutes`,
                transcript.isAutoGenerated ? 'Auto-generated transcript' : 'Manual transcript available',
              ],
            };
          } else {
            response.transcriptAnalysis = {
              available: false,
              message: 'Transcript not available for this video',
            };
          }
        } catch (error) {
          response.transcriptAnalysis = {
            available: false,
            error: 'Failed to fetch transcript',
          };
        }
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
          text: `Error analyzing video: ${errorMessage}`,
        }],
        isError: true,
      };
    }
  },
};