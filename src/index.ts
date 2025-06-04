/**
 * YouTube Scraping MCP Server
 * 
 * Main entry point for the Cloudflare Workers-based MCP server
 * providing YouTube content analysis and transcript extraction tools.
 */

import type { CloudflareEnvironment } from '@/types/environment.types';
import './types/cloudflare.types'; // Import global type augmentations
import { ConfigurationService } from '@/services/configuration.service';
import { LoggerUtil } from '@/utils/logger.util';
import { ToolRegistryUtil } from '@/utils/tool-registry.util';
import { ErrorHandlerUtil } from '@/utils/error-handler.util';
import type { 
  MCPRequest, 
  MCPResponse, 
  MCPContext, 
  MCPToolListResponse,
  MCPServerInfo 
} from '@/types/mcp.types';
import { MCPErrorCodes } from '@/types/mcp.types';

// Cloudflare Workers Handler Interface
interface ExportedHandler<Env = CloudflareEnvironment> {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response>;
}

// Global service instances (lazy loaded)
let configService: ConfigurationService | null = null;
let logger: LoggerUtil | null = null;
let toolRegistry: ToolRegistryUtil | null = null;
let errorHandler: ErrorHandlerUtil | null = null;

/**
 * Main Cloudflare Workers export
 */
export default {
  async fetch(request: Request, env: CloudflareEnvironment, ctx: ExecutionContext): Promise<Response> {
    try {
      // Initialize services (lazy loading)
      await initializeServices(env);

      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return handleCORS();
      }

      // Parse and route the request
      return await handleRequest(request, env, ctx);

    } catch (error) {
      // Fallback error handling if services aren't initialized
      console.error('Critical error in main handler:', error);
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: MCPErrorCodes.INTERNAL_ERROR,
          message: 'Internal server error',
          data: { error: error instanceof Error ? error.message : String(error) }
        }
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  }
} satisfies ExportedHandler;

/**
 * Initialize all services with lazy loading pattern
 */
async function initializeServices(env: CloudflareEnvironment): Promise<void> {
  if (configService && logger && toolRegistry && errorHandler) {
    return; // Already initialized
  }

  try {
    // Initialize configuration service
    configService = new ConfigurationService(env);
    await configService.initialize();

    // Initialize logger
    logger = new LoggerUtil(configService.getConfiguration());

    // Initialize error handler
    errorHandler = new ErrorHandlerUtil(logger);

    // Initialize tool registry
    toolRegistry = new ToolRegistryUtil(configService, logger);
    await toolRegistry.initialize();

    logger.info('All services initialized successfully', {
      toolCount: toolRegistry.count(),
      environment: configService.getEnvironment(),
      debug: configService.isDebugMode(),
    });

  } catch (error) {
    console.error('Failed to initialize services:', error);
    throw error;
  }
}

/**
 * Handle incoming MCP requests
 */
async function handleRequest(
  request: Request, 
  env: CloudflareEnvironment, 
  ctx: ExecutionContext
): Promise<Response> {
  if (!logger || !errorHandler || !toolRegistry || !configService) {
    throw new Error('Services not initialized');
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Log incoming request
    logger.info('Incoming request', {
      requestId,
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('User-Agent'),
    });

    // Only allow POST requests for MCP
    if (request.method !== 'POST') {
      logger.error('Only POST requests are allowed', {
        requestId,
        httpCode: 405,
        mcpCode: MCPErrorCodes.METHOD_NOT_FOUND,
      });
      
      return errorHandler.createErrorResponse(
        405, // Method Not Allowed
        'Only POST requests are allowed',
        requestId
      );
    }

    // Parse MCP request
    const mcpRequest = await parseMCPRequest(request);
    if (!mcpRequest) {
      return errorHandler.createErrorResponse(
        400, // Bad Request
        'Invalid JSON-RPC request format',
        requestId
      );
    }

    // Create execution context
    const mcpContext: MCPContext = {
      environment: configService.getEnvironment(),
      requestId,
      userAgent: request.headers.get('User-Agent') || undefined,
      clientInfo: parseClientInfo(request),
      auth: parseAuthInfo(request),
    };

    // Route the request
    const response = await routeMCPRequest(mcpRequest, mcpContext);
    
    // Log successful response
    const executionTime = Date.now() - startTime;
    logger.info('Request completed successfully', {
      requestId,
      method: mcpRequest.method,
      executionTime,
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Request-ID': requestId,
        'X-Execution-Time': executionTime.toString(),
      },
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error('Request failed', {
      requestId,
      executionTime,
      error: error instanceof Error ? error.message : String(error),
    });

    // Handle known MCP errors
    if (error instanceof Error && 'code' in error) {
      return errorHandler.createErrorResponse(
        500, // Internal Server Error - map MCP errors to HTTP 500
        error.message,
        requestId
      );
    }

    // Handle unknown errors
    return errorHandler.createErrorResponse(
      500, // Internal Server Error
      'Internal server error',
      requestId
    );
  }
}

/**
 * Parse JSON-RPC request from HTTP request
 */
async function parseMCPRequest(request: Request): Promise<MCPRequest | null> {
  try {
    const body = await request.json();
    
    // Validate basic JSON-RPC structure
    if (
      typeof body === 'object' &&
      body !== null &&
      body.jsonrpc === '2.0' &&
      ('id' in body) &&
      typeof body.method === 'string'
    ) {
      return body as MCPRequest;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Route MCP requests to appropriate handlers
 */
async function routeMCPRequest(request: MCPRequest, context: MCPContext): Promise<MCPResponse> {
  if (!toolRegistry || !logger) {
    throw new Error('Services not initialized');
  }

  const { method, params, id } = request;

  try {
    switch (method) {
      case 'initialize':
        return handleInitialize(id);

      case 'tools/list':
        return handleToolsList(id);

      case 'tools/call':
        return await handleToolCall(params, context, id);

      case 'ping':
        return handlePing(id);

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  } catch (error) {
    logger.error('Method execution failed', {
      method,
      requestId: context.requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: MCPErrorCodes.METHOD_NOT_FOUND,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Handle initialize method
 */
function handleInitialize(id: string | number): MCPResponse {
  const serverInfo: MCPServerInfo = {
    name: 'YouTube Scraping MCP Server',
    version: '1.0.0',
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {
        listChanged: false,
      },
      logging: {},
    },
  };

  return {
    jsonrpc: '2.0',
    id,
    result: serverInfo,
  };
}

/**
 * Handle tools/list method
 */
function handleToolsList(id: string | number): MCPResponse {
  if (!toolRegistry) {
    throw new Error('Tool registry not initialized');
  }

  const tools = toolRegistry.listTools();
  const response: MCPToolListResponse = {
    tools: tools.map((tool: { name: string; description: string; inputSchema: any }) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };

  return {
    jsonrpc: '2.0',
    id,
    result: response,
  };
}

/**
 * Handle tools/call method
 */
async function handleToolCall(
  params: unknown,
  context: MCPContext,
  id: string | number
): Promise<MCPResponse> {
  if (!toolRegistry) {
    throw new Error('Tool registry not initialized');
  }

  // Validate params structure
  if (
    typeof params !== 'object' ||
    params === null ||
    !('name' in params) ||
    typeof params.name !== 'string'
  ) {
    throw new Error('Invalid tool call parameters');
  }

  const { name, arguments: toolArgs } = params as { name: string; arguments?: unknown };

  try {
    const result = await toolRegistry.executeTool(name, toolArgs, context);
    
    return {
      jsonrpc: '2.0',
      id,
      result,
    };
  } catch (error) {
    throw error; // Re-throw to be handled by outer error handling
  }
}

/**
 * Handle ping method
 */
function handlePing(id: string | number): MCPResponse {
  if (!toolRegistry) {
    throw new Error('Tool registry not initialized');
  }

  return {
    jsonrpc: '2.0',
    id,
    result: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      capabilities: toolRegistry.listTools().map((tool: { name: string }) => tool.name),
    },
  };
}

/**
 * Handle CORS preflight requests
 */
function handleCORS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Parse client information from request headers
 */
function parseClientInfo(request: Request): { name: string; version: string } | undefined {
  const userAgent = request.headers.get('User-Agent');
  if (!userAgent) return undefined;

  // Simple user agent parsing - could be enhanced
  return {
    name: userAgent.split(' ')[0] || 'Unknown',
    version: '1.0.0',
  };
}

/**
 * Parse authentication information from request headers
 */
function parseAuthInfo(request: Request): MCPContext['auth'] | undefined {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return undefined;

  // Basic API key authentication
  if (authHeader.startsWith('Bearer ')) {
    return {
      type: 'api_key',
      userId: 'anonymous',
      scopes: ['read'],
    };
  }

  return undefined;
}