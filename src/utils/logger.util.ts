/**
 * Logger Utility
 * 
 * Centralized logging utility with structured logging support
 * and environment-aware log levels.
 */

import type { ServerConfiguration } from '@/types/environment.types';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogLevel {
  level: 'debug' | 'info' | 'warn' | 'error';
  priority: number;
}

export class LoggerUtil {
  private config: ServerConfiguration;
  private logLevels: Record<string, LogLevel> = {
    debug: { level: 'debug', priority: 0 },
    info: { level: 'info', priority: 1 },
    warn: { level: 'warn', priority: 2 },
    error: { level: 'error', priority: 3 },
  };

  constructor(config: ServerConfiguration) {
    this.config = config;
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log error message
   */
  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  /**
   * Core logging method
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: LogContext): void {
    const currentLevel = this.logLevels[this.config.monitoring.logLevel];
    const targetLevel = this.logLevels[level];

    // Skip if log level is below configured threshold
    if (targetLevel.priority < currentLevel.priority) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      environment: this.config.environment,
      ...context,
    };

    // Use appropriate console method
    switch (level) {
      case 'debug':
        console.debug(JSON.stringify(logEntry));
        break;
      case 'info':
        console.info(JSON.stringify(logEntry));
        break;
      case 'warn':
        console.warn(JSON.stringify(logEntry));
        break;
      case 'error':
        console.error(JSON.stringify(logEntry));
        break;
    }
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, startTime: number, context?: LogContext): void {
    const duration = Date.now() - startTime;
    this.info(`Performance: ${operation}`, {
      operation,
      duration,
      performanceCategory: duration < 100 ? 'fast' : duration < 500 ? 'medium' : 'slow',
      ...context,
    });
  }

  /**
   * Log request metrics
   */
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 400 ? 'warn' : 'info';
    this.log(level, `${method} ${url} ${statusCode}`, {
      method,
      url,
      statusCode,
      duration,
      requestCategory: statusCode >= 500 ? 'server_error' : statusCode >= 400 ? 'client_error' : 'success',
      ...context,
    });
  }

  /**
   * Log quota usage
   */
  logQuotaUsage(
    operation: string,
    quotaUsed: number,
    quotaRemaining: number,
    context?: LogContext
  ): void {
    const usagePercent = (quotaUsed / (quotaUsed + quotaRemaining)) * 100;
    const level = usagePercent > 90 ? 'warn' : usagePercent > 75 ? 'info' : 'debug';
    
    this.log(level, `Quota usage: ${operation}`, {
      operation,
      quotaUsed,
      quotaRemaining,
      usagePercent: Math.round(usagePercent),
      quotaCategory: usagePercent > 90 ? 'critical' : usagePercent > 75 ? 'high' : 'normal',
      ...context,
    });
  }

  /**
   * Log cache metrics
   */
  logCacheMetrics(
    operation: string,
    hit: boolean,
    key: string,
    ttl?: number,
    context?: LogContext
  ): void {
    this.debug(`Cache ${hit ? 'hit' : 'miss'}: ${operation}`, {
      operation,
      cacheHit: hit,
      cacheKey: key,
      ttl,
      ...context,
    });
  }

  /**
   * Create child logger with persistent context
   */
  child(persistentContext: LogContext): LoggerUtil {
    const childLogger = new LoggerUtil(this.config);
    
    // Override log method to include persistent context
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (
      level: 'debug' | 'info' | 'warn' | 'error',
      message: string,
      context?: LogContext
    ) => {
      originalLog(level, message, { ...persistentContext, ...context });
    };
    
    return childLogger;
  }

  /**
   * Get current log level
   */
  getLogLevel(): string {
    return this.config.monitoring.logLevel;
  }

  /**
   * Check if level should be logged
   */
  shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const currentLevel = this.logLevels[this.config.monitoring.logLevel];
    const targetLevel = this.logLevels[level];
    return targetLevel.priority >= currentLevel.priority;
  }
}