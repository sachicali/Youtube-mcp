/**
 * Cloudflare Workers Types
 * Enhanced type definitions for Cloudflare Workers runtime with WebSocket support
 */

// Import from environment types to avoid duplication
import type { ExecutionContext, CloudflareEnvironment, KVNamespace } from './environment.types';

/**
 * Cloudflare Workers request context
 */
export interface CloudflareRequestContext {
  request: Request;
  env: CloudflareEnvironment;
  ctx: ExecutionContext;
}

/**
 * WebSocket pair for Cloudflare Workers
 */
export interface WebSocketPair {
  0: WebSocket;
  1: WebSocket;
}

/**
 * WebSocket event types
 */
export type WebSocketEventType = 'open' | 'message' | 'close' | 'error';

/**
 * Enhanced WebSocket interface with Cloudflare Workers methods
 */
export interface CloudflareWebSocket extends WebSocket {
  accept(): void;
  send(message: string | ArrayBuffer): void;
  close(code?: number, reason?: string): void;
}

/**
 * Cloudflare Workers global types
 */
declare global {
  // ExecutionContext is already declared in environment.types
  
  // WebSocket constructor for Cloudflare Workers
  var WebSocketPair: {
    new(): WebSocketPair;
  };
  
  // Response with WebSocket upgrade
  interface ResponseInit {
    webSocket?: CloudflareWebSocket;
  }
}

/**
 * Cloudflare Workers fetch handler type
 */
export type CloudflareFetchHandler = (
  request: Request,
  env: CloudflareEnvironment,
  ctx: ExecutionContext
) => Promise<Response>;

/**
 * Cloudflare Workers module export
 */
export interface CloudflareWorkerModule {
  fetch: CloudflareFetchHandler;
}

/**
 * WebSocket upgrade utilities
 */
export class WebSocketUpgrade {
  static create(): WebSocketPair {
    return new WebSocketPair();
  }

  static upgradeRequest(request: Request, webSocket: CloudflareWebSocket): Response {
    return new Response(null, {
      status: 101,
      statusText: 'Switching Protocols',
      webSocket
    });
  }

  static isUpgradeRequest(request: Request): boolean {
    return request.headers.get('Upgrade') === 'websocket';
  }
}

/**
 * Cloudflare Workers environment utilities
 */
export class CloudflareEnvironmentUtils {
  static getEnvironmentType(env: CloudflareEnvironment): 'development' | 'staging' | 'production' {
    return env.ENVIRONMENT || 'development';
  }

  static isProduction(env: CloudflareEnvironment): boolean {
    return this.getEnvironmentType(env) === 'production';
  }

  static isDevelopment(env: CloudflareEnvironment): boolean {
    return this.getEnvironmentType(env) === 'development';
  }

  static getDebugMode(env: CloudflareEnvironment): boolean {
    return env.DEBUG === 'true' || this.isDevelopment(env);
  }
}

/**
 * Type guard for Cloudflare environment
 */
export function isCloudflareEnvironment(env: any): env is CloudflareEnvironment {
  return env && 
         typeof env.YOUTUBE_API_KEY === 'string' &&
         typeof env.ENVIRONMENT === 'string' &&
         env.YOUTUBE_MCP_KV &&
         typeof env.YOUTUBE_MCP_KV.get === 'function';
}

// Re-export types for convenience
export type { CloudflareEnvironment, ExecutionContext, KVNamespace };