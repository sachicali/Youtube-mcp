/**
 * Configuration Service
 * 
 * Manages environment variables, server configuration, and validation
 * for the YouTube Scraping MCP Server.
 */

import type { 
  CloudflareEnvironment, 
  ServerConfiguration, 
  ValidationResult, 
  ConfigurationError,
  ConfigurationWarning 
} from '@/types/environment.types';

export class ConfigurationService {
  private env: CloudflareEnvironment;
  private config: ServerConfiguration;
  private validated: boolean = false;

  constructor(env: CloudflareEnvironment) {
    this.env = env;
    this.config = this.createDefaultConfiguration();
  }

  /**
   * Initialize configuration service
   */
  async initialize(): Promise<void> {
    this.config = this.createFromEnvironment(this.env);
    const validation = this.validateConfiguration(this.config);
    
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join(', ');
      throw new Error(`Configuration validation failed: ${errorMessages}`);
    }

    this.validated = true;
  }

  /**
   * Get current configuration
   */
  getConfiguration(): ServerConfiguration {
    if (!this.validated) {
      throw new Error('Configuration not initialized. Call initialize() first.');
    }
    return this.config;
  }

  /**
   * Get environment type
   */
  getEnvironment(): 'development' | 'production' {
    return this.env.ENVIRONMENT;
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugMode(): boolean {
    return this.env.DEBUG_MODE === 'true';
  }

  /**
   * Get YouTube API configuration
   */
  getYouTubeConfig(): ServerConfiguration['apis']['youtube'] {
    return this.config.apis.youtube;
  }

  /**
   * Get cache configuration
   */
  getCacheConfig(): ServerConfiguration['cache'] {
    return this.config.cache;
  }

  /**
   * Get rate limiting configuration
   */
  getRateLimitConfig(): ServerConfiguration['rateLimit'] {
    return this.config.rateLimit;
  }

  /**
   * Create configuration from environment variables
   */
  private createFromEnvironment(env: CloudflareEnvironment): ServerConfiguration {
    // Cloudflare Workers environment variables
    const youtubeApiKey = env.YOUTUBE_API_KEY;
    
    if (!youtubeApiKey) {
      throw new Error('YOUTUBE_API_KEY environment variable is required');
    }

    return {
      environment: env.ENVIRONMENT || 'development',
      debug: env.DEBUG_MODE === 'true',
      
      apis: {
        youtube: {
          apiKey: youtubeApiKey,
          baseUrl: 'https://www.googleapis.com/youtube/v3',
          quotaLimit: 10000, // YouTube API v3 daily quota
          requestsPerSecond: 10, // Conservative rate limiting
        },
        oauth: env.OAUTH_CLIENT_ID && env.OAUTH_CLIENT_SECRET ? {
          clientId: env.OAUTH_CLIENT_ID,
          clientSecret: env.OAUTH_CLIENT_SECRET,
          redirectUri: 'urn:ietf:wg:oauth:2.0:oob', // For installed applications
          scopes: [
            'https://www.googleapis.com/auth/youtube.readonly',
            'https://www.googleapis.com/auth/youtube.force-ssl'
          ],
        } : undefined,
        transcript: env.YTDLP_SERVICE_URL ? {
          serviceUrl: env.YTDLP_SERVICE_URL,
          timeout: 30000, // 30 second timeout
          retries: 3,
        } : undefined,
      },
      
      cache: {
        enabled: true,
        namespaces: {
          cache: env.CACHE_KV,
          rateLimits: env.RATE_LIMITS,
        },
        ttl: {
          transcripts: 86400, // 24 hours
          videoMetrics: 3600, // 1 hour
          channelAnalysis: 7200, // 2 hours
          trends: 1800, // 30 minutes
          searches: 600, // 10 minutes
        },
      },
      
      rateLimit: {
        enabled: true,
        quotaLimit: 10000, // YouTube API daily quota
        requestsPerMinute: 600, // 10 requests per second * 60
        burstLimit: 50, // Allow bursts up to 50 requests
        exponentialBackoff: {
          baseDelay: 1000, // 1 second base delay
          maxDelay: 60000, // 60 seconds maximum
          backoffFactor: 2, // Double delay each retry
          maxRetries: 5,
        },
      },
      
      cors: {
        enabled: true,
        origins: ['*'], // Allow all origins for MCP
        methods: ['GET', 'POST', 'OPTIONS'],
        headers: ['Content-Type', 'Authorization'],
      },
      
      monitoring: {
        enabled: true,
        logLevel: env.DEBUG_MODE === 'true' ? 'debug' : 'info',
        errorReporting: env.ENVIRONMENT === 'production',
        performanceTracking: true,
      },
    };
  }

  /**
   * Create default configuration
   */
  private createDefaultConfiguration(): ServerConfiguration {
    return {
      environment: 'development',
      debug: true,
      
      apis: {
        youtube: {
          apiKey: '',
          baseUrl: 'https://www.googleapis.com/youtube/v3',
          quotaLimit: 10000,
          requestsPerSecond: 10,
        },
      },
      
      cache: {
        enabled: false,
        namespaces: {
          cache: {} as any, // Will be replaced during initialization
          rateLimits: {} as any,
        },
        ttl: {
          transcripts: 86400,
          videoMetrics: 3600,
          channelAnalysis: 7200,
          trends: 1800,
          searches: 600,
        },
      },
      
      rateLimit: {
        enabled: true,
        quotaLimit: 10000,
        requestsPerMinute: 600,
        burstLimit: 50,
        exponentialBackoff: {
          baseDelay: 1000,
          maxDelay: 60000,
          backoffFactor: 2,
          maxRetries: 5,
        },
      },
      
      cors: {
        enabled: true,
        origins: ['*'],
        methods: ['GET', 'POST', 'OPTIONS'],
        headers: ['Content-Type', 'Authorization'],
      },
      
      monitoring: {
        enabled: true,
        logLevel: 'info',
        errorReporting: false,
        performanceTracking: true,
      },
    };
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(config: ServerConfiguration): ValidationResult {
    const errors: ConfigurationError[] = [];
    const warnings: ConfigurationWarning[] = [];

    // Validate YouTube API key (already validated in createFromEnvironment)

    // Validate quota limits
    if (config.apis.youtube.quotaLimit <= 0) {
      errors.push({
        field: 'apis.youtube.quotaLimit',
        message: 'YouTube API quota limit must be positive',
        severity: 'error',
      });
    }

    // Validate rate limiting
    if (config.rateLimit.requestsPerMinute <= 0) {
      errors.push({
        field: 'rateLimit.requestsPerMinute',
        message: 'Requests per minute must be positive',
        severity: 'error',
      });
    }

    // Check for OAuth configuration completeness
    if (config.apis.oauth) {
      if (!config.apis.oauth.clientId || !config.apis.oauth.clientSecret) {
        warnings.push({
          field: 'apis.oauth',
          message: 'Incomplete OAuth configuration - some features may be limited',
          impact: 'functionality',
        });
      }
    }

    // Validate cache TTL values
    Object.entries(config.cache.ttl).forEach(([key, value]) => {
      if (value <= 0) {
        warnings.push({
          field: `cache.ttl.${key}`,
          message: `Cache TTL for ${key} should be positive`,
          impact: 'performance',
        });
      }
    });

    // Performance warnings
    if (config.apis.youtube.requestsPerSecond > 100) {
      warnings.push({
        field: 'apis.youtube.requestsPerSecond',
        message: 'High request rate may cause API throttling',
        impact: 'performance',
      });
    }

    // Security warnings for production
    if (config.environment === 'production') {
      if (config.cors.origins.includes('*')) {
        warnings.push({
          field: 'cors.origins',
          message: 'Wildcard CORS origins in production may pose security risk',
          impact: 'security',
        });
      }

      if (config.debug) {
        warnings.push({
          field: 'debug',
          message: 'Debug mode enabled in production',
          impact: 'security',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get configuration value by path
   */
  get<T>(path: string): T | undefined {
    const keys = path.split('.');
    let current: any = this.config;
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }
    
    return current as T;
  }

  /**
   * Check if configuration has a specific path
   */
  has(path: string): boolean {
    return this.get(path) !== undefined;
  }

  /**
   * Update configuration value (for runtime updates)
   */
  set<T>(path: string, value: T): void {
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    if (!lastKey) {
      throw new Error('Invalid configuration path');
    }
    
    let current: any = this.config;
    for (const key of keys) {
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[lastKey] = value;
  }

  /**
   * Reload configuration from environment
   */
  async reload(): Promise<void> {
    await this.initialize();
  }

  /**
   * Get current validation status
   */
  isValid(): boolean {
    return this.validated;
  }

  /**
   * Get validation warnings
   */
  getValidationWarnings(): ConfigurationWarning[] {
    const validation = this.validateConfiguration(this.config);
    return validation.warnings;
  }
}
