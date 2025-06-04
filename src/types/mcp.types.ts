/**
 * MCP (Model Context Protocol) Types
 * 
 * Comprehensive type definitions for the MCP protocol including
 * requests, responses, tools, and server management.
 */

// JSON Schema type for tool input validation
export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  additionalProperties?: boolean | JSONSchema;
  description?: string;
  enum?: unknown[];
  const?: unknown;
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  allOf?: JSONSchema[];
  not?: JSONSchema;
  if?: JSONSchema;
  then?: JSONSchema;
  else?: JSONSchema;
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  multipleOf?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
}

// MCP Error Codes (as const enum for runtime usage)
export const MCPErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR: -32000,
  TOOL_NOT_FOUND: -32001,
  AUTHENTICATION_FAILED: -32002,
  AUTHORIZATION_FAILED: -32003,
  QUOTA_EXCEEDED: -32004,
  RATE_LIMITED: -32005,
  VALIDATION_FAILED: -32006,
  EXTERNAL_API_ERROR: -32007,
  CACHE_ERROR: -32008,
  CONFIGURATION_ERROR: -32009,
} as const;

export type MCPErrorCode = typeof MCPErrorCodes[keyof typeof MCPErrorCodes];

// Base MCP Request
export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

// MCP Error object
export interface MCPError {
  code: MCPErrorCode;
  message: string;
  data?: unknown;
}

// Base MCP Response
export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: MCPError;
}

// Tool Definition for Registration
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  handler: (input: unknown, context: MCPContext) => Promise<MCPToolResponse>;
}

// Tool Response
export interface MCPToolResponse {
  content: MCPContent[];
  isError?: boolean;
}

// Content types for tool responses
export interface MCPContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
  uri?: string;
}

// MCP Context for request processing
export interface MCPContext {
  environment: 'development' | 'production';
  requestId: string;
  userAgent?: string;
  clientInfo?: {
    name: string;
    version: string;
  };
  auth?: {
    type: 'api_key' | 'oauth';
    userId: string;
    scopes: string[];
  };
}

// Server Information
export interface MCPServerInfo {
  name: string;
  version: string;
  protocolVersion: string;
  capabilities: MCPServerCapabilities;
}

export interface MCPServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: Record<string, unknown>;
}

// Tool List Response
export interface MCPToolListResponse {
  tools: Array<{
    name: string;
    description: string;
    inputSchema: JSONSchema;
  }>;
}

// Tool Call Request
export interface MCPToolCallRequest extends MCPRequest {
  method: 'tools/call';
  params: {
    name: string;
    arguments?: Record<string, unknown>;
  };
}

// Server State Management
export interface MCPServerState {
  initialized: boolean;
  tools: Map<string, MCPTool>;
  clientInfo?: {
    name: string;
    version: string;
  };
  capabilities: MCPServerCapabilities;
}

// Tool Registry Interface
export interface MCPToolRegistry {
  register(tool: MCPTool): void;
  unregister(toolName: string): boolean;
  get(toolName: string): MCPTool | undefined;
  list(): MCPTool[];
  has(toolName: string): boolean;
  clear(): void;
  count(): number;
}

// Tool Execution Context
export interface MCPToolExecutionContext extends MCPContext {
  tool: MCPTool;
  input: unknown;
  startTime: number;
}

// Tool Execution Result
export interface MCPToolExecutionResult {
  success: boolean;
  response?: MCPToolResponse;
  error?: MCPError;
  executionTime: number;
}

// Validation Result
export interface MCPValidationResult {
  valid: boolean;
  errors: MCPValidationError[];
}

export interface MCPValidationError {
  path: string;
  message: string;
  code: string;
  value?: unknown;
}

// Resource Types (for future expansion)
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPResourceListResponse {
  resources: MCPResource[];
}

// Prompt Types (for future expansion)
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: JSONSchema;
}

export interface MCPPromptListResponse {
  prompts: MCPPrompt[];
}

// Event Types for Server Events
export interface MCPServerEvent {
  type: 'tool_registered' | 'tool_unregistered' | 'tool_called' | 'error' | 'initialized';
  timestamp: string;
  data?: unknown;
}

// Metrics and Monitoring
export interface MCPMetrics {
  requestCount: number;
  toolCalls: Record<string, number>;
  errorCount: number;
  averageResponseTime: number;
  uptime: number;
}

// Configuration for MCP Server
export interface MCPServerConfig {
  maxRequestSize: number;
  requestTimeout: number;
  enableMetrics: boolean;
  enableLogging: boolean;
  toolExecutionTimeout: number;
  maxConcurrentRequests: number;
}

// Health Check Response
export interface MCPHealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
  }[];
}

// Rate Limiting
export interface MCPRateLimit {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// Caching Interface
export interface MCPCacheEntry<T = unknown> {
  key: string;
  value: T;
  ttl: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
}

// Batch Operations
export interface MCPBatchRequest extends MCPRequest {
  method: 'batch';
  params: {
    requests: MCPRequest[];
  };
}

export interface MCPBatchResponse extends MCPResponse {
  result: {
    responses: MCPResponse[];
  };
}

// Security Context
export interface MCPSecurityContext {
  authenticated: boolean;
  userId?: string;
  permissions: string[];
  rateLimit: MCPRateLimit;
  ipAddress?: string;
  userAgent?: string;
}

// Tool Metadata for Advanced Features
export interface MCPToolMetadata {
  category: string;
  tags: string[];
  author: string;
  version: string;
  documentation?: string;
  examples?: Array<{
    input: unknown;
    output: MCPToolResponse;
    description: string;
  }>;
  requirements?: {
    permissions: string[];
    quotaCost: number;
    estimatedTime: number;
  };
}

// Extended Tool Definition with Metadata
export interface MCPToolWithMetadata extends MCPTool {
  metadata: MCPToolMetadata;
}

// Tool Discovery and Search
export interface MCPToolQuery {
  category?: string;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

export interface MCPToolSearchResult {
  tools: MCPToolWithMetadata[];
  total: number;
  hasMore: boolean;
}