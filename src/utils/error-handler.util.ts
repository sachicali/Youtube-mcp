/**
 * Error Handler Utility
 * 
 * Centralized error handling with structured error responses,
 * logging, and HTTP response generation.
 */

import type { MCPErrorCodes, MCPError, MCPResponse } from '@/types/mcp.types';
import type { LoggerUtil } from '@/utils/logger.util';

export interface ErrorContext {
  requestId?: string;
  operation?: string;
  userId?: string;
  [key: string]: unknown;
}

export interface ErrorDetails {
  code: MCPErrorCodes;
  message: string;
  details?: unknown;
  context?: ErrorContext;
}

export class ErrorHandlerUtil {
  private logger: LoggerUtil;

  constructor(logger: LoggerUtil) {
    this.logger = logger;
  }

  /**
   * Create standardized error response for HTTP requests
   */
  createErrorResponse(
    code: MCPErrorCodes,
    message: string,
    requestId: string,
    details?: unknown
  ): Response {
    const errorResponse = {
      jsonrpc: '2.0' as const,
      id: requestId,
      error: {
        code,
        message,
        data: details,
      },
    };

    // Log the error
    this.logger.error('Error response created', {
      requestId,
      errorCode: code,
      errorMessage: message,
      details,
    });

    return new Response(JSON.stringify(errorResponse), {
      status: this.getHttpStatusFromMCPError(code),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  /**
   * Create MCP error object
   */
  createMCPError(
    code: MCPErrorCodes,
    message: string,
    details?: unknown,
    context?: ErrorContext
  ): MCPError {
    // Log the error with context
    this.logger.error('MCP error created', {
      errorCode: code,
      errorMessage: message,
      details,
      ...context,
    });

    return {
      code,
      message,
      data: details,
    };
  }

  /**
   * Handle and convert various error types to MCP errors
   */
  handleError(error: unknown, context?: ErrorContext): MCPError {
    if (error instanceof MCPErrorInstance) {
      return this.createMCPError(error.code, error.message, error.details, context);
    }

    if (error instanceof Error) {
      // Check for specific error types
      if (error.name === 'ValidationError') {
        return this.createMCPError(
          MCPErrorCodes.VALIDATION_FAILED,
          error.message,
          { originalError: error.name },
          context
        );
      }

      if (error.name === 'TypeError' || error.name === 'ReferenceError') {
        return this.createMCPError(
          MCPErrorCodes.INTERNAL_ERROR,
          'Internal server error',
          { type: error.name, message: error.message },
          context
        );
      }

      // Generic Error handling
      return this.createMCPError(
        MCPErrorCodes.INTERNAL_ERROR,
        error.message || 'Unknown error occurred',
        { originalError: error.name },
        context
      );
    }

    // Handle unknown error types
    return this.createMCPError(
      MCPErrorCodes.INTERNAL_ERROR,
      'Unknown error occurred',
      { error: String(error) },
      context
    );
  }

  /**
   * Create error boundary wrapper for async operations
   */
  async withErrorBoundary<T>(
    operation: () => Promise<T>,
    context?: ErrorContext
  ): Promise<T | MCPError> {
    try {
      return await operation();
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  /**
   * Create error boundary wrapper for sync operations
   */
  withSyncErrorBoundary<T>(
    operation: () => T,
    context?: ErrorContext
  ): T | MCPError {
    try {
      return operation();
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  /**
   * Validate and throw custom errors
   */
  throwValidationError(message: string, details?: unknown): never {
    throw new MCPErrorInstance(MCPErrorCodes.VALIDATION_FAILED, message, details);
  }

  throwNotFoundError(message: string, details?: unknown): never {
    throw new MCPErrorInstance(MCPErrorCodes.METHOD_NOT_FOUND, message, details);
  }

  throwAuthenticationError(message: string, details?: unknown): never {
    throw new MCPErrorInstance(MCPErrorCodes.AUTHENTICATION_FAILED, message, details);
  }

  throwRateLimitError(message: string, details?: unknown): never {
    throw new MCPErrorInstance(MCPErrorCodes.RATE_LIMITED, message, details);
  }

  throwQuotaExceededError(message: string, details?: unknown): never {
    throw new MCPErrorInstance(MCPErrorCodes.QUOTA_EXCEEDED, message, details);
  }

  /**
   * Convert MCP error codes to HTTP status codes
   */
  private getHttpStatusFromMCPError(code: MCPErrorCodes): number {
    switch (code) {
      case MCPErrorCodes.PARSE_ERROR:
        return 400; // Bad Request
      case MCPErrorCodes.INVALID_REQUEST:
        return 400; // Bad Request
      case MCPErrorCodes.METHOD_NOT_FOUND:
        return 404; // Not Found
      case MCPErrorCodes.INVALID_PARAMS:
        return 400; // Bad Request
      case MCPErrorCodes.INTERNAL_ERROR:
        return 500; // Internal Server Error
      case MCPErrorCodes.SERVER_ERROR:
        return 500; // Internal Server Error
      case MCPErrorCodes.TOOL_NOT_FOUND:
        return 404; // Not Found
      case MCPErrorCodes.AUTHENTICATION_FAILED:
        return 401; // Unauthorized
      case MCPErrorCodes.AUTHORIZATION_FAILED:
        return 403; // Forbidden
      case MCPErrorCodes.QUOTA_EXCEEDED:
        return 429; // Too Many Requests
      case MCPErrorCodes.RATE_LIMITED:
        return 429; // Too Many Requests
      case MCPErrorCodes.VALIDATION_FAILED:
        return 400; // Bad Request
      case MCPErrorCodes.EXTERNAL_API_ERROR:
        return 502; // Bad Gateway
      case MCPErrorCodes.CACHE_ERROR:
        return 500; // Internal Server Error
      case MCPErrorCodes.CONFIGURATION_ERROR:
        return 500; // Internal Server Error
      default:
        return 500; // Internal Server Error
    }
  }

  /**
   * Check if error indicates a temporary failure that should be retried
   */
  isRetryableError(error: MCPError): boolean {
    const retryableCodes = [
      MCPErrorCodes.RATE_LIMITED,
      MCPErrorCodes.EXTERNAL_API_ERROR,
      MCPErrorCodes.CACHE_ERROR,
    ];
    return retryableCodes.includes(error.code);
  }

  /**
   * Check if error indicates a client error (4xx)
   */
  isClientError(error: MCPError): boolean {
    const httpStatus = this.getHttpStatusFromMCPError(error.code);
    return httpStatus >= 400 && httpStatus < 500;
  }

  /**
   * Check if error indicates a server error (5xx)
   */
  isServerError(error: MCPError): boolean {
    const httpStatus = this.getHttpStatusFromMCPError(error.code);
    return httpStatus >= 500;
  }

  /**
   * Get retry delay for retryable errors (exponential backoff)
   */
  getRetryDelay(attemptNumber: number, baseDelay: number = 1000): number {
    return Math.min(baseDelay * Math.pow(2, attemptNumber), 30000); // Max 30 seconds
  }
}

/**
 * Custom error class for MCP errors
 */
export class MCPErrorInstance extends Error {
  public readonly code: MCPErrorCodes;
  public readonly details?: unknown;

  constructor(code: MCPErrorCodes, message: string, details?: unknown) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.details = details;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MCPErrorInstance);
    }
  }

  /**
   * Convert to MCP error object
   */
  toMCPError(): MCPError {
    return {
      code: this.code,
      message: this.message,
      data: this.details,
    };
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * Error handler factory for creating pre-configured handlers
 */
export class ErrorHandlerFactory {
  static create(logger: LoggerUtil): ErrorHandlerUtil {
    return new ErrorHandlerUtil(logger);
  }

  static createWithContext(logger: LoggerUtil, defaultContext: ErrorContext): ErrorHandlerUtil {
    const handler = new ErrorHandlerUtil(logger);
    
    // Override methods to include default context
    const originalHandleError = handler.handleError.bind(handler);
    handler.handleError = (error: unknown, context?: ErrorContext) => {
      return originalHandleError(error, { ...defaultContext, ...context });
    };

    return handler;
  }
}