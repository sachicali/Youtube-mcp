/**
 * Environment and Configuration Types
 * 
 * These types define environment variables, configuration objects,
 * and Cloudflare Workers-specific bindings.
 */

// Import KVNamespace from cloudflare types
import type { KVNamespace } from './cloudflare.types';

// Cloudflare Workers Environment (available as 'env' parameter)
export interface CloudflareEnvironment {
  // Environment variables
  ENVIRONMENT: 'development' | 'production';
  DEBUG_MODE: 'true' | 'false';
  
  // API Keys (set via Cloudflare dashboard or wrangler secret)
  YOUTUBE_API_KEY: string;
  OAUTH_CLIENT_ID?: string;
  OAUTH_CLIENT_SECRET?: string;
  
  // KV Namespaces (bound in wrangler.toml)
  CACHE_KV: KVNamespace;
  RATE_LIMITS: KVNamespace;
  
  // Optional external service URLs
  YTDLP_SERVICE_URL?: string;
  EXTERNAL_TRANSCRIPT_API?: string;
}

// Configuration derived from environment
export interface ServerConfiguration {
  environment: 'development' | 'production';
  debug: boolean;
  
  apis: {
    youtube: {
      apiKey: string;
      baseUrl: string;
      quotaLimit: number;
      requestsPerSecond: number;
    };
    oauth?: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
      scopes: string[];
    };
    transcript?: {
      serviceUrl: string;
      timeout: number;
      retries: number;
    };
  };
  
  cache: {
    enabled: boolean;
    namespaces: {
      cache: KVNamespace;
      rateLimits: KVNamespace;
    };
    ttl: {
      transcripts: number;
      videoMetrics: number;
      channelAnalysis: number;
      trends: number;
      searches: number;
    };
  };
  
  rateLimit: {
    enabled: boolean;
    quotaLimit: number;
    requestsPerMinute: number;
    burstLimit: number;
    exponentialBackoff: {
      baseDelay: number;
      maxDelay: number;
      backoffFactor: number;
      maxRetries: number;
    };
  };
  
  cors: {
    enabled: boolean;
    origins: string[];
    methods: string[];
    headers: string[];
  };
  
  monitoring: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    errorReporting: boolean;
    performanceTracking: boolean;
  };
}

// Default configuration factory
export interface ConfigurationFactory {
  createFromEnvironment(env: CloudflareEnvironment): ServerConfiguration;
  validateConfiguration(config: ServerConfiguration): ValidationResult;
  getDefaultConfiguration(): Partial<ServerConfiguration>;
}

// Validation types
export interface ValidationResult {
  valid: boolean;
  errors: ConfigurationError[];
  warnings: ConfigurationWarning[];
}

export interface ConfigurationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

export interface ConfigurationWarning {
  field: string;
  message: string;
  impact: 'performance' | 'security' | 'functionality';
}

// Runtime configuration access
export interface ConfigurationProvider {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  reload(): Promise<void>;
  validate(): ValidationResult;
}

// Secrets management
export interface SecretsManager {
  getSecret(name: string): Promise<string | null>;
  hasSecret(name: string): Promise<boolean>;
  validateSecrets(required: string[]): Promise<ValidationResult>;
}