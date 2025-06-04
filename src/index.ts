/**
 * YouTube Scraping MCP Server - Main Entry Point
 * 
 * Cloudflare Workers entry point for the MCP server with tool registry,
 * request handling, and error boundaries.
 */

import type { CloudflareEnvironment } from '@/types/environment.types';
import type { MCPRequest, MCPResponse, MCPContext } from '@/types/mcp.types';
import { MCPErrorCodes } from '@/types/mcp.types';
import { ConfigurationService } from '@/services/configuration.service';
import { ToolRegistryUtil } from '@/utils/tool-registry.util';
import { ErrorHandlerUtil } from '@/utils/error-handler.util';
import { LoggerUtil } from '@/utils/logger.util';

// Cloudflare Workers type definitions (temporary)
interface ExportedHandler<Env = unknown> {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response>;
}

declare global {
  const Request: typeof globalThis.Request;
  const Response: typeof globalThis.Response;
  const ExecutionContext: typeof globalThis.ExecutionContext;
  const crypto: typeof globalThis.crypto;
  const console: typeof globalThis.console;
}

// Global instances (initialized once per worker)
let configService: ConfigurationService;
let toolRegistry: ToolRegistryUtil;
let errorHandler: ErrorHandlerUtil;
let logger: LoggerUtil;

/**
 * Cloudflare Workers fetch event handler
 * Entry point for all HTTP requests to the MCP server
 */
export default {
  async fetch(request: Request, env: CloudflareEnvironment, ctx: ExecutionContext): Promise<Response> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    try {
      // Initialize services on first request
      if (!configService) {
        await initializeServices(env);
      }

      // Create MCP context for this request
      const context = createMCPContext(request, env, requestId);
      
      // Log incoming request
      logger.info('Incoming request', {
        requestId,
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('User-Agent'),
      });

      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return handleCORS();
      }

      // Validate request method
      if (request.method !== 'POST') {
        return errorHandler.createErrorResponse(
          MCPErrorCodes.INVALID_REQUEST,
          'Only POST requests are supported',
          requestId
        );
      }

      // Parse and validate MCP request
      const mcpRequest = await parseMCPRequest(request);
      if (!mcpRequest) {
        return errorHandler.createErrorResponse(
          MCPErrorCodes.PARSE_ERROR,
          'Invalid JSON or missing required fields',
          requestId
        );
      }

      // Handle the MCP request
      const mcpResponse = await handleMCPRequest(mcpRequest, context);

      // Create HTTP response
      const response = new Response(JSON.stringify(mcpResponse), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });

      // Log response metrics
      const processingTime = Date.now() - startTime;
      logger.info('Request completed', {
        requestId,
        processingTime,
        success: !mcpResponse.error,
      });

      return response;

    } catch (error) {
      // Handle unexpected errors
      logger.error('Unhandled error in fetch handler', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return errorHandler.createErrorResponse(
        MCPErrorCodes.INTERNAL_ERROR,
        'Internal server error',
        requestId
      );
    }
  },
} satisfies ExportedHandler<CloudflareEnvironment>;

/**
 * Initialize all services and utilities
 */
async function initializeServices(env: CloudflareEnvironment): Promise<void> {
  try {
    // Initialize configuration service
    configService = new ConfigurationService(env);
    await configService.initialize();

    // Initialize logger with configuration
    logger = new LoggerUtil(configService.getConfiguration());

    // Initialize error handler
    errorHandler = new ErrorHandlerUtil(logger);

    // Initialize tool registry
    toolRegistry = new ToolRegistryUtil(configService, logger);
    await toolRegistry.initialize();

    logger.info('Services initialized successfully', {
      environment: configService.getEnvironment(),
      toolCount: toolRegistry.getRegisteredToolCount(),
    });

  } catch (error) {
    console.error('Failed to initialize services:', error);
    throw error;
  }
}

/**
 * Create MCP context from request and environment
 */
