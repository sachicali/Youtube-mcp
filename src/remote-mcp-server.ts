/**
 * Remote MCP Server
 * Main orchestrator for multi-client Remote MCP server functionality
 * Extends the core MCP server with WebSocket transport and authentication
 */

import type { CloudflareEnvironment, CloudflareRequestContext, ExecutionContext } from './types/cloudflare.types';
import type { ServerHealth, RemoteMCPContext } from './types/remote-mcp.types';
import type { MCPContext } from './types/mcp.types';

// Core services
import { ConfigurationService } from './services/configuration.service';
import { YouTubeService } from './services/youtube.service';

// Remote MCP services
import { AuthenticationService } from './services/authentication.service';
import { ConnectionManagementService } from './services/connection-management.service';
import { WebSocketTransportService } from './services/websocket-transport.service';

// Utilities
import { LoggerUtil } from './utils/logger.util';
import { ErrorHandlerUtil } from './utils/error-handler.util';
import { ToolRegistryUtil } from './utils/tool-registry.util';

/**
 * Remote MCP Server Class
 * Handles WebSocket connections, authentication, and tool execution
 */
export class RemoteMCPServer {
  private configService: ConfigurationService;
  private logger: LoggerUtil;
  private errorHandler: ErrorHandlerUtil;
  private toolRegistry: ToolRegistryUtil;
  
  // Core services
  private youTubeService: YouTubeService;
  
  // Remote MCP services
  private authService: AuthenticationService;
  private connectionManager: ConnectionManagementService;
  private wsTransport: WebSocketTransportService;

  constructor(private env: CloudflareEnvironment) {
    // Initialize core utilities
    this.configService = new ConfigurationService(env);
    this.logger = new LoggerUtil(this.configService.getConfiguration());
    this.errorHandler = new ErrorHandlerUtil(this.logger);
    this.toolRegistry = new ToolRegistryUtil(this.configService, this.logger);

    // Initialize core services
    this.youTubeService = new YouTubeService(this.configService, this.logger, env);

    // Initialize remote MCP services
    this.authService = new AuthenticationService(env, this.logger, this.errorHandler);
    this.connectionManager = new ConnectionManagementService(env, this.logger, this.errorHandler);
    this.wsTransport = new WebSocketTransportService(
      env, 
      this.logger, 
      this.errorHandler, 
      this.authService, 
      this.connectionManager
    );
  }

  /**
   * Initialize the Remote MCP server
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Remote MCP Server');

      // Register placeholder tools (actual tools to be implemented)
      await this.registerPlaceholderTools();

      this.logger.info('Remote MCP Server initialized successfully', {
        toolsRegistered: this.toolRegistry.listTools().length,
        serverCapabilities: ['websocket', 'authentication', 'real-time', 'multi-user']
      });

    } catch (error) {
      this.logger.error('Failed to initialize Remote MCP Server', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Handle incoming HTTP requests
   */
  async handleRequest(context: CloudflareRequestContext): Promise<Response> {
    const { request, env, ctx } = context;
    const url = new URL(request.url);

    try {
      // Health check endpoint
      if (url.pathname === '/health') {
        return await this.handleHealthCheck();
      }

      // WebSocket upgrade for real-time connections
      if (url.pathname === '/ws' && request.headers.get('Upgrade') === 'websocket') {
        return await this.wsTransport.handleUpgrade(request);
      }

      // HTTP API endpoints for tools (fallback for non-WebSocket clients)
      if (url.pathname.startsWith('/api/')) {
        return await this.handleApiRequest(request);
      }

      // MCP protocol endpoint (standard MCP over HTTP)
      if (url.pathname === '/mcp' && request.method === 'POST') {
        return await this.handleMCPRequest(request);
      }

      // Default response
      return new Response('Remote MCP Server - WebSocket endpoint available at /ws', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });

    } catch (error) {
      this.logger.error('Request handling failed', {
        method: request.method,
        url: request.url,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return this.errorHandler.createErrorResponse(
        500, 
        'Internal server error', 
        'request-handling'
      );
    }
  }

  /**
   * Handle health check requests
   */
  private async handleHealthCheck(): Promise<Response> {
    try {
      const health = await this.getServerHealth();
      
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;

      return new Response(JSON.stringify(health), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return this.errorHandler.createErrorResponse(
        503, 
        'Health check failed', 
        'health-check'
      );
    }
  }

  /**
   * Handle HTTP API requests (REST-like interface)
   */
  private async handleApiRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // API routes: /api/tools, /api/tools/{toolName}
    if (pathParts[1] === 'tools') {
      if (request.method === 'GET' && pathParts.length === 2) {
        // List all tools
        const tools = this.toolRegistry.listTools();
        return new Response(JSON.stringify({ tools }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (request.method === 'POST' && pathParts.length === 3) {
        // Execute specific tool
        const toolName = pathParts[2];
        const input = await request.json();
        
        // Create a mock context for HTTP API
        const mockContext: MCPContext = {
          environment: 'development',
          requestId: crypto.randomUUID()
        };

        try {
          const result = await this.toolRegistry.executeTool(toolName, input, mockContext);
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return this.errorHandler.createErrorResponse(
            400, 
            error instanceof Error ? error.message : 'Tool execution failed', 
            'tool-execution'
          );
        }
      }
    }

    return this.errorHandler.createErrorResponse(404, 'API endpoint not found', 'api-not-found');
  }

  /**
   * Handle standard MCP protocol requests over HTTP
   */
  private async handleMCPRequest(request: Request): Promise<Response> {
    try {
      const mcpRequest = await request.json();
      
      // Handle standard MCP methods
      switch (mcpRequest.method) {
        case 'tools/list':
          const tools = this.toolRegistry.listTools();
          return new Response(JSON.stringify({
            jsonrpc: '2.0',
            id: mcpRequest.id,
            result: { tools }
          }), {
            headers: { 'Content-Type': 'application/json' }
          });

        case 'tools/call':
          const mockContext: MCPContext = {
            environment: 'development',
            requestId: crypto.randomUUID()
          };

          const result = await this.toolRegistry.executeTool(
            mcpRequest.params.name, 
            mcpRequest.params.arguments, 
            mockContext
          );

          return new Response(JSON.stringify({
            jsonrpc: '2.0',
            id: mcpRequest.id,
            result
          }), {
            headers: { 'Content-Type': 'application/json' }
          });

        default:
          return this.errorHandler.createErrorResponse(
            400, 
            `Unknown MCP method: ${mcpRequest.method}`, 
            'unknown-method'
          );
      }

    } catch (error) {
      this.logger.error('MCP request handling failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return this.errorHandler.createErrorResponse(
        400, 
        'Invalid MCP request', 
        'invalid-mcp'
      );
    }
  }

  /**
   * Initialize built-in tools from ToolRegistry
   */
  private async registerPlaceholderTools(): Promise<void> {
    // The ToolRegistryUtil automatically registers all built-in tools during initialization
    // including getVideoTranscript, getVideoAnalytics, analyzeChannelPerformance, etc.
    await this.toolRegistry.initialize();

    const registeredTools = this.toolRegistry.listTools();
    
    this.logger.info('Built-in tools registered successfully', {
      toolCount: registeredTools.length,
      toolNames: registeredTools.map(t => t.name)
    });
  }

  /**
   * Get comprehensive server health status
   */
  async getServerHealth(): Promise<ServerHealth> {
    try {
      // Get connection statistics
      const connectionStats = this.connectionManager.getConnectionStats();
      const authStats = this.authService.getAuthStats();
      const wsStats = this.wsTransport.getConnectionStats();

      // Test core services
      const services = {
        youtube: 'online' as const, // Would test YouTube API connectivity
        cache: 'online' as const,   // Would test KV connectivity
        database: 'online' as const // Would test persistent storage
      };

      // Calculate health status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (connectionStats.activeConnections < connectionStats.totalConnections * 0.7) {
        status = 'degraded';
      }

      return {
        status,
        timestamp: new Date().toISOString(),
        metrics: {
          activeConnections: connectionStats.activeConnections,
          totalRequests: 0, // Would track this in production
          averageResponseTime: 0, // Would calculate from metrics
          errorRate: 0, // Would calculate from error tracking
          quotaUsage: authStats.totalQuotaUsed
        },
        services
      };

    } catch (error) {
      this.logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        metrics: {
          activeConnections: 0,
          totalRequests: 0,
          averageResponseTime: 0,
          errorRate: 100,
          quotaUsage: 0
        },
        services: {
          youtube: 'offline',
          cache: 'offline',
          database: 'offline'
        }
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Remote MCP Server');

    try {
      // Close all WebSocket connections
      await this.wsTransport.closeAllConnections();
      
      // Cleanup services
      await Promise.all([
        this.connectionManager.cleanup(),
        this.authService.cleanup()
      ]);

      this.logger.info('Remote MCP Server shutdown completed');

    } catch (error) {
      this.logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

/**
 * Cloudflare Workers entry point for Remote MCP Server
 */
let remoteMCPServer: RemoteMCPServer | null = null;

export default {
  async fetch(request: Request, env: CloudflareEnvironment, ctx: ExecutionContext): Promise<Response> {
    try {
      // Initialize server if not already done
      if (!remoteMCPServer) {
        remoteMCPServer = new RemoteMCPServer(env);
        await remoteMCPServer.initialize();
      }

      // Handle the request
      return await remoteMCPServer.handleRequest({ request, env, ctx });

    } catch (error) {
      console.error('Remote MCP Server error:', error);
      
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};