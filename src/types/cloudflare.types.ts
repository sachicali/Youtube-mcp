/**
 * Cloudflare Workers Type Definitions
 * 
 * Cloudflare-specific types for Workers runtime environment.
 * Uses existing Web API types from @cloudflare/workers-types.
 */

/**
 * Environment variables provided to the Cloudflare Worker
 */
export interface CloudflareEnvironment {
  // YouTube API Configuration
  YOUTUBE_API_KEY: string;
  
  // Optional OAuth Configuration (for future user-specific features)
  YOUTUBE_CLIENT_ID?: string;
  YOUTUBE_CLIENT_SECRET?: string;
  
  // Cloudflare KV Bindings
  CACHE_KV: KVNamespace;
  
  // Optional configuration
  LOG_LEVEL?: string;
  ENVIRONMENT?: string;
}

/**
 * Cloudflare KV namespace interface
 */
export interface KVNamespace {
  get(key: string, options?: KVNamespaceGetOptions): Promise<string | null>;
  put(key: string, value: string, options?: KVNamespacePutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: KVNamespaceListOptions): Promise<KVNamespaceListResult>;
}

/**
 * KV namespace operation options
 */
export interface KVNamespaceGetOptions {
  type?: 'text' | 'json' | 'arrayBuffer' | 'stream';
  cacheTtl?: number;
}

export interface KVNamespacePutOptions {
  expirationTtl?: number;
  expiration?: number;
  metadata?: Record<string, unknown>;
}

export interface KVNamespaceListOptions {
  limit?: number;
  prefix?: string;
  cursor?: string;
}

export interface KVNamespaceListResult {
  keys: Array<{
    name: string;
    expiration?: number;
    metadata?: Record<string, unknown>;
  }>;
  list_complete: boolean;
  cursor?: string;
}

/**
 * Cloudflare Workers Request interface extensions
 */
export interface CloudflareRequest extends Request {
  cf?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
    [key: string]: unknown;
  };
}

/**
 * Cloudflare Workers Response interface extensions
 */
export interface CloudflareResponse extends Response {
  webSocket?: WebSocket;
}

/**
 * Worker fetch handler signature
 */
export interface WorkerFetchHandler {
  (
    request: CloudflareRequest,
    env: CloudflareEnvironment,
    ctx: ExecutionContext
  ): Promise<CloudflareResponse>;
}

/**
 * Cloudflare Workers execution context
 */
export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

/**
 * Worker export interface
 */
export interface WorkerExports {
  fetch: WorkerFetchHandler;
}

// Cloudflare Workers Handler interface
export interface CloudflareWorkerHandler<Env = unknown> {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response>;
}

// Make ExecutionContext globally available
declare global {
  interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
    passThroughOnException(): void;
  }
}