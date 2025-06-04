/**
 * Tool Registry Utility
 * 
 * Manages MCP tool registration, discovery, validation, and execution
 * with comprehensive error handling and logging.
 */

import type { 
  MCPTool, 
  MCPToolResponse, 
  MCPContext, 
  MCPToolRegistry,
  MCPToolExecutionResult,
  MCPValidationResult,
  MCPErrorCode,
  JSONSchema
} from '@/types/mcp.types';
import { MCPErrorCodes } from '@/types/mcp.types';
import type { ConfigurationService } from '@/services/configuration.service';
import type { LoggerUtil } from '@/utils/logger.util';

export class ToolRegistryUtil implements MCPToolRegistry {
  private tools: Map<string, MCPTool> = new Map();
  private config: ConfigurationService;
  private logger: LoggerUtil;
  private initialized: boolean = false;

  constructor(config: ConfigurationService, logger: LoggerUtil) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Initialize the tool registry
   */
  async initialize(): Promise<void> {
    try {
      // Register built-in tools
      await this.registerBuiltInTools();
      
      this.initialized = true;
      this.logger.info('Tool registry initialized', {
        toolCount: this.tools.size,
        tools: Array.from(this.tools.keys()),
      });
    } catch (error) {
      this.logger.error('Failed to initialize tool registry', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Register a new tool
   */
  register(tool: MCPTool): void {
    // Validate tool definition
    const validation = this.validateTool(tool);
    if (!validation.valid) {
      const errorMessage = validation.errors.map(e => e.message).join(', ');
      throw new Error(`Invalid tool definition: ${errorMessage}`);
    }

    // Check for existing tool with same name
    if (this.tools.has(tool.name)) {
      this.logger.warn('Overwriting existing tool', { toolName: tool.name });
    }

    this.tools.set(tool.name, tool);
    this.logger.info('Tool registered', {
      toolName: tool.name,
      description: tool.description,
    });
  }

  /**
   * Unregister a tool
   */
  unregister(toolName: string): boolean {
    const existed = this.tools.has(toolName);
    this.tools.delete(toolName);
    
    if (existed) {
      this.logger.info('Tool unregistered', { toolName });
    }
    
    return existed;
  }

  /**
   * Get a specific tool
   */
  get(toolName: string): MCPTool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * List all registered tools
   */
  list(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Check if a tool exists
   */
  has(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Clear all tools
   */
  clear(): void {
    const toolCount = this.tools.size;
    this.tools.clear();
    this.logger.info('All tools cleared', { clearedCount: toolCount });
  }

  /**
   * Get tool count
   */
  count(): number {
    return this.tools.size;
  }

  /**
   * Get registered tool count (alias for external interface)
   */
  getRegisteredToolCount(): number {
    return this.tools.size;
  }

  /**
   * List tools for MCP response
   */
  listTools(): Array<{ name: string; description: string; inputSchema: JSONSchema }> {
    return this.list().map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * Execute a tool with comprehensive error handling
   */
  async executeTool(
    toolName: string, 
    input: unknown, 
    context: MCPContext
  ): Promise<MCPToolResponse> {
    const startTime = Date.now();
    
    this.logger.info('Executing tool', {
      toolName,
      requestId: context.requestId,
      userId: context.auth?.userId,
    });

    try {
      // Check if tool exists
      const tool = this.tools.get(toolName);
      if (!tool) {
        throw new ToolNotFoundError(`Tool '${toolName}' not found`);
      }

      // Validate input against schema
      const validation = this.validateInput(tool.inputSchema, input);
      if (!validation.valid) {
        const errorMessage = validation.errors.map(e => `${e.path}: ${e.message}`).join(', ');
        throw new ValidationError(`Input validation failed: ${errorMessage}`);
      }

      // Execute the tool
      const result = await tool.handler(input, context);
      
      const executionTime = Date.now() - startTime;
      this.logger.info('Tool executed successfully', {
        toolName,
        executionTime,
        requestId: context.requestId,
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      this.logger.error('Tool execution failed', {
        toolName,
        executionTime,
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Convert error to MCP format
      if (error instanceof ToolNotFoundError) {
        throw new MCPToolError(MCPErrorCodes.TOOL_NOT_FOUND, error.message);
      }
      
      if (error instanceof ValidationError) {
        throw new MCPToolError(MCPErrorCodes.VALIDATION_FAILED, error.message);
      }

      if (error instanceof MCPToolError) {
        throw error;
      }

      // Generic error
      throw new MCPToolError(
        MCPErrorCodes.INTERNAL_ERROR,
        `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate tool definition
   */
  private validateTool(tool: MCPTool): MCPValidationResult {
    const errors: Array<{ path: string; message: string; code: string }> = [];

    // Validate name
    if (!tool.name || typeof tool.name !== 'string') {
      errors.push({
        path: 'name',
        message: 'Tool name is required and must be a string',
        code: 'MISSING_NAME',
      });
    } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(tool.name)) {
      errors.push({
        path: 'name',
        message: 'Tool name must start with a letter and contain only letters, numbers, and underscores',
        code: 'INVALID_NAME',
      });
    }

    // Validate description
    if (!tool.description || typeof tool.description !== 'string') {
      errors.push({
        path: 'description',
        message: 'Tool description is required and must be a string',
        code: 'MISSING_DESCRIPTION',
      });
    }

    // Validate input schema
    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
      errors.push({
        path: 'inputSchema',
        message: 'Tool input schema is required and must be a valid JSON Schema',
        code: 'MISSING_SCHEMA',
      });
    }

    // Validate handler
    if (!tool.handler || typeof tool.handler !== 'function') {
      errors.push({
        path: 'handler',
        message: 'Tool handler is required and must be a function',
        code: 'MISSING_HANDLER',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate input against JSON Schema
   */
  private validateInput(schema: JSONSchema, input: unknown): MCPValidationResult {
    const errors: Array<{ path: string; message: string; code: string }> = [];

    try {
      // Basic type validation
      if (schema.type) {
        const actualType = this.getJSONType(input);
        if (schema.type !== actualType) {
          errors.push({
            path: '',
            message: `Expected type '${schema.type}', got '${actualType}'`,
            code: 'TYPE_MISMATCH',
          });
        }
      }

      // Required properties validation
      if (schema.type === 'object' && schema.required && typeof input === 'object' && input !== null) {
        const obj = input as Record<string, unknown>;
        for (const requiredProp of schema.required) {
          if (!(requiredProp in obj)) {
            errors.push({
              path: requiredProp,
              message: `Required property '${requiredProp}' is missing`,
              code: 'MISSING_PROPERTY',
            });
          }
        }
      }

      // Enum validation
      if (schema.enum && !schema.enum.includes(input)) {
        errors.push({
          path: '',
          message: `Value must be one of: ${schema.enum.map(v => JSON.stringify(v)).join(', ')}`,
          code: 'ENUM_VIOLATION',
        });
      }

      // String length validation
      if (schema.type === 'string' && typeof input === 'string') {
        if (schema.minLength !== undefined && input.length < schema.minLength) {
          errors.push({
            path: '',
            message: `String length must be at least ${schema.minLength}`,
            code: 'MIN_LENGTH',
          });
        }
        if (schema.maxLength !== undefined && input.length > schema.maxLength) {
          errors.push({
            path: '',
            message: `String length must be at most ${schema.maxLength}`,
            code: 'MAX_LENGTH',
          });
        }
      }

      // Number range validation
      if (schema.type === 'number' && typeof input === 'number') {
        if (schema.minimum !== undefined && input < schema.minimum) {
          errors.push({
            path: '',
            message: `Number must be at least ${schema.minimum}`,
            code: 'MIN_VALUE',
          });
        }
        if (schema.maximum !== undefined && input > schema.maximum) {
          errors.push({
            path: '',
            message: `Number must be at most ${schema.maximum}`,
            code: 'MAX_VALUE',
          });
        }
      }

    } catch (error) {
      errors.push({
        path: '',
        message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
        code: 'VALIDATION_ERROR',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get JSON type of a value
   */
  private getJSONType(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * Register built-in tools
   */
  private async registerBuiltInTools(): Promise<void> {
    // Register placeholder tools for the 7 planned tools
    const builtInTools: MCPTool[] = [
      {
        name: 'getVideoTranscript',
        description: 'Extract transcript from a YouTube video URL or video ID',
        inputSchema: {
          type: 'object',
          properties: {
            videoUrl: {
              type: 'string',
              description: 'YouTube video URL or direct video ID (supports youtube.com/watch, youtu.be, and direct video IDs)',
              minLength: 11,
            },
            language: {
              type: 'string',
              description: 'Preferred language code (optional, defaults to English)',
              default: 'en',
              pattern: '^[a-z]{2}(-[A-Z]{2})?$',
            },
          },
          required: ['videoUrl'],
          additionalProperties: false,
        },
        handler: async (input: unknown, context: MCPContext): Promise<MCPToolResponse> => {
          try {
            // Import services dynamically to avoid circular dependencies
            const { YouTubeService } = await import('@/services/youtube.service');
            const { ConfigurationService } = await import('@/services/configuration.service');
            const { LoggerUtil } = await import('@/utils/logger.util');
            
            // Validate input
            const validatedInput = input as { videoUrl: string; language?: string };
            
            // Get environment from context (this should be available in the execution context)
            const env = (context as any).env as import('@/types/environment.types').CloudflareEnvironment;
            if (!env) {
              throw new Error('Environment not available in execution context');
            }

            // Initialize services
            const config = new ConfigurationService(env);
            await config.initialize();
            
            const logger = new LoggerUtil(config.getConfiguration());
            const youtubeService = new YouTubeService(config, logger, env);

            // Extract transcript
            const transcript = await youtubeService.getVideoTranscript(
              validatedInput.videoUrl,
              validatedInput.language || 'en'
            );

            // Format response
            const response = {
              videoId: transcript.videoId,
              title: `Video transcript for ${transcript.videoId}`,
              language: transcript.language,
              isAutoGenerated: transcript.isAutoGenerated,
              transcript: {
                fullText: transcript.fullText,
                segments: transcript.segments,
                wordCount: transcript.wordCount,
                estimatedReadingTime: transcript.estimatedReadingTime
              }
            };

            return {
              content: [{
                type: 'text',
                text: JSON.stringify(response, null, 2),
              }],
              isError: false,
            };

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            return {
              content: [{
                type: 'text',
                text: `Error extracting transcript: ${errorMessage}`,
              }],
              isError: true,
            };
          }
        },
      },
      {
        name: 'getVideoAnalytics',
        description: 'Get analytics and metrics for a YouTube video',
        inputSchema: {
          type: 'object',
          properties: {
            videoId: {
              type: 'string',
              description: 'YouTube video ID (11 characters)',
              pattern: '^[a-zA-Z0-9_-]{11}$',
            },
          },
          required: ['videoId'],
          additionalProperties: false,
        },
        handler: async (input: unknown, context: MCPContext): Promise<MCPToolResponse> => {
          // Placeholder implementation
          return {
            content: [{
              type: 'text',
              text: 'Tool implementation pending - getVideoAnalytics placeholder',
            }],
            isError: false,
          };
        },
      },
      {
        name: 'analyzeChannel',
        description: 'Analyze channel performance and top videos',
        inputSchema: {
          type: 'object',
          properties: {
            channelId: {
              type: 'string',
              description: 'YouTube channel ID',
              pattern: '^UC[a-zA-Z0-9_-]{22}$',
            },
            videoCount: {
              type: 'number',
              description: 'Number of recent videos to analyze',
              minimum: 1,
              maximum: 50,
              default: 10,
            },
          },
          required: ['channelId'],
          additionalProperties: false,
        },
        handler: async (input: unknown, context: MCPContext): Promise<MCPToolResponse> => {
          // Placeholder implementation
          return {
            content: [{
              type: 'text',
              text: 'Tool implementation pending - analyzeChannel placeholder',
            }],
            isError: false,
          };
        },
      },
      {
        name: 'competitiveAnalysis',
        description: 'Compare channels for competitive analysis',
        inputSchema: {
          type: 'object',
          properties: {
            channels: {
              type: 'array',
              items: {
                type: 'string',
                pattern: '^UC[a-zA-Z0-9_-]{22}$',
              },
              description: 'Array of YouTube channel IDs to compare',
              minItems: 2,
              maxItems: 5,
            },
          },
          required: ['channels'],
          additionalProperties: false,
        },
        handler: async (input: unknown, context: MCPContext): Promise<MCPToolResponse> => {
          // Placeholder implementation
          return {
            content: [{
              type: 'text',
              text: 'Tool implementation pending - competitiveAnalysis placeholder',
            }],
            isError: false,
          };
        },
      },
      {
        name: 'searchKeywords',
        description: 'Search for keywords in video content and transcripts',
        inputSchema: {
          type: 'object',
          properties: {
            keywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'Keywords to search for',
              minItems: 1,
            },
            channelId: {
              type: 'string',
              description: 'Channel ID to search within (optional)',
              pattern: '^UC[a-zA-Z0-9_-]{22}$',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
          required: ['keywords'],
          additionalProperties: false,
        },
        handler: async (input: unknown, context: MCPContext): Promise<MCPToolResponse> => {
          // Placeholder implementation
          return {
            content: [{
              type: 'text',
              text: 'Tool implementation pending - searchKeywords placeholder',
            }],
            isError: false,
          };
        },
      },
      {
        name: 'detectTrends',
        description: 'Detect trending topics and keywords',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'YouTube category to analyze',
              enum: ['Gaming', 'Music', 'Technology', 'Entertainment', 'Education', 'News'],
            },
            timeframe: {
              type: 'string',
              description: 'Time period for trend analysis',
              enum: ['24h', '7d', '30d'],
              default: '7d',
            },
            region: {
              type: 'string',
              description: 'Region code for localized trends',
              pattern: '^[A-Z]{2}$',
              default: 'US',
            },
          },
          additionalProperties: false,
        },
        handler: async (input: unknown, context: MCPContext): Promise<MCPToolResponse> => {
          // Placeholder implementation
          return {
            content: [{
              type: 'text',
              text: 'Tool implementation pending - detectTrends placeholder',
            }],
            isError: false,
          };
        },
      },
      {
        name: 'getChannelInsights',
        description: 'Get comprehensive insights for a YouTube channel',
        inputSchema: {
          type: 'object',
          properties: {
            channelId: {
              type: 'string',
              description: 'YouTube channel ID',
              pattern: '^UC[a-zA-Z0-9_-]{22}$',
            },
            includeCompetitors: {
              type: 'boolean',
              description: 'Include competitor analysis',
              default: false,
            },
          },
          required: ['channelId'],
          additionalProperties: false,
        },
        handler: async (input: unknown, context: MCPContext): Promise<MCPToolResponse> => {
          // Placeholder implementation
          return {
            content: [{
              type: 'text',
              text: 'Tool implementation pending - getChannelInsights placeholder',
            }],
            isError: false,
          };
        },
      },
    ];

    // Register all built-in tools
    for (const tool of builtInTools) {
      this.register(tool);
    }
  }
}

/**
 * Custom error classes for tool execution
 */
export class ToolNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolNotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class MCPToolError extends Error {
  public readonly code: MCPErrorCode;
  
  constructor(code: MCPErrorCode, message: string) {
    super(message);
    this.name = 'MCPToolError';
    this.code = code;
  }
}