function createMCPContext(
  request: Request,
  env: CloudflareEnvironment,
  requestId: string
): MCPContext {
  const userAgent = request.headers.get('User-Agent');
  const authorization = request.headers.get('Authorization');

  return {
    environment: env.ENVIRONMENT,
    requestId,
    userAgent: userAgent || undefined,
    clientInfo: parseClientInfo(userAgent),
    auth: parseAuthHeader(authorization),
  };
}

/**
 * Parse client information from User-Agent header
 */
function parseClientInfo(userAgent: string | null): { name: string; version: string } | undefined {
  if (!userAgent) return undefined;

  // Basic client info extraction (can be enhanced)
  const match = userAgent.match(/(\w+)\/(\d+\.\d+\.\d+)/);
  if (match) {
    return {
      name: match[1],
      version: match[2],
    };
  }

  return {
    name: 'Unknown',
    version: '0.0.0',
  };
}

/**
 * Parse authentication from Authorization header
 */
function parseAuthHeader(authorization: string | null): MCPContext['auth'] {
  if (!authorization) return undefined;

  if (authorization.startsWith('Bearer ')) {
    const token = authorization.substring(7);
    // For now, treat all bearer tokens as API keys
    // OAuth implementation would decode JWT here
    return {
      type: 'api_key',
      userId: 'api_user', // Would extract from token in real implementation
      scopes: [], // Would extract from token
    };
  }

  return undefined;
}

/**
 * Parse incoming request as MCP request
 */
async function parseMCPRequest(request: Request): Promise<MCPRequest | null> {
  try {
    const body = await request.json() as MCPRequest;
    
    // Validate required MCP fields
    if (
      body.jsonrpc !== '2.0' ||
      typeof body.id === 'undefined' ||
      typeof body.method !== 'string'
    ) {
      return null;
    }

    return body;
  } catch {
    return null;
  }
}

/**
 * Handle MCP request routing and execution
 */
async function handleMCPRequest(
  request: MCPRequest,
  context: MCPContext
): Promise<MCPResponse> {
  try {
    // Route different MCP methods
    switch (request.method) {
      case 'tools/list':
        return await handleToolsList(request, context);
      
      case 'tools/call':
        return await handleToolCall(request, context);
      
      case 'ping':
        return await handlePing(request, context);
      
      default:
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: MCPErrorCodes.METHOD_NOT_FOUND,
            message: `Method not found: ${request.method}`,
          },
        };
    }
  } catch (error) {
    logger.error('Error handling MCP request', {
      requestId: context.requestId,
      method: request.method,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: MCPErrorCodes.INTERNAL_ERROR,
        message: 'Internal error processing request',
        data: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Handle tools/list request
 */
async function handleToolsList(
  request: MCPRequest,
  context: MCPContext
): Promise<MCPResponse> {
  const tools = toolRegistry.listTools();
  
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    },
  };
}

/**
 * Handle tools/call request
 */
async function handleToolCall(
  request: MCPRequest,
  context: MCPContext
): Promise<MCPResponse> {
  const params = request.params as { name?: string; arguments?: unknown };
  
  if (!params?.name) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: MCPErrorCodes.INVALID_PARAMS,
        message: 'Missing tool name parameter',
      },
    };
  }

  const result = await toolRegistry.executeTool(
    params.name,
    params.arguments || {},
    context
  );

  return {
    jsonrpc: '2.0',
    id: request.id,
    result,
  };
}

/**
 * Handle ping request for health checks
 */
async function handlePing(
  request: MCPRequest,
  context: MCPContext
): Promise<MCPResponse> {
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      pong: true,
      timestamp: new Date().toISOString(),
      environment: context.environment,
      serverInfo: {
        name: 'YouTube Scraping MCP Server',
        version: '0.1.0',
        capabilities: toolRegistry.listTools().map(tool => tool.name),
      },
    },
  };
}

/**
 * Handle CORS preflight requests
 */
function handleCORS(): Response {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}