/**
 * Remote MCP Type Definitions
 * Enhanced types for multi-client Remote MCP server functionality
 */

import type { MCPTool, MCPToolResponse, MCPContext } from './mcp.types';
import type { CloudflareWebSocket } from './cloudflare.types';

/**
 * User session for authenticated remote MCP connections
 */
export interface UserSession {
  id: string;
  apiKey: string;
  quotaUsed: number;
  quotaLimit: number;
  createdAt: string;
  lastActivity: string;
  permissions: UserPermissions;
}

/**
 * User permissions for different MCP operations
 */
export interface UserPermissions {
  canUseTools: string[]; // Tool names user can access
  canAccessSharedCache: boolean;
  canReceiveNotifications: boolean;
  quotaMultiplier: number; // 1.0 = standard quota
}

/**
 * Active client connection state
 */
export interface ClientConnection {
  sessionId: string;
  websocket: CloudflareWebSocket;
  connectedAt: Date;
  lastPing: Date;
  subscriptions: Set<string>; // Tool names for notifications
  metadata: ConnectionMetadata;
}

/**
 * Connection metadata for monitoring and analytics
 */
export interface ConnectionMetadata {
  userAgent?: string;
  ipAddress?: string;
  clientVersion?: string;
  platform?: string;
}

/**
 * Enhanced MCP tool with remote capabilities
 */
export interface RemoteMCPTool extends MCPTool {
  capabilities: ToolCapabilities;
  quotaCost: number;
  averageResponseTime: number;
  userPermissionRequired?: string;
}

/**
 * Tool capabilities for remote operation
 */
export interface ToolCapabilities {
  streaming: boolean;
  caching: boolean;
  realtime: boolean;
  multiUser: boolean;
  requiresAuth: boolean;
}

/**
 * MCP event for real-time notifications
 */
export interface MCPEvent {
  type: 'notification' | 'update' | 'error' | 'quota_warning';
  data: MCPEventData;
}

/**
 * MCP event data with optional tool context
 */
export interface MCPEventData {
  type: string;
  payload: any;
  timestamp: string;
  targetUsers?: string[]; // If undefined, broadcast to all
  toolName?: string; // Tool that triggered the event
}

/**
 * User quota information and tracking
 */
export interface QuotaInfo {
  used: number;
  limit: number;
  resetAt: string;
  lastUpdated?: string;
  warningThreshold: number; // Percentage (e.g., 80 for 80%)
}

/**
 * WebSocket message types for Remote MCP
 */
export interface WebSocketMessage {
  id: string;
  type: 'request' | 'response' | 'notification' | 'ping' | 'pong';
  method?: string;
  params?: any;
  result?: any;
  error?: any;
  timestamp: string;
}

/**
 * Authentication request for WebSocket connections
 */
export interface AuthRequest {
  apiKey: string;
  clientInfo: {
    name: string;
    version: string;
    platform: string;
  };
}

/**
 * Authentication response
 */
export interface AuthResponse {
  success: boolean;
  session?: UserSession;
  error?: string;
  serverInfo: {
    version: string;
    capabilities: string[];
    quotaLimits: QuotaInfo;
  };
}

/**
 * Remote MCP context with user session
 */
export interface RemoteMCPContext extends MCPContext {
  userId: string;
  session: UserSession;
  connection: ClientConnection;
  quotaInfo: QuotaInfo;
}

/**
 * Server health status
 */
export interface ServerHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  metrics: {
    activeConnections: number;
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    quotaUsage: number;
  };
  services: {
    youtube: 'online' | 'offline' | 'degraded';
    cache: 'online' | 'offline' | 'degraded';
    database: 'online' | 'offline' | 'degraded';
  };
}

/**
 * Cache key structure for multi-user caching
 */
export interface CacheKey {
  type: 'shared' | 'user' | 'session';
  userId?: string;
  sessionId?: string;
  tool: string;
  params: string; // Hashed parameters
}

/**
 * Notification subscription
 */
export interface NotificationSubscription {
  userId: string;
  toolName: string;
  filters?: {
    keywords?: string[];
    categories?: string[];
    minImportance?: number;
  };
  createdAt: string;
}

/**
 * Load balancer server instance
 */
export interface MCPServerInstance {
  id: string;
  url: string;
  health: ServerHealth;
  load: number; // 0-100 percentage
  region: string;
  lastHealthCheck: string;
}

/**
 * Request distribution result
 */
export interface DistributionResult {
  instance: MCPServerInstance;
  latency: number;
  cached: boolean;
}

/**
 * Analytics event for tracking
 */
export interface AnalyticsEvent {
  eventType: 'tool_executed' | 'user_connected' | 'quota_exceeded' | 'error_occurred';
  userId?: string;
  toolName?: string;
  metadata: Record<string, any>;
  timestamp: string;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  keyGenerator: (context: RemoteMCPContext) => string;
}

/**
 * Rate limit status
 */
export interface RateLimitStatus {
  remaining: number;
  resetTime: string;
  limit: number;
  used: number;
}