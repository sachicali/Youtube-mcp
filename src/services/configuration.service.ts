/**
 * Configuration Service
 * Manages environment configuration and provides typed configuration objects
 */

import type { 
  CloudflareEnvironment,
  ServerConfiguration,
  ValidationResult,
  ConfigurationError,
  ConfigurationWarning,
  ConfigurationFactory,
  EnvironmentValidator
} from '@/types/environment.types';

import { 
  ConfigurationFactory as Factory,
  EnvironmentValidator as Validator
} from '@/types/environment.types';

/**
 * Enhanced validation result with warnings
 */
interface ExtendedValidationResult extends ValidationResult {
  warnings: ConfigurationWarning[];
}

/**
 * Configuration service for managing environment settings
 */
export class ConfigurationService {
  private env: CloudflareEnvironment;
  private config: ServerConfiguration;
  private initialized: boolean = false;

  constructor(env: CloudflareEnvironment) {
    this.env = env;
    this.config = Factory.createServerConfiguration(env);
  }

  /**
   * Initialize the configuration service (async initialization if needed)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const validation = this.validateEnvironment(this.env);
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join(', ');
      throw new Error(`Invalid environment configuration: ${errorMessages}`);
    }

    this.initialized = true;
  }

  /**
   * Get the complete server configuration
   */
  getConfig(): ServerConfiguration {
    return this.config;
  }

  /**
   * Get the complete server configuration (alias for compatibility)
   */
  getConfiguration(): ServerConfiguration {
    return this.config;
  }

  /**
   * Get environment type
   */
  getEnvironment(): 'development' | 'production' {
    const env = this.env.ENVIRONMENT;
    return env === 'staging' ? 'development' : env;
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugMode(): boolean {
    return this.config.debug;
  }

  /**
   * Get YouTube API configuration
   */
  getYouTubeConfig() {
    return this.config.apis.youtube;
  }

  /**
   * Get cache configuration
   */
  getCacheConfig() {
    return this.config.cache;
  }

  /**
   * Get rate limiting configuration
   */
  getRateLimitConfig() {
    return this.config.rateLimits;
  }

  /**
   * Get WebSocket configuration
   */
  getWebSocketConfig() {
    return this.config.websocket;
  }

  /**
   * Get authentication configuration
   */
  getAuthConfig() {
    return this.config.authentication;
  }

  /**
   * Get CORS configuration
   */
  getCorsConfig() {
    return this.config.cors;
  }

  /**
   * Get monitoring configuration
   */
  getMonitoringConfig() {
    return this.config.monitoring;
  }

  /**
   * Get external services configuration
   */
  getExternalServicesConfig() {
    return this.config.externalServices;
  }

  /**
   * Get performance configuration
   */
  getPerformanceConfig() {
    return this.config.performance;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Validate environment configuration
   */
  private validateEnvironment(env: CloudflareEnvironment): ExtendedValidationResult {
    const basicValidation = Validator.validate(env);
    const warnings: ConfigurationWarning[] = [];
    const errors: Array<{ field: string; message: string; value?: any }> = [...basicValidation.errors];

    // Additional validation logic
    if (env.ENVIRONMENT === 'production') {
      if (env.DEBUG === 'true') {
        warnings.push({
          code: 'PROD_DEBUG_ENABLED',
          message: 'Debug mode should not be enabled in production',
          field: 'DEBUG',
          recommendation: 'Set DEBUG=false or remove DEBUG environment variable'
        });
      }

      if (!env.OAUTH_CLIENT_ID || !env.OAUTH_CLIENT_SECRET) {
        warnings.push({
          code: 'MISSING_OAUTH',
          message: 'OAuth credentials not configured for production',
          field: 'OAUTH_CLIENT_ID',
          recommendation: 'Configure OAuth credentials for enhanced functionality'
        });
      }
    }

    // Performance warnings
    const rateLimitRequests = Validator.getNumeric(env.RATE_LIMIT_REQUESTS, 100);
    if (rateLimitRequests > 1000) {
      warnings.push({
        code: 'HIGH_RATE_LIMIT',
        message: 'Rate limit is set very high',
        field: 'RATE_LIMIT_REQUESTS',
        recommendation: 'Consider lowering rate limit for better resource management'
      });
    }

    // CORS warnings
    if (env.DEV_CORS_ENABLED === 'true' && env.ENVIRONMENT === 'production') {
      warnings.push({
        code: 'CORS_ENABLED_PROD',
        message: 'CORS is enabled in production',
        field: 'DEV_CORS_ENABLED',
        recommendation: 'Review CORS configuration for production security'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get configuration warnings
   */
  getConfigurationWarnings(): ConfigurationWarning[] {
    const validation = this.validateEnvironment(this.env) as ExtendedValidationResult;
    return validation.warnings;
  }

  /**
   * Get raw environment variables
   */
  getRawEnvironment(): CloudflareEnvironment {
    return this.env;
  }

  /**
   * Update environment configuration (for testing purposes)
   */
  updateEnvironment(env: CloudflareEnvironment): void {
    this.env = env;
    this.config = Factory.createServerConfiguration(env);
    this.initialized = false;
  }

  /**
   * Validate current configuration
   */
  validateConfiguration(): ExtendedValidationResult {
    return this.validateEnvironment(this.env);
  }
}
