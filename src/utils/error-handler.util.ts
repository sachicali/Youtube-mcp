/**
 * Error Handler Utility
 * 
 * Provides comprehensive error handling, logging, and response generation
 * for the YouTube Scraping MCP Server with proper HTTP status mapping.
 */

import type { LoggerUtil } from '@/utils/logger.util';
import type { MCPResponse, MCPErrorCode } from '@/types/mcp.types';
import { MCPErrorCodes } from '@/types/mcp.types';

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorDetails {
  code: number;
  message: string;
  details?: string;
  stack?: string;
  context?: ErrorContext;
}

export class ErrorHandlerUtil {
  private logger: LoggerUtil;

  constructor(logger: LoggerUtil) {
    this.logger = logger;
  }

  /**
   * Create standardized HTTP error response
   */
  createErrorResponse(
    code: number,
    message: string,
    id: string | null = null,
    details?: string
  ): Response {
    const errorResponse = {
      jsonrpc: '2.0' as const,
      id,
      error: {
        code: this.mapHttpToMCPErrorCode(code),
        message,
        data: details ? { details } : undefined,
      },
    };

    this.logger.error('HTTP Error Response Created', {
      httpCode: code,
      mcpCode: errorResponse.error.code,
      message,
      details,
      requestId: id,
    });

    return new Response(JSON.stringify(errorResponse), {
      status: code,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  /**
   * Create MCP error response for JSON-RPC
   */
  createMCPErrorResponse(
    code: MCPErrorCode,
    message: string,
    id: string | number | null = null,
    data?: unknown
  ) {
    const errorResponse = {
      jsonrpc: '2.0' as const,
      id,
      error: {
        code,
        message,
        data,
      },
    };

    this.logger.error('MCP Error Response Created', {
      code,
      message,
      data,
      requestId: id,
    });

    return errorResponse;
  }

  /**
   * Wrap async function with error handling
   */
  async wrapAsync<T>(
    fn: () => Promise<T>,
    context?: ErrorContext
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.handleError(error, context);
      throw error;
    }
  }

  /**
   * Wrap synchronous function with error handling
   */
  wrapSync<T>(
    fn: () => T,
    context?: ErrorContext
  ): T {
    try {
      return fn();
    } catch (error) {
      this.handleError(error, context);
      throw error;
    }
  }

  /**
   * Handle and log errors with context
   */
  handleError(error: unknown, context?: ErrorContext): ErrorDetails {
    const errorDetails = this.extractErrorDetails(error, context);
    
    this.logger.error('Error handled', {
      code: errorDetails.code,
      message: errorDetails.message,
      details: errorDetails.details,
      context: errorDetails.context,
      stack: errorDetails.stack,
    });

    return errorDetails;
  }

  /**
   * Extract structured error details from various error types
   */
  private extractErrorDetails(error: unknown, context?: ErrorContext): ErrorDetails {
    let code = 500;
    let message = 'Internal Server Error';
    let details: string | undefined;
    let stack: string | undefined;

    if (error instanceof Error) {
      message = error.message;
      stack = error.stack;
      
      // Handle specific error types
      if (error.name === 'ValidationError') {
        code = 400;
      } else if (error.name === 'NotFoundError' || error.name === 'ToolNotFoundError') {
        code = 404;
      } else if (error.name === 'AuthenticationError') {
        code = 401;
      } else if (error.name === 'AuthorizationError') {
        code = 403;
      } else if (error.name === 'RateLimitError') {
        code = 429;
      } else if (error.name === 'YouTubeAPIRequestError') {
        // Extract YouTube API error details
        const youtubeError = error as any;
        code = youtubeError.code || 500;
        details = youtubeError.status;
      } else if (error.name === 'TranscriptNotAvailableError') {
        code = 404;
        details = 'Transcript not available for this video';
      }
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object') {
      const errorObj = error as any;
      message = errorObj.message || errorObj.error || 'Unknown error';
      code = errorObj.code || errorObj.status || 500;
      details = errorObj.details;
    }

    return {
      code,
      message,
      details,
      stack,
      context,
    };
  }

  /**
   * Map HTTP status codes to MCP error codes
   */
  private mapHttpToMCPErrorCode(httpCode: number): MCPErrorCode {
    switch (httpCode) {
      case 400:
        return MCPErrorCodes.INVALID_REQUEST;
      case 401:
        return MCPErrorCodes.INVALID_REQUEST; // Use closest available
      case 403:
        return MCPErrorCodes.INVALID_REQUEST; // Use closest available
      case 404:
        return MCPErrorCodes.METHOD_NOT_FOUND; // Use closest available
      case 405:
        return MCPErrorCodes.METHOD_NOT_FOUND;
      case 408:
        return MCPErrorCodes.INTERNAL_ERROR; // Use closest available
      case 409:
        return MCPErrorCodes.INTERNAL_ERROR; // Use closest available
      case 422:
        return MCPErrorCodes.INVALID_PARAMS;
      case 429:
        return MCPErrorCodes.RATE_LIMITED;
      case 500:
        return MCPErrorCodes.INTERNAL_ERROR;
      case 501:
        return MCPErrorCodes.INTERNAL_ERROR; // Use closest available
      case 503:
        return MCPErrorCodes.INTERNAL_ERROR; // Use closest available
      default:
        return MCPErrorCodes.INTERNAL_ERROR;
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error: unknown): boolean {
    const details = this.extractErrorDetails(error);
    
    // Retryable HTTP status codes
    const retryableCodes = [408, 429, 500, 502, 503, 504];
    
    return retryableCodes.includes(details.code);
  }

  /**
   * Get retry delay for exponential backoff
   */
  getRetryDelay(attempt: number, baseDelay: number = 1000, maxDelay: number = 30000): number {
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Execute function with retry logic
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    context?: ErrorContext
  ): Promise<T> {
    let lastError: unknown;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries || !this.isRetryableError(error)) {
          this.handleError(error, { ...context, metadata: { attempt, maxRetries } });
          throw error;
        }

        const delay = this.getRetryDelay(attempt, baseDelay);
        
        this.logger.warn('Retrying after error', {
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: error instanceof Error ? error.message : String(error),
          context,
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Create user-friendly error message
   */
  createUserFriendlyMessage(error: unknown): string {
    const details = this.extractErrorDetails(error);
    
    switch (details.code) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Authentication required. Please provide valid credentials.';
      case 403:
        return 'Access denied. You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 429:
        return 'Rate limit exceeded. Please wait a moment and try again.';
      case 500:
        return 'An internal server error occurred. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Sanitize error for client response (remove sensitive information)
   */
  sanitizeError(error: unknown, includeStack: boolean = false): Partial<ErrorDetails> {
    const details = this.extractErrorDetails(error);
    
    return {
      code: details.code,
      message: details.message,
      details: details.details,
      ...(includeStack && { stack: details.stack }),
    };
  }
}