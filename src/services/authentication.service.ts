/**
 * Authentication Service for Remote MCP
 * Handles API key validation, user sessions, and quota management
 */

import type { CloudflareEnvironment } from '../types/cloudflare.types';
import type { UserSession, UserPermissions, QuotaInfo } from '../types/remote-mcp.types';
import type { LoggerUtil } from '../utils/logger.util';
import type { ErrorHandlerUtil } from '../utils/error-handler.util';

export class AuthenticationService {
  private sessionCache: Map<string, UserSession> = new Map();
  private apiKeyCache: Map<string, UserSession> = new Map();
  private cacheTimeout: number = 300000; // 5 minutes

  constructor(
    private env: CloudflareEnvironment,
    private logger: LoggerUtil,
    private errorHandler: ErrorHandlerUtil
  ) {}

  /**
   * Validate API key and return user session
   */
  async validateApiKey(apiKey: string): Promise<UserSession | null> {
    try {
      // Check cache first
      const cachedSession = this.apiKeyCache.get(apiKey);
      if (cachedSession && this.isSessionValid(cachedSession)) {
        return cachedSession;
      }

      // Validate API key format
      if (!this.isValidApiKeyFormat(apiKey)) {
        this.logger.warn('Invalid API key format', { apiKey: apiKey.substring(0, 8) + '...' });
        return null;
      }

      // Check KV storage for API key
      const sessionData = await this.env.YOUTUBE_MCP_KV.get(`apikey:${apiKey}`, 'json') as UserSession | null;
      
      if (!sessionData) {
        this.logger.warn('API key not found', { apiKey: apiKey.substring(0, 8) + '...' });
        return null;
      }

      // Create/update session
      const session: UserSession = {
        ...sessionData,
        lastActivity: new Date().toISOString(),
      };

      // Update session in KV
      await this.updateUserSession(session);

      // Cache the session
      this.sessionCache.set(session.id, session);
      this.apiKeyCache.set(apiKey, session);

      this.logger.info('API key validated successfully', {
        userId: session.id,
        quotaUsed: session.quotaUsed,
        quotaLimit: session.quotaLimit
      });

      return session;

    } catch (error) {
      this.logger.error('API key validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        apiKey: apiKey.substring(0, 8) + '...'
      });
      return null;
    }
  }

  /**
   * Create a new user session with API key
   */
  async createUserSession(
    apiKey: string, 
    permissions: UserPermissions = this.getDefaultPermissions()
  ): Promise<UserSession> {
    try {
      const userId = crypto.randomUUID();
      const now = new Date().toISOString();

      const session: UserSession = {
        id: userId,
        apiKey,
        quotaUsed: 0,
        quotaLimit: 10000 * permissions.quotaMultiplier, // Base 10k per day
        createdAt: now,
        lastActivity: now,
        permissions,
      };

      // Store in KV
      await Promise.all([
        this.env.YOUTUBE_MCP_KV.put(`session:${userId}`, JSON.stringify(session)),
        this.env.YOUTUBE_MCP_KV.put(`apikey:${apiKey}`, JSON.stringify(session)),
        this.env.YOUTUBE_MCP_KV.put(`quota:${userId}`, JSON.stringify({
          used: 0,
          limit: session.quotaLimit,
          resetAt: this.getNextQuotaReset(),
          lastUpdated: now
        }))
      ]);

      // Cache the session
      this.sessionCache.set(userId, session);
      this.apiKeyCache.set(apiKey, session);

      this.logger.info('User session created', {
        userId,
        quotaLimit: session.quotaLimit,
        permissions: permissions
      });

      return session;

    } catch (error) {
      this.logger.error('Failed to create user session', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get user quota usage information
   */
  async getUserQuotaUsage(userId: string): Promise<QuotaInfo> {
    try {
      // Check cache first
      const session = this.sessionCache.get(userId);
      if (session) {
        return {
          used: session.quotaUsed,
          limit: session.quotaLimit,
          resetAt: this.getNextQuotaReset(),
          warningThreshold: 80
        };
      }

      // Get from KV storage
      const quotaData = await this.env.YOUTUBE_MCP_KV.get(`quota:${userId}`, 'json') as QuotaInfo | null;
      
      if (!quotaData) {
        // Return default quota if not found
        return {
          used: 0,
          limit: 10000,
          resetAt: this.getNextQuotaReset(),
          warningThreshold: 80
        };
      }

      return quotaData;

    } catch (error) {
      this.logger.error('Failed to get user quota', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Return safe defaults on error
      return {
        used: 0,
        limit: 10000,
        resetAt: this.getNextQuotaReset(),
        warningThreshold: 80
      };
    }
  }

  /**
   * Update user quota usage
   */
  async updateQuotaUsage(userId: string, quotaUsed: number): Promise<QuotaInfo> {
    try {
      const currentQuota = await this.getUserQuotaUsage(userId);
      const newUsage = currentQuota.used + quotaUsed;

      const updatedQuota: QuotaInfo = {
        ...currentQuota,
        used: newUsage,
        lastUpdated: new Date().toISOString()
      };

      // Update in KV storage
      await this.env.YOUTUBE_MCP_KV.put(`quota:${userId}`, JSON.stringify(updatedQuota));

      // Update cached session if exists
      const session = this.sessionCache.get(userId);
      if (session) {
        session.quotaUsed = newUsage;
        session.lastActivity = new Date().toISOString();
      }

      // Check if quota warning threshold is exceeded
      const usagePercentage = (newUsage / updatedQuota.limit) * 100;
      if (usagePercentage >= updatedQuota.warningThreshold) {
        this.logger.warn('Quota usage warning', {
          userId,
          used: newUsage,
          limit: updatedQuota.limit,
          percentage: Math.round(usagePercentage)
        });
      }

      return updatedQuota;

    } catch (error) {
      this.logger.error('Failed to update quota usage', {
        userId,
        quotaUsed,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Check if user has quota available
   */
  async hasQuotaAvailable(userId: string, requiredQuota: number = 1): Promise<boolean> {
    try {
      const quotaInfo = await this.getUserQuotaUsage(userId);
      return (quotaInfo.used + requiredQuota) <= quotaInfo.limit;
    } catch (error) {
      this.logger.error('Failed to check quota availability', {
        userId,
        requiredQuota,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false; // Fail safely
    }
  }

  /**
   * Reset user quota (daily reset)
   */
  async resetUserQuota(userId: string): Promise<void> {
    try {
      const session = await this.getUserSession(userId);
      if (!session) {
        throw new Error('User session not found');
      }

      const resetQuota: QuotaInfo = {
        used: 0,
        limit: session.quotaLimit,
        resetAt: this.getNextQuotaReset(),
        lastUpdated: new Date().toISOString(),
        warningThreshold: 80
      };

      // Update in KV storage
      await this.env.YOUTUBE_MCP_KV.put(`quota:${userId}`, JSON.stringify(resetQuota));

      // Update cached session
      if (this.sessionCache.has(userId)) {
        const cachedSession = this.sessionCache.get(userId)!;
        cachedSession.quotaUsed = 0;
        cachedSession.lastActivity = new Date().toISOString();
      }

      this.logger.info('User quota reset', {
        userId,
        newLimit: resetQuota.limit,
        nextReset: resetQuota.resetAt
      });

    } catch (error) {
      this.logger.error('Failed to reset user quota', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get user session by ID
   */
  async getUserSession(userId: string): Promise<UserSession | null> {
    try {
      // Check cache first
      const cachedSession = this.sessionCache.get(userId);
      if (cachedSession && this.isSessionValid(cachedSession)) {
        return cachedSession;
      }

      // Get from KV storage
      const sessionData = await this.env.YOUTUBE_MCP_KV.get(`session:${userId}`, 'json') as UserSession | null;
      
      if (sessionData) {
        // Cache the session
        this.sessionCache.set(userId, sessionData);
        return sessionData;
      }

      return null;

    } catch (error) {
      this.logger.error('Failed to get user session', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Update user session
   */
  async updateUserSession(session: UserSession): Promise<void> {
    try {
      session.lastActivity = new Date().toISOString();

      // Update in KV storage
      await Promise.all([
        this.env.YOUTUBE_MCP_KV.put(`session:${session.id}`, JSON.stringify(session)),
        this.env.YOUTUBE_MCP_KV.put(`apikey:${session.apiKey}`, JSON.stringify(session))
      ]);

      // Update cache
      this.sessionCache.set(session.id, session);
      this.apiKeyCache.set(session.apiKey, session);

    } catch (error) {
      this.logger.error('Failed to update user session', {
        userId: session.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Invalidate user session
   */
  async invalidateSession(userId: string): Promise<void> {
    try {
      const session = await this.getUserSession(userId);
      if (!session) {
        return;
      }

      // Remove from KV storage
      await Promise.all([
        this.env.YOUTUBE_MCP_KV.delete(`session:${userId}`),
        this.env.YOUTUBE_MCP_KV.delete(`apikey:${session.apiKey}`),
        this.env.YOUTUBE_MCP_KV.delete(`quota:${userId}`)
      ]);

      // Remove from cache
      this.sessionCache.delete(userId);
      this.apiKeyCache.delete(session.apiKey);

      this.logger.info('User session invalidated', { userId });

    } catch (error) {
      this.logger.error('Failed to invalidate session', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check if API key format is valid
   */
  private isValidApiKeyFormat(apiKey: string): boolean {
    // API key should be at least 32 characters and contain only alphanumeric characters
    return /^[a-zA-Z0-9_-]{32,}$/.test(apiKey);
  }

  /**
   * Check if session is still valid
   */
  private isSessionValid(session: UserSession): boolean {
    const lastActivity = new Date(session.lastActivity);
    const now = new Date();
    const timeDiff = now.getTime() - lastActivity.getTime();
    
    // Session is valid if last activity was within cache timeout
    return timeDiff < this.cacheTimeout;
  }

  /**
   * Get default user permissions
   */
  private getDefaultPermissions(): UserPermissions {
    return {
      canUseTools: [
        'getVideoTranscript',
        'getVideoAnalytics',
        'getChannelAnalytics',
        'getVideoComments',
        'searchVideos',
        'getTrendingVideos',
        'getCompetitorAnalysis'
      ],
      canAccessSharedCache: true,
      canReceiveNotifications: true,
      quotaMultiplier: 1.0
    };
  }

  /**
   * Get next quota reset time (daily at midnight UTC)
   */
  private getNextQuotaReset(): string {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = new Date();
    
    for (const [userId, session] of this.sessionCache.entries()) {
      if (!this.isSessionValid(session)) {
        this.sessionCache.delete(userId);
        this.apiKeyCache.delete(session.apiKey);
      }
    }
  }

  /**
   * Get authentication statistics
   */
  getAuthStats(): {
    activeSessions: number;
    cachedSessions: number;
    totalQuotaUsed: number;
    averageQuotaUsage: number;
  } {
    this.cleanupExpiredCache();
    
    const sessions = Array.from(this.sessionCache.values());
    const totalQuotaUsed = sessions.reduce((sum, session) => sum + session.quotaUsed, 0);
    const averageQuotaUsage = sessions.length > 0 ? totalQuotaUsed / sessions.length : 0;

    return {
      activeSessions: sessions.filter(s => this.isSessionValid(s)).length,
      cachedSessions: sessions.length,
      totalQuotaUsed,
      averageQuotaUsage: Math.round(averageQuotaUsage)
    };
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup(): Promise<void> {
    // Clear all caches
    this.sessionCache.clear();
    this.apiKeyCache.clear();
    
    this.logger.info('Authentication service cleaned up');
  }
}