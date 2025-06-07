/**
 * SSE Integration Service
 * Simplified interface for Server-Sent Events integration with MCP server
 * Provides high-level event broadcasting and subscription management
 */

import type { CloudflareEnvironment } from '../types/environment.types';
import type { 
  SSEEvent,
  SSESubscription,
  SSEConnectionStats,
  SSEClientInfo,
  SSEEventType,
  SSEEventFilter
} from '../types/sse.types';
import type { LoggerUtil } from '../utils/logger.util';
import type { ErrorHandlerUtil } from '../utils/error-handler.util';
import type { AuthenticationService } from './authentication.service';
import { SSETransportService } from './sse-transport.service';
import { EventBusService } from './event-bus.service';

/**
 * Event Broadcasting Options
 */
interface BroadcastOptions {
  targetUsers?: string[];
  includeMetrics?: boolean;
  priority?: 'low' | 'normal' | 'high';
  retryAttempts?: number;
  timeoutMs?: number;
}

/**
 * Tool Event Data
 */
interface ToolEventData {
  toolName: string;
  executionId: string;
  duration?: number;
  status: 'started' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  timestamp: string;
}

/**
 * Performance Event Data
 */
interface PerformanceEventData {
  metric: string;
  value: number;
  threshold?: number;
  status: 'normal' | 'warning' | 'critical';
  timestamp: string;
}

/**
 * System Event Data
 */
interface SystemEventData {
  component: string;
  status: 'starting' | 'ready' | 'degraded' | 'unavailable';
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * SSE Integration Service
 * High-level interface for real-time event streaming
 */
export class SSEIntegrationService {
  private sseTransport!: SSETransportService;
  private eventBus!: EventBusService;
  private isInitialized = false;

  constructor(
    private env: CloudflareEnvironment,
    private logger: LoggerUtil,
    private errorHandler: ErrorHandlerUtil,
    private authService: AuthenticationService
  ) {
    // Services will be initialized lazily
  }

  /**
   * Initialize SSE services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize transport and event bus
      this.sseTransport = new SSETransportService(
        this.env,
        this.logger,
        this.errorHandler,
        this.authService
      );

      this.eventBus = new EventBusService(
        this.env,
        this.logger,
        this.errorHandler
      );

      this.isInitialized = true;

      this.logger.info('SSE Integration Service initialized successfully');

      // Broadcast system ready event
      await this.broadcastSystemEvent('sse-integration', 'ready', {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });

    } catch (error) {
      this.logger.error('Failed to initialize SSE Integration Service', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Handle SSE connection request
   */
  async handleConnection(request: Request): Promise<Response> {
    await this.ensureInitialized();
    return this.sseTransport.handleSSERequest(request);
  }

  /**
   * Broadcast tool execution event
   */
  async broadcastToolEvent(
    eventType: 'tool_started' | 'tool_completed' | 'tool_failed',
    data: ToolEventData,
    options: BroadcastOptions = {}
  ): Promise<void> {
    await this.ensureInitialized();

    const event: SSEEvent<ToolEventData> = {
      id: crypto.randomUUID(),
      type: eventType,
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    await this.sseTransport.broadcastEvent(event, options.targetUsers);

    this.logger.debug('Tool event broadcasted', {
      eventType,
      toolName: data.toolName,
      executionId: data.executionId,
      targetUsers: options.targetUsers?.length || 'all'
    });
  }

  /**
   * Broadcast performance metric event
   */
  async broadcastPerformanceEvent(
    metric: string,
    value: number,
    threshold?: number,
    options: BroadcastOptions = {}
  ): Promise<void> {
    await this.ensureInitialized();

    const status = this.determineMetricStatus(value, threshold);
    
    const data: PerformanceEventData = {
      metric,
      value,
      threshold,
      status,
      timestamp: new Date().toISOString()
    };

    const event: SSEEvent<PerformanceEventData> = {
      id: crypto.randomUUID(),
      type: 'performance_metric',
      data,
      timestamp: new Date().toISOString()
    };

    await this.sseTransport.broadcastEvent(event, options.targetUsers);

    this.logger.debug('Performance event broadcasted', {
      metric,
      value,
      status,
      targetUsers: options.targetUsers?.length || 'all'
    });
  }

  /**
   * Broadcast system status event
   */
  async broadcastSystemEvent(
    component: string,
    status: SystemEventData['status'],
    details?: Record<string, unknown>,
    options: BroadcastOptions = {}
  ): Promise<void> {
    await this.ensureInitialized();

    const data: SystemEventData = {
      component,
      status,
      details,
      timestamp: new Date().toISOString()
    };

    const event: SSEEvent<SystemEventData> = {
      id: crypto.randomUUID(),
      type: 'system_status',
      data,
      timestamp: new Date().toISOString()
    };

    await this.sseTransport.broadcastEvent(event, options.targetUsers);

    this.logger.debug('System event broadcasted', {
      component,
      status,
      targetUsers: options.targetUsers?.length || 'all'
    });
  }

  /**
   * Broadcast custom event
   */
  async broadcastCustomEvent<T extends Record<string, unknown>>(
    eventType: SSEEventType,
    data: T & { timestamp: string },
    options: BroadcastOptions = {}
  ): Promise<void> {
    await this.ensureInitialized();

    const event: SSEEvent<T & { timestamp: string }> = {
      id: crypto.randomUUID(),
      type: eventType,
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    await this.sseTransport.broadcastEvent(event, options.targetUsers);

    this.logger.debug('Custom event broadcasted', {
      eventType,
      targetUsers: options.targetUsers?.length || 'all'
    });
  }

  /**
   * Subscribe connection to events
   */
  async subscribeConnection(
    connectionId: string,
    subscription: SSESubscription
  ): Promise<void> {
    await this.ensureInitialized();
    await this.sseTransport.subscribeToEvents(connectionId, subscription);
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats(): Promise<SSEConnectionStats> {
    await this.ensureInitialized();
    return this.sseTransport.getConnectionStats();
  }

  /**
   * Get client information
   */
  async getClientInfo(): Promise<SSEClientInfo[]> {
    await this.ensureInitialized();
    return this.sseTransport.getClientInfo();
  }

  /**
   * Close specific connection
   */
  async closeConnection(connectionId: string, reason?: string): Promise<void> {
    await this.ensureInitialized();
    await this.sseTransport.closeConnection(connectionId, reason);
  }

  /**
   * Shutdown SSE services
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Broadcast shutdown event
      await this.broadcastSystemEvent('sse-integration', 'unavailable', {
        reason: 'Service shutdown',
        timestamp: new Date().toISOString()
      });

      // Close all connections
      await this.sseTransport.closeAllConnections();

      this.isInitialized = false;

      this.logger.info('SSE Integration Service shutdown completed');

    } catch (error) {
      this.logger.error('Error during SSE service shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Health check for SSE services
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, unknown>;
  }> {
    try {
      if (!this.isInitialized) {
        return {
          status: 'unhealthy',
          details: { error: 'Service not initialized' }
        };
      }

      const stats = await this.getConnectionStats();
      const isHealthy = stats.errorRate < 5; // Less than 5% error rate

      return {
        status: isHealthy ? 'healthy' : 'degraded',
        details: {
          connections: stats.totalConnections,
          activeConnections: stats.activeConnections,
          averageLatency: stats.averageLatency,
          errorRate: stats.errorRate,
          initialized: this.isInitialized
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          initialized: this.isInitialized
        }
      };
    }
  }

  /**
   * Create standardized tool execution subscription
   */
  createToolSubscription(toolNames?: string[]): SSESubscription {
    const filters: SSEEventFilter = {};
    if (toolNames) {
      filters.toolNames = toolNames;
    }

    return {
      eventTypes: ['tool_started', 'tool_completed', 'tool_failed'],
      filters: Object.keys(filters).length > 0 ? filters : undefined
    };
  }

  /**
   * Create performance monitoring subscription
   */
  createPerformanceSubscription(): SSESubscription {
    return {
      eventTypes: ['performance_metric']
    };
  }

  /**
   * Create system monitoring subscription
   */
  createSystemSubscription(): SSESubscription {
    return {
      eventTypes: ['system_status']
    };
  }

  /**
   * Helper: Broadcast tool start event
   */
  async notifyToolStarted(
    toolName: string,
    executionId: string,
    userId?: string
  ): Promise<void> {
    await this.broadcastToolEvent('tool_started', {
      toolName,
      executionId,
      status: 'started',
      timestamp: new Date().toISOString()
    }, {
      targetUsers: userId ? [userId] : undefined
    });
  }

  /**
   * Helper: Broadcast tool completion event
   */
  async notifyToolCompleted(
    toolName: string,
    executionId: string,
    duration: number,
    result?: unknown,
    userId?: string
  ): Promise<void> {
    await this.broadcastToolEvent('tool_completed', {
      toolName,
      executionId,
      duration,
      status: 'completed',
      result,
      timestamp: new Date().toISOString()
    }, {
      targetUsers: userId ? [userId] : undefined
    });
  }

  /**
   * Helper: Broadcast tool failure event
   */
  async notifyToolFailed(
    toolName: string,
    executionId: string,
    duration: number,
    error: string,
    userId?: string
  ): Promise<void> {
    await this.broadcastToolEvent('tool_failed', {
      toolName,
      executionId,
      duration,
      status: 'failed',
      error,
      timestamp: new Date().toISOString()
    }, {
      targetUsers: userId ? [userId] : undefined,
      priority: 'high'
    });
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Determine metric status based on value and threshold
   */
  private determineMetricStatus(
    value: number,
    threshold?: number
  ): PerformanceEventData['status'] {
    if (!threshold) {
      return 'normal';
    }

    if (value > threshold * 2) {
      return 'critical';
    } else if (value > threshold) {
      return 'warning';
    } else {
      return 'normal';
    }
  }
}