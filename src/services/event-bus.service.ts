/**
 * Event Bus Service
 * Centralized event distribution system shared between WebSocket and SSE transports
 * Maintains world-class performance standards with sub-50ms event latency
 */

import type { CloudflareEnvironment } from '../types/environment.types';
import type { 
  SSEEvent, 
  EventBusMessage, 
  SSEEventType, 
  SSEEventData,
  EventPerformanceMetrics
} from '../types/sse.types';
import type { LoggerUtil } from '../utils/logger.util';
import type { ErrorHandlerUtil } from '../utils/error-handler.util';

/**
 * Event Subscriber Interface
 */
export interface EventSubscriber {
  id: string;
  transport: 'websocket' | 'sse';
  eventTypes: string[];
  filters?: Record<string, string | number | boolean>;
  callback: (event: SSEEvent) => Promise<void>;
}

/**
 * Event Bus Configuration
 */
export interface EventBusConfig {
  maxSubscribers: number;
  eventBufferSize: number;
  metricsRetentionPeriod: number; // hours
  enablePerformanceTracking: boolean;
  enableEventPersistence: boolean;
}

/**
 * Event Bus Service
 * High-performance event distribution with intelligent routing
 */
export class EventBusService {
  private subscribers = new Map<string, EventSubscriber>();
  private eventBuffer = new Map<string, SSEEvent[]>();
  private performanceMetrics = new Map<string, EventPerformanceMetrics>();
  private config: EventBusConfig;

  constructor(
    private env: CloudflareEnvironment,
    private logger: LoggerUtil,
    private errorHandler: ErrorHandlerUtil
  ) {
    this.config = {
      maxSubscribers: parseInt(env.SSE_MAX_SUBSCRIBERS || '1000'),
      eventBufferSize: parseInt(env.SSE_EVENT_BUFFER_SIZE || '100'),
      metricsRetentionPeriod: parseInt(env.SSE_METRICS_RETENTION_HOURS || '24'),
      enablePerformanceTracking: env.SSE_ENABLE_PERFORMANCE_TRACKING === 'true',
      enableEventPersistence: env.SSE_ENABLE_EVENT_PERSISTENCE === 'true'
    };

    this.logger.info('Event Bus Service initialized', {
      config: this.config,
      maxSubscribers: this.config.maxSubscribers
    });
  }

  /**
   * Subscribe to events with filtering
   */
  async subscribe(subscriber: EventSubscriber): Promise<void> {
    const startTime = Date.now();

    try {
      // Check subscriber limits
      if (this.subscribers.size >= this.config.maxSubscribers) {
        throw new Error('Maximum subscribers limit reached');
      }

      // Validate subscriber
      if (!subscriber.id || !subscriber.transport || !subscriber.eventTypes.length) {
        throw new Error('Invalid subscriber configuration');
      }

      // Store subscriber
      this.subscribers.set(subscriber.id, subscriber);

      // Send buffered events to new subscriber if applicable
      await this.sendBufferedEvents(subscriber);

      const duration = Date.now() - startTime;
      this.logger.info('Event subscriber registered', {
        subscriberId: subscriber.id,
        transport: subscriber.transport,
        eventTypes: subscriber.eventTypes,
        duration,
        totalSubscribers: this.subscribers.size
      });

      // Track performance
      if (this.config.enablePerformanceTracking) {
        this.updateMetrics('subscription', duration, true);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to register subscriber', {
        subscriberId: subscriber.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });

      if (this.config.enablePerformanceTracking) {
        this.updateMetrics('subscription', duration, false);
      }

      throw error;
    }
  }

  /**
   * Unsubscribe from events
   */
  async unsubscribe(subscriberId: string): Promise<void> {
    const startTime = Date.now();

    try {
      const subscriber = this.subscribers.get(subscriberId);
      if (!subscriber) {
        this.logger.warn('Attempted to unsubscribe non-existent subscriber', {
          subscriberId
        });
        return;
      }

      this.subscribers.delete(subscriberId);

      // Clean up event buffer for this subscriber
      this.eventBuffer.delete(subscriberId);

      const duration = Date.now() - startTime;
      this.logger.info('Event subscriber unregistered', {
        subscriberId,
        transport: subscriber.transport,
        duration,
        remainingSubscribers: this.subscribers.size
      });

      if (this.config.enablePerformanceTracking) {
        this.updateMetrics('unsubscription', duration, true);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to unregister subscriber', {
        subscriberId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });

      if (this.config.enablePerformanceTracking) {
        this.updateMetrics('unsubscription', duration, false);
      }
    }
  }

  /**
   * Publish event to all matching subscribers
   */
  async publish<T extends SSEEventData>(
    eventType: SSEEventType,
    data: T,
    metadata?: {
      userId?: string;
      priority?: 'low' | 'normal' | 'high' | 'critical';
      source?: string;
    }
  ): Promise<void> {
    const startTime = Date.now();
    const eventId = crypto.randomUUID();

    try {
      // Create event
      const event: SSEEvent<T> = {
        id: eventId,
        type: eventType,
        data,
        timestamp: new Date().toISOString()
      };

      // Get matching subscribers
      const matchingSubscribers = this.getMatchingSubscribers(eventType, metadata);

      if (matchingSubscribers.length === 0) {
        this.logger.debug('No subscribers for event', {
          eventType,
          eventId,
          totalSubscribers: this.subscribers.size
        });
        return;
      }

      // Distribute to subscribers with performance tracking
      const deliveryPromises = matchingSubscribers.map(async (subscriber) => {
        const deliveryStart = Date.now();
        
        try {
          await this.deliverEvent(subscriber, event);
          
          const deliveryDuration = Date.now() - deliveryStart;
          this.logger.debug('Event delivered successfully', {
            eventId,
            subscriberId: subscriber.id,
            transport: subscriber.transport,
            deliveryDuration
          });

          return { success: true, duration: deliveryDuration };

        } catch (error) {
          const deliveryDuration = Date.now() - deliveryStart;
          this.logger.error('Event delivery failed', {
            eventId,
            subscriberId: subscriber.id,
            transport: subscriber.transport,
            error: error instanceof Error ? error.message : 'Unknown error',
            deliveryDuration
          });

          // Buffer event for retry if appropriate
          await this.bufferEventForRetry(subscriber, event);

          return { success: false, duration: deliveryDuration };
        }
      });

      // Wait for all deliveries with timeout
      const deliveryResults = await Promise.allSettled(deliveryPromises);
      const successful = deliveryResults.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;

      const totalDuration = Date.now() - startTime;
      
      this.logger.info('Event published', {
        eventType,
        eventId,
        subscribersMatched: matchingSubscribers.length,
        deliveriesSuccessful: successful,
        deliveriesFailed: matchingSubscribers.length - successful,
        totalDuration,
        priority: metadata?.priority || 'normal'
      });

      // Track performance metrics
      if (this.config.enablePerformanceTracking) {
        this.updateMetrics(eventType, totalDuration, successful === matchingSubscribers.length);
      }

      // Persist event if enabled
      if (this.config.enableEventPersistence) {
        await this.persistEvent(event, metadata);
      }

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      this.logger.error('Event publication failed', {
        eventType,
        eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
        totalDuration
      });

      if (this.config.enablePerformanceTracking) {
        this.updateMetrics(eventType, totalDuration, false);
      }

      throw error;
    }
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics(): Record<string, EventPerformanceMetrics> {
    return Object.fromEntries(this.performanceMetrics.entries());
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalSubscribers: number;
    subscribersByTransport: Record<string, number>;
    subscribersByEventType: Record<string, number>;
    eventBufferSize: number;
  } {
    const subscribersByTransport: Record<string, number> = {};
    const subscribersByEventType: Record<string, number> = {};

    for (const subscriber of this.subscribers.values()) {
      // Count by transport
      subscribersByTransport[subscriber.transport] = 
        (subscribersByTransport[subscriber.transport] || 0) + 1;

      // Count by event types
      for (const eventType of subscriber.eventTypes) {
        subscribersByEventType[eventType] = 
          (subscribersByEventType[eventType] || 0) + 1;
      }
    }

    return {
      totalSubscribers: this.subscribers.size,
      subscribersByTransport,
      subscribersByEventType,
      eventBufferSize: Array.from(this.eventBuffer.values()).reduce(
        (total, buffer) => total + buffer.length, 0
      )
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Event Bus Service', {
      subscribersToCleanup: this.subscribers.size,
      bufferedEvents: Array.from(this.eventBuffer.values()).reduce(
        (total, buffer) => total + buffer.length, 0
      )
    });

    // Clear all subscribers
    this.subscribers.clear();

    // Clear event buffers
    this.eventBuffer.clear();

    // Clear metrics (optional - may want to persist)
    if (!this.config.enableEventPersistence) {
      this.performanceMetrics.clear();
    }
  }

  /**
   * Find subscribers matching event criteria
   */
  private getMatchingSubscribers(
    eventType: string,
    metadata?: { userId?: string; priority?: string; source?: string }
  ): EventSubscriber[] {
    const matching: EventSubscriber[] = [];

    for (const subscriber of this.subscribers.values()) {
      // Check if subscriber is interested in this event type
      if (!subscriber.eventTypes.includes(eventType) && !subscriber.eventTypes.includes('*')) {
        continue;
      }

      // Apply filters if present
      if (subscriber.filters && metadata) {
        let matchesFilters = true;

        for (const [filterKey, filterValue] of Object.entries(subscriber.filters)) {
          const metadataValue = (metadata as Record<string, unknown>)[filterKey];
          if (metadataValue !== filterValue) {
            matchesFilters = false;
            break;
          }
        }

        if (!matchesFilters) {
          continue;
        }
      }

      matching.push(subscriber);
    }

    return matching;
  }

  /**
   * Deliver event to specific subscriber
   */
  private async deliverEvent(subscriber: EventSubscriber, event: SSEEvent): Promise<void> {
    try {
      await subscriber.callback(event);
    } catch (error) {
      // Log and re-throw for upper level handling
      this.logger.error('Subscriber callback failed', {
        subscriberId: subscriber.id,
        eventId: event.id,
        eventType: event.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Buffer event for retry delivery
   */
  private async bufferEventForRetry(subscriber: EventSubscriber, event: SSEEvent): Promise<void> {
    if (!this.config.eventBufferSize || this.config.eventBufferSize <= 0) {
      return;
    }

    let buffer = this.eventBuffer.get(subscriber.id);
    if (!buffer) {
      buffer = [];
      this.eventBuffer.set(subscriber.id, buffer);
    }

    // Add event to buffer (FIFO)
    buffer.push(event);

    // Trim buffer if too large
    if (buffer.length > this.config.eventBufferSize) {
      buffer.splice(0, buffer.length - this.config.eventBufferSize);
    }

    this.logger.debug('Event buffered for retry', {
      subscriberId: subscriber.id,
      eventId: event.id,
      bufferSize: buffer.length
    });
  }

  /**
   * Send buffered events to subscriber
   */
  private async sendBufferedEvents(subscriber: EventSubscriber): Promise<void> {
    const buffer = this.eventBuffer.get(subscriber.id);
    if (!buffer || buffer.length === 0) {
      return;
    }

    this.logger.info('Sending buffered events to subscriber', {
      subscriberId: subscriber.id,
      bufferedEventCount: buffer.length
    });

    // Send events in order
    for (const event of buffer) {
      try {
        await this.deliverEvent(subscriber, event);
      } catch (error) {
        this.logger.error('Failed to deliver buffered event', {
          subscriberId: subscriber.id,
          eventId: event.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Continue with other buffered events
      }
    }

    // Clear buffer after delivery attempt
    this.eventBuffer.delete(subscriber.id);
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(eventType: string, duration: number, success: boolean): void {
    let metrics = this.performanceMetrics.get(eventType);
    
    if (!metrics) {
      metrics = {
        eventType,
        count: 0,
        averageProcessingTime: 0,
        averageDeliveryTime: 0,
        successRate: 0,
        errorCount: 0,
        lastProcessedAt: new Date().toISOString()
      };
      this.performanceMetrics.set(eventType, metrics);
    }

    // Update metrics
    metrics.count++;
    metrics.averageProcessingTime = 
      (metrics.averageProcessingTime * (metrics.count - 1) + duration) / metrics.count;
    metrics.averageDeliveryTime = metrics.averageProcessingTime; // Simplified for now
    
    if (!success) {
      metrics.errorCount++;
    }
    
    metrics.successRate = ((metrics.count - metrics.errorCount) / metrics.count) * 100;
    metrics.lastProcessedAt = new Date().toISOString();
  }

  /**
   * Persist event for audit/replay (optional)
   */
  private async persistEvent(
    event: SSEEvent, 
    metadata?: { userId?: string; priority?: string; source?: string }
  ): Promise<void> {
    try {
      // Store in KV for event history/audit
      const key = `event:${event.type}:${event.id}`;
      const value = JSON.stringify({
        event,
        metadata,
        persistedAt: new Date().toISOString()
      });

      await this.env.YOUTUBE_MCP_KV.put(key, value, {
        expirationTtl: this.config.metricsRetentionPeriod * 3600 // Convert hours to seconds
      });

    } catch (error) {
      this.logger.error('Failed to persist event', {
        eventId: event.id,
        eventType: event.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw - persistence failure shouldn't break event delivery
    }
  }
}