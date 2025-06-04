/**
 * Connection Management Service for Remote MCP
 * Handles WebSocket connection lifecycle, monitoring, and cleanup
 */

import type { CloudflareEnvironment } from '../types/cloudflare.types';
import type { ClientConnection, ConnectionMetadata } from '../types/remote-mcp.types';
import type { LoggerUtil } from '../utils/logger.util';
import type { ErrorHandlerUtil } from '../utils/error-handler.util';

export class ConnectionManagementService {
  private connections: Map<string, ClientConnection> = new Map();
  private connectionMetrics: Map<string, ConnectionStats> = new Map();
  private cleanupInterval: number | null = null;

  constructor(
    private env: CloudflareEnvironment,
    private logger: LoggerUtil,
    private errorHandler: ErrorHandlerUtil
  ) {
    // Start cleanup interval for stale connections
    this.startCleanupInterval();
  }

  /**
   * Register a new client connection
   */
  async registerConnection(sessionId: string, connection: ClientConnection): Promise<void> {
    try {
      // Store connection
      this.connections.set(sessionId, connection);

      // Initialize connection metrics
      this.connectionMetrics.set(sessionId, {
        sessionId,
        connectedAt: connection.connectedAt,
        lastActivity: connection.lastPing,
        messagesSent: 0,
        messagesReceived: 0,
        bytesTransferred: 0,
        errors: 0
      });

      // Store in KV for persistence (optional, for analytics)
      await this.env.YOUTUBE_MCP_KV.put(
        `connection:${sessionId}`,
        JSON.stringify({
          sessionId,
          connectedAt: connection.connectedAt.toISOString(),
          metadata: connection.metadata
        }),
        { expirationTtl: 86400 } // 24 hours
      );

      this.logger.info('Connection registered', {
        sessionId,
        totalConnections: this.connections.size,
        metadata: connection.metadata
      });

    } catch (error) {
      this.logger.error('Failed to register connection', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Unregister a client connection
   */
  async unregisterConnection(sessionId: string): Promise<void> {
    try {
      const connection = this.connections.get(sessionId);
      if (!connection) {
        return; // Already unregistered
      }

      // Calculate session duration
      const duration = Date.now() - connection.connectedAt.getTime();

      // Get final metrics
      const metrics = this.connectionMetrics.get(sessionId);

      // Remove from memory
      this.connections.delete(sessionId);
      this.connectionMetrics.delete(sessionId);

      // Clean up from KV
      await this.env.YOUTUBE_MCP_KV.delete(`connection:${sessionId}`);

      this.logger.info('Connection unregistered', {
        sessionId,
        duration,
        totalConnections: this.connections.size,
        finalMetrics: metrics
      });

    } catch (error) {
      this.logger.error('Failed to unregister connection', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get connection by session ID
   */
  getConnection(sessionId: string): ClientConnection | null {
    return this.connections.get(sessionId) || null;
  }

  /**
   * Get all active connections
   */
  getAllConnections(): ClientConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Update connection activity
   */
  updateConnectionActivity(sessionId: string): void {
    const connection = this.connections.get(sessionId);
    const metrics = this.connectionMetrics.get(sessionId);

    if (connection) {
      connection.lastPing = new Date();
    }

    if (metrics) {
      metrics.lastActivity = new Date();
    }
  }

  /**
   * Track message sent from connection
   */
  trackMessageSent(sessionId: string, messageSize: number = 0): void {
    const metrics = this.connectionMetrics.get(sessionId);
    if (metrics) {
      metrics.messagesSent++;
      metrics.bytesTransferred += messageSize;
      metrics.lastActivity = new Date();
    }
  }

  /**
   * Track message received by connection
   */
  trackMessageReceived(sessionId: string, messageSize: number = 0): void {
    const metrics = this.connectionMetrics.get(sessionId);
    if (metrics) {
      metrics.messagesReceived++;
      metrics.bytesTransferred += messageSize;
      metrics.lastActivity = new Date();
    }
  }

  /**
   * Track connection error
   */
  trackConnectionError(sessionId: string, error: Error): void {
    const metrics = this.connectionMetrics.get(sessionId);
    if (metrics) {
      metrics.errors++;
    }

    this.logger.warn('Connection error tracked', {
      sessionId,
      error: error.message,
      totalErrors: metrics?.errors || 0
    });
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalConnections: number;
    activeConnections: number;
    averageConnectionTime: number;
    totalMessages: number;
    totalBytes: number;
    errorRate: number;
  } {
    const now = new Date();
    const metrics = Array.from(this.connectionMetrics.values());
    
    const activeConnections = metrics.filter(m => 
      now.getTime() - m.lastActivity.getTime() < 300000 // 5 minutes
    ).length;

    const totalMessages = metrics.reduce((sum, m) => sum + m.messagesSent + m.messagesReceived, 0);
    const totalBytes = metrics.reduce((sum, m) => sum + m.bytesTransferred, 0);
    const totalErrors = metrics.reduce((sum, m) => sum + m.errors, 0);
    
    const connectionTimes = metrics.map(m => now.getTime() - m.connectedAt.getTime());
    const averageConnectionTime = connectionTimes.length > 0 
      ? connectionTimes.reduce((sum, time) => sum + time, 0) / connectionTimes.length
      : 0;

    const errorRate = totalMessages > 0 ? (totalErrors / totalMessages) * 100 : 0;

    return {
      totalConnections: this.connections.size,
      activeConnections,
      averageConnectionTime: Math.round(averageConnectionTime),
      totalMessages,
      totalBytes,
      errorRate: Math.round(errorRate * 100) / 100
    };
  }

  /**
   * Get connections by criteria
   */
  getConnectionsByCriteria(criteria: {
    platform?: string;
    userAgent?: string;
    minConnectedTime?: number;
    maxIdleTime?: number;
  }): ClientConnection[] {
    const now = new Date();
    
    return this.getAllConnections().filter(connection => {
      // Platform filter
      if (criteria.platform && connection.metadata.platform !== criteria.platform) {
        return false;
      }

      // User agent filter
      if (criteria.userAgent && !connection.metadata.userAgent?.includes(criteria.userAgent)) {
        return false;
      }

      // Minimum connected time
      if (criteria.minConnectedTime) {
        const connectedTime = now.getTime() - connection.connectedAt.getTime();
        if (connectedTime < criteria.minConnectedTime) {
          return false;
        }
      }

      // Maximum idle time
      if (criteria.maxIdleTime) {
        const idleTime = now.getTime() - connection.lastPing.getTime();
        if (idleTime > criteria.maxIdleTime) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Close connections matching criteria
   */
  async closeConnections(criteria: {
    sessionIds?: string[];
    platform?: string;
    maxIdleTime?: number;
    reason?: string;
  }): Promise<number> {
    let closedCount = 0;
    const reason = criteria.reason || 'Server initiated close';

    try {
      let connectionsToClose: ClientConnection[] = [];

      if (criteria.sessionIds) {
        // Close specific connections
        connectionsToClose = criteria.sessionIds
          .map(id => this.connections.get(id))
          .filter(Boolean) as ClientConnection[];
      } else {
        // Close by criteria
        connectionsToClose = this.getConnectionsByCriteria(criteria);
      }

      for (const connection of connectionsToClose) {
        try {
          connection.websocket.close(1000, reason);
          await this.unregisterConnection(connection.sessionId);
          closedCount++;
        } catch (error) {
          this.logger.warn('Failed to close connection', {
            sessionId: connection.sessionId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      this.logger.info('Bulk connection close completed', {
        closedCount,
        totalConnections: this.connections.size,
        criteria
      });

    } catch (error) {
      this.logger.error('Failed to close connections', {
        error: error instanceof Error ? error.message : 'Unknown error',
        criteria
      });
    }

    return closedCount;
  }

  /**
   * Start periodic cleanup of stale connections
   */
  private startCleanupInterval(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 300000) as any;
  }

  /**
   * Clean up stale connections
   */
  private async cleanupStaleConnections(): Promise<void> {
    const maxIdleTime = 600000; // 10 minutes
    const staleConnections = this.getConnectionsByCriteria({ maxIdleTime });

    if (staleConnections.length > 0) {
      this.logger.info('Cleaning up stale connections', {
        staleCount: staleConnections.length,
        maxIdleTime
      });

      await this.closeConnections({
        sessionIds: staleConnections.map(c => c.sessionId),
        reason: 'Connection idle timeout'
      });
    }
  }

  /**
   * Stop cleanup interval
   */
  private stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup(): Promise<void> {
    this.logger.info('Connection management cleanup started');

    // Stop cleanup interval
    this.stopCleanupInterval();

    // Close all connections
    await this.closeConnections({
      sessionIds: Array.from(this.connections.keys()),
      reason: 'Server shutting down'
    });

    // Clear all data
    this.connections.clear();
    this.connectionMetrics.clear();

    this.logger.info('Connection management cleanup completed');
  }
}

/**
 * Connection statistics interface
 */
interface ConnectionStats {
  sessionId: string;
  connectedAt: Date;
  lastActivity: Date;
  messagesSent: number;
  messagesReceived: number;
  bytesTransferred: number;
  errors: number;
}