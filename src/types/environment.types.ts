/**
 * Unified Environment Types
 * Comprehensive type definitions for environment configuration across all services
 */

/**
 * Core environment configuration interface
 * This is the master interface that all services expect
 */
export interface CloudflareEnvironment {
  // Required core variables
  YOUTUBE_API_KEY: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';

  // Debug configuration
  DEBUG?: string;
  DEBUG_MODE?: boolean;

  // Cloudflare KV namespaces (required)
  YOUTUBE_MCP_KV: KVNamespace;
  CACHE_KV?: KVNamespace;

  // OAuth configuration (optional)
  OAUTH_CLIENT_ID?: string;
  OAUTH_CLIENT_SECRET?: string;

  // External services
  YTDLP_SERVICE_URL?: string;

  // Rate limiting configuration
  RATE_LIMITS?: {
    requests: number;
    window: number;
  };
  RATE_LIMIT_REQUESTS?: string;
  RATE_LIMIT_WINDOW?: string;

  // WebSocket configuration
  WS_MAX_CONNECTIONS?: string;
  WS_HEARTBEAT_INTERVAL?: string;
  WS_CONNECTION_TIMEOUT?: string;

  // Authentication configuration
  AUTH_API_KEY_MIN_LENGTH?: string;
  AUTH_SESSION_TIMEOUT?: string;
  AUTH_DEFAULT_QUOTA?: string;
  AUTH_QUOTA_WARNING_THRESHOLD?: string;

  // Performance configuration
  PERFORMANCE_TARGET_CACHED?: string;
  PERFORMANCE_TARGET_KV?: string;
  PERFORMANCE_TARGET_API?: string;

  // Cache configuration
  CACHE_DEFAULT_TTL?: string;
  CACHE_VIDEO_TTL?: string;
  CACHE_CHANNEL_TTL?: string;

  // Batch configuration
  BATCH_MAX_VIDEOS?: string;
  BATCH_MAX_CHANNELS?: string;

  // Retry configuration
  RETRY_MAX_ATTEMPTS?: string;
  RETRY_INITIAL_DELAY?: string;
  RETRY_MAX_DELAY?: string;

  // Monitoring configuration
  HEALTH_CHECK_INTERVAL?: string;
  METRICS_RETENTION?: string;
  ERROR_TRACKING_ENABLED?: string;
  ERROR_RATE_THRESHOLD?: string;

  // Development configuration
  DEV_PORT?: string;
  DEV_CORS_ENABLED?: string;
  DEV_CORS_ORIGINS?: string;
  DEV_MOCK_YOUTUBE_API?: string;
}

/**
 * Cloudflare KV namespace interface
 */
export interface KVNamespace {
  get(key: string, options?: KVNamespaceGetOptions): Promise<string | null>;
  get(key: string, type: 'text'): Promise<string | null>;
  get(key: string, type: 'json'): Promise<any>;
  get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
  get(key: string, type: 'stream'): Promise<ReadableStream | null>;
  
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: KVNamespacePutOptions): Promise<void>;
  
  delete(key: string): Promise<void>;
  
  list(options?: KVNamespaceListOptions): Promise<KVNamespaceListResult>;
}

export interface KVNamespaceGetOptions {
  type?: 'text' | 'json' | 'arrayBuffer' | 'stream';
  cacheTtl?: number;
}

export interface KVNamespacePutOptions {
  expirationTtl?: number;
  expiration?: number;
  metadata?: Record<string, any>;
}

export interface KVNamespaceListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface KVNamespaceListResult {
  keys: Array<{
    name: string;
    expiration?: number;
    metadata?: Record<string, any>;
  }>;
  list_complete: boolean;
  cursor?: string;
}

/**
 * Cloudflare Workers ExecutionContext
 */
export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

/**
 * Cloudflare Workers request context
 */
export interface CloudflareRequestContext {
  request: Request;
  env: CloudflareEnvironment;
  ctx: ExecutionContext;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

/**
 * Configuration error types
 */
export interface ConfigurationError {
  code: string;
  message: string;
  field?: string;
  value?: any;
}

export interface ConfigurationWarning {
  code: string;
  message: string;
  field?: string;
  recommendation?: string;
}

/**
 * YouTube API configuration
 */
export interface YouTubeApiConfig {
  apiKey: string;
  quotaLimit: number;
  baseUrl: string;
  requestsPerSecond?: number;
}

/**
 * OAuth configuration
 */
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

/**
 * External services configuration
 */
export interface ExternalServicesConfig {
  transcript?: {
    serviceUrl: string;
    timeout?: number;
  };
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  defaultTtl: number;
  videoTtl: number;
  channelTtl: number;
  ttl: {
    transcripts: number;
    videoMetrics: number;
    channelMetrics: number;
    comments: number;
    search: number;
    trending: number;
  };
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  requests: number;
  window: number;
  requestsPerMinute: number;
}

/**
 * CORS configuration
 */
export interface CorsConfig {
  enabled: boolean;
  origins: string[];
  methods: string[];
  headers: string[];
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  metricsRetention: number;
  errorTracking: boolean;
  performanceTracking: boolean;
}

/**
 * Server configuration interface (derived from environment)
 */
export interface ServerConfiguration {
  environment: 'development' | 'production';
  debug: boolean;
  apis: {
    youtube: YouTubeApiConfig;
    oauth?: OAuthConfig;
  };
  externalServices: ExternalServicesConfig;
  cache: CacheConfig;
  rateLimit: RateLimitConfig;
  rateLimits: RateLimitConfig; // Alias for consistency
  performance: {
    targetCached: number;
    targetKv: number;
    targetApi: number;
  };
  websocket: {
    maxConnections: number;
    heartbeatInterval: number;
    connectionTimeout: number;
  };
  authentication: {
    apiKeyMinLength: number;
    sessionTimeout: number;
    defaultQuota: number;
    quotaWarningThreshold: number;
  };
  cors: CorsConfig;
  monitoring: MonitoringConfig;
}

/**
 * Configuration defaults
 */
export const DEFAULT_CONFIG = {
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW: 60000,
  WS_MAX_CONNECTIONS: 1000,
  WS_HEARTBEAT_INTERVAL: 30000,
  WS_CONNECTION_TIMEOUT: 300000,
  AUTH_API_KEY_MIN_LENGTH: 32,
  AUTH_SESSION_TIMEOUT: 86400000,
  AUTH_DEFAULT_QUOTA: 10000,
  AUTH_QUOTA_WARNING_THRESHOLD: 80,
  PERFORMANCE_TARGET_CACHED: 50,
  PERFORMANCE_TARGET_KV: 200,
  PERFORMANCE_TARGET_API: 500,
  CACHE_DEFAULT_TTL: 3600,
  CACHE_VIDEO_TTL: 86400,
  CACHE_CHANNEL_TTL: 21600,
  BATCH_MAX_VIDEOS: 50,
  BATCH_MAX_CHANNELS: 20,
  RETRY_MAX_ATTEMPTS: 3,
  RETRY_INITIAL_DELAY: 1000,
  RETRY_MAX_DELAY: 10000,
  HEALTH_CHECK_INTERVAL: 300000,
  METRICS_RETENTION: 86400000,
  ERROR_RATE_THRESHOLD: 5,
  DEV_PORT: 8787,
  YOUTUBE_BASE_URL: 'https://www.googleapis.com/youtube/v3',
  CACHE_TTL_TRANSCRIPTS: 86400,
  CACHE_TTL_VIDEO_METRICS: 3600,
  CACHE_TTL_CHANNEL_METRICS: 7200,
  CACHE_TTL_COMMENTS: 1800,
  CACHE_TTL_SEARCH: 900,
  CACHE_TTL_TRENDING: 600
} as const;

/**
 * Environment validation utilities
 */
export class EnvironmentValidator {
  static validate(env: CloudflareEnvironment): ValidationResult {
    const errors: Array<{ field: string; message: string; value?: any }> = [];

    // Required fields
    if (!env.YOUTUBE_API_KEY) {
      errors.push({ field: 'YOUTUBE_API_KEY', message: 'is required' });
    }

    if (!env.ENVIRONMENT) {
      errors.push({ field: 'ENVIRONMENT', message: 'is required' });
    }

    if (!env.YOUTUBE_MCP_KV) {
      errors.push({ field: 'YOUTUBE_MCP_KV', message: 'namespace is required' });
    }

    // Environment-specific validation
    if (env.ENVIRONMENT === 'production') {
      if (env.DEBUG === 'true') {
        errors.push({ field: 'DEBUG', message: 'should not be enabled in production' });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static getNumeric(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  static getBoolean(value: string | boolean | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    if (typeof value === 'boolean') return value;
    return value.toLowerCase() === 'true';
  }
}

/**
 * Configuration factory
 */
export class ConfigurationFactory {
  static createServerConfiguration(env: CloudflareEnvironment): ServerConfiguration {
    const isDebugMode = EnvironmentValidator.getBoolean(env.DEBUG_MODE, false) || 
                       EnvironmentValidator.getBoolean(env.DEBUG, false) ||
                       env.ENVIRONMENT === 'development';

    const rateLimitConfig: RateLimitConfig = {
      requests: EnvironmentValidator.getNumeric(env.RATE_LIMIT_REQUESTS, DEFAULT_CONFIG.RATE_LIMIT_REQUESTS),
      window: EnvironmentValidator.getNumeric(env.RATE_LIMIT_WINDOW, DEFAULT_CONFIG.RATE_LIMIT_WINDOW),
      requestsPerMinute: EnvironmentValidator.getNumeric(env.RATE_LIMIT_REQUESTS, DEFAULT_CONFIG.RATE_LIMIT_REQUESTS)
    };

    const cacheConfig: CacheConfig = {
      enabled: true,
      defaultTtl: EnvironmentValidator.getNumeric(env.CACHE_DEFAULT_TTL, DEFAULT_CONFIG.CACHE_DEFAULT_TTL),
      videoTtl: EnvironmentValidator.getNumeric(env.CACHE_VIDEO_TTL, DEFAULT_CONFIG.CACHE_VIDEO_TTL),
      channelTtl: EnvironmentValidator.getNumeric(env.CACHE_CHANNEL_TTL, DEFAULT_CONFIG.CACHE_CHANNEL_TTL),
      ttl: {
        transcripts: DEFAULT_CONFIG.CACHE_TTL_TRANSCRIPTS,
        videoMetrics: DEFAULT_CONFIG.CACHE_TTL_VIDEO_METRICS,
        channelMetrics: DEFAULT_CONFIG.CACHE_TTL_CHANNEL_METRICS,
        comments: DEFAULT_CONFIG.CACHE_TTL_COMMENTS,
        search: DEFAULT_CONFIG.CACHE_TTL_SEARCH,
        trending: DEFAULT_CONFIG.CACHE_TTL_TRENDING
      }
    };

    return {
      environment: env.ENVIRONMENT === 'staging' ? 'development' : env.ENVIRONMENT,
      debug: isDebugMode,
      apis: {
        youtube: {
          apiKey: env.YOUTUBE_API_KEY,
          quotaLimit: EnvironmentValidator.getNumeric(env.AUTH_DEFAULT_QUOTA, DEFAULT_CONFIG.AUTH_DEFAULT_QUOTA),
          baseUrl: DEFAULT_CONFIG.YOUTUBE_BASE_URL,
          requestsPerSecond: 10
        },
        ...(env.OAUTH_CLIENT_ID && env.OAUTH_CLIENT_SECRET ? {
          oauth: {
            clientId: env.OAUTH_CLIENT_ID,
            clientSecret: env.OAUTH_CLIENT_SECRET
          }
        } : {})
      },
      externalServices: {
        ...(env.YTDLP_SERVICE_URL ? {
          transcript: {
            serviceUrl: env.YTDLP_SERVICE_URL,
            timeout: 30000
          }
        } : {})
      },
      cache: cacheConfig,
      rateLimit: rateLimitConfig,
      rateLimits: rateLimitConfig, // Alias
      performance: {
        targetCached: EnvironmentValidator.getNumeric(env.PERFORMANCE_TARGET_CACHED, DEFAULT_CONFIG.PERFORMANCE_TARGET_CACHED),
        targetKv: EnvironmentValidator.getNumeric(env.PERFORMANCE_TARGET_KV, DEFAULT_CONFIG.PERFORMANCE_TARGET_KV),
        targetApi: EnvironmentValidator.getNumeric(env.PERFORMANCE_TARGET_API, DEFAULT_CONFIG.PERFORMANCE_TARGET_API)
      },
      websocket: {
        maxConnections: EnvironmentValidator.getNumeric(env.WS_MAX_CONNECTIONS, DEFAULT_CONFIG.WS_MAX_CONNECTIONS),
        heartbeatInterval: EnvironmentValidator.getNumeric(env.WS_HEARTBEAT_INTERVAL, DEFAULT_CONFIG.WS_HEARTBEAT_INTERVAL),
        connectionTimeout: EnvironmentValidator.getNumeric(env.WS_CONNECTION_TIMEOUT, DEFAULT_CONFIG.WS_CONNECTION_TIMEOUT)
      },
      authentication: {
        apiKeyMinLength: EnvironmentValidator.getNumeric(env.AUTH_API_KEY_MIN_LENGTH, DEFAULT_CONFIG.AUTH_API_KEY_MIN_LENGTH),
        sessionTimeout: EnvironmentValidator.getNumeric(env.AUTH_SESSION_TIMEOUT, DEFAULT_CONFIG.AUTH_SESSION_TIMEOUT),
        defaultQuota: EnvironmentValidator.getNumeric(env.AUTH_DEFAULT_QUOTA, DEFAULT_CONFIG.AUTH_DEFAULT_QUOTA),
        quotaWarningThreshold: EnvironmentValidator.getNumeric(env.AUTH_QUOTA_WARNING_THRESHOLD, DEFAULT_CONFIG.AUTH_QUOTA_WARNING_THRESHOLD)
      },
      cors: {
        enabled: EnvironmentValidator.getBoolean(env.DEV_CORS_ENABLED, env.ENVIRONMENT === 'development'),
        origins: env.DEV_CORS_ORIGINS ? env.DEV_CORS_ORIGINS.split(',') : ['*'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        headers: ['Content-Type', 'Authorization', 'X-Requested-With']
      },
      monitoring: {
        enabled: true,
        logLevel: isDebugMode ? 'debug' : 'info',
        metricsRetention: EnvironmentValidator.getNumeric(env.METRICS_RETENTION, DEFAULT_CONFIG.METRICS_RETENTION),
        errorTracking: EnvironmentValidator.getBoolean(env.ERROR_TRACKING_ENABLED, true),
        performanceTracking: true
      }
    };
  }
}

/**
 * Type guards
 */
export function isCloudflareEnvironment(env: any): env is CloudflareEnvironment {
  return env && 
         typeof env.YOUTUBE_API_KEY === 'string' &&
         typeof env.ENVIRONMENT === 'string' &&
         env.YOUTUBE_MCP_KV &&
         typeof env.YOUTUBE_MCP_KV.get === 'function';
}

export function isValidEnvironmentType(env: string): env is CloudflareEnvironment['ENVIRONMENT'] {
  return ['development', 'staging', 'production'].includes(env);
}

/**
 * Cache service interface (simplified)
 */
export interface CacheService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  cleanup(): Promise<void>;
}

/**
 * Environment utilities
 */
export class EnvironmentUtils {
  static isDevelopment(env: CloudflareEnvironment): boolean {
    return env.ENVIRONMENT === 'development';
  }

  static isProduction(env: CloudflareEnvironment): boolean {
    return env.ENVIRONMENT === 'production';
  }

  static isDebugEnabled(env: CloudflareEnvironment): boolean {
    return EnvironmentValidator.getBoolean(env.DEBUG_MODE, false) || 
           EnvironmentValidator.getBoolean(env.DEBUG, false) || 
           this.isDevelopment(env);
  }

  static getQuotaLimit(env: CloudflareEnvironment): number {
    return EnvironmentValidator.getNumeric(env.AUTH_DEFAULT_QUOTA, DEFAULT_CONFIG.AUTH_DEFAULT_QUOTA);
  }

  static getRateLimits(env: CloudflareEnvironment): { requests: number; window: number } {
    return {
      requests: EnvironmentValidator.getNumeric(env.RATE_LIMIT_REQUESTS, DEFAULT_CONFIG.RATE_LIMIT_REQUESTS),
      window: EnvironmentValidator.getNumeric(env.RATE_LIMIT_WINDOW, DEFAULT_CONFIG.RATE_LIMIT_WINDOW)
    };
  }
}