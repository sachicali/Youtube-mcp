/**
 * YouTube Scraping MCP Server
 * Cloudflare Workers entry point with Remote MCP capabilities
 */

import { RemoteMCPServer } from './remote-mcp-server';
import { ConfigurationService } from './services/configuration.service';
import { LoggerUtil } from './utils/logger.util';
import { ErrorHandlerUtil } from './utils/error-handler.util';
import { ToolRegistryUtil } from './utils/tool-registry.util';
import type { CloudflareEnvironment, ExecutionContext, CloudflareRequestContext } from './types/environment.types';

/**
 * Global service instances (lazy loaded)
 */
let configService: ConfigurationService | null = null;
let logger: LoggerUtil | null = null;
let toolRegistry: ToolRegistryUtil | null = null;
let errorHandler: ErrorHandlerUtil | null = null;
let remoteMCPServer: RemoteMCPServer | null = null;

/**
 * Cloudflare Worker interface
 */
interface Env extends CloudflareEnvironment {}

/**
 * Worker export interface
 */
export interface ExportedHandler {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response>;
}

/**
 * Main worker class
 */
export default class YouTubeMCPWorker implements ExportedHandler {
  async fetch(request: Request, env: CloudflareEnvironment, ctx: ExecutionContext): Promise<Response> {
    try {
      // Initialize services if not already done
      await this.initializeServices(env);

      // Ensure services are initialized
      if (!configService || !logger || !toolRegistry || !errorHandler || !remoteMCPServer) {
        throw new Error('Failed to initialize services');
      }

      // Create the context object that handleRequest expects
      const context: CloudflareRequestContext = {
        request,
        env,
        ctx
      };

      // Handle the request through the Remote MCP Server
      return await remoteMCPServer.handleRequest(context);

    } catch (error) {
      // Fallback error handling if services aren't initialized
      console.error('Worker error:', error);
      
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }
        },
        id: null
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }
  }

  /**
   * Initialize all services with lazy loading pattern
   */
  private async initializeServices(env: CloudflareEnvironment): Promise<void> {
    // Return early if already initialized
    if (configService && logger && toolRegistry && errorHandler && remoteMCPServer) {
      return;
    }

    try {
      // Initialize configuration service
      if (!configService) {
        configService = new ConfigurationService(env);
        await configService.initialize();
      }

      // Initialize logger
      if (!logger) {
        logger = new LoggerUtil(configService.getConfiguration());
      }

      // Initialize error handler
      if (!errorHandler) {
        errorHandler = new ErrorHandlerUtil(logger);
      }

      // Initialize tool registry
      if (!toolRegistry) {
        toolRegistry = new ToolRegistryUtil(configService, logger);
      }

      // Initialize Remote MCP Server
      if (!remoteMCPServer) {
        remoteMCPServer = new RemoteMCPServer(env);
        await remoteMCPServer.initialize();
      }

      logger.info('All services initialized successfully');

    } catch (error) {
      console.error('Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Health check method for service monitoring
   */
  async healthCheck(
    request: Request,
    env: CloudflareEnvironment,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      await this.initializeServices(env);

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          configuration: configService?.isInitialized() ?? false,
          logger: logger !== null,
          toolRegistry: toolRegistry !== null,
          errorHandler: errorHandler !== null,
          remoteMCPServer: remoteMCPServer !== null
        },
        environment: env.ENVIRONMENT,
        version: '0.3.0'
      };

      return new Response(JSON.stringify(health, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

    } catch (error) {
      const errorHealth = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        version: '0.3.0'
      };

      return new Response(JSON.stringify(errorHealth, null, 2), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
    }
  }
}

/**
 * Export the default handler for Cloudflare Workers
 */
export { YouTubeMCPWorker };