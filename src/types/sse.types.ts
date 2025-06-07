/**
 * Server-Sent Events Type Definitions
 * Comprehensive type system for real-time event streaming
 */

/**
 * Core SSE Event Structure
 */
export interface SSEEvent<T = unknown> {
  id: string;
  type: string;
  data: T;
  retry?: number;
  timestamp: string;
}

/**
 * SSE Connection State
 */
export interface SSEConnectionState {
  connectionId: string;
  userId: string;
  connectedAt: string;
  lastPing: string;
  subscriptions: SSESubscription[];
  authenticated: boolean;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * SSE Subscription Configuration
 */
export interface SSESubscription {
  eventTypes: string[];
  filters?: SSEEventFilter;
  userId?: string;
}

/**
 * Event Filtering Options
 */
export interface SSEEventFilter {
  toolNames?: string[];
  severity?: ('info' | 'warning' | 'error')[];
  userId?: string;
  videoId?: string;
  channelId?: string;
}

/**
 * Tool Execution Events
 */
export interface ToolExecutionEventData {
  toolName: string;
  executionId: string;
  phase: 'started' | 'progress' | 'completed' | 'error';
  progress?: number; // 0-100
  result?: Record<string, unknown>;
  error?: string;
  userId: string;
  duration?: number;
}

export type ToolExecutionEvent = SSEEvent<ToolExecutionEventData>;

/**
 * YouTube API Quota Events
 */
export interface QuotaWarningEventData {
  currentUsage: number;
  limit: number;
  percentageUsed: number;
  resetTime: string;
  warningLevel: 'info' | 'warning' | 'critical';
  quotaType: 'daily' | 'per_user' | 'rate_limit';
}

export type QuotaWarningEvent = SSEEvent<QuotaWarningEventData>;

/**
 * Analytics Update Events
 */
export interface AnalyticsUpdateEventData {
  videoId?: string;
  channelId?: string;
  metricType: 'views' | 'subscribers' | 'engagement' | 'trend_score' | 'performance';
  currentValue: number;
  previousValue: number;
  changePercentage: number;
  timeframe: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

export type AnalyticsUpdateEvent = SSEEvent<AnalyticsUpdateEventData>;

/**
 * Trend Detection Events
 */
export interface TrendDetectionEventData {
  trendType: 'keyword' | 'topic' | 'channel' | 'video_category' | 'hashtag';
  trendValue: string;
  confidence: number; // 0-1
  velocity: 'rising' | 'declining' | 'stable' | 'viral';
  impactScore: number; // 1-100
  relatedItems: string[];
  region?: string;
  language?: string;
}

export type TrendDetectionEvent = SSEEvent<TrendDetectionEventData>;

/**
 * System Health Events
 */
export interface SystemHealthEventData {
  component: 'api' | 'cache' | 'database' | 'websocket' | 'sse' | 'tools';
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  errorRate?: number;
  activeConnections?: number;
  details?: string;
}

export type SystemHealthEvent = SSEEvent<SystemHealthEventData>;

/**
 * Competition Analysis Events
 */
export interface CompetitionEventData {
  analysisType: 'performance_comparison' | 'trending_content' | 'audience_overlap' | 'keyword_gap';
  targetChannel: string;
  competitorChannels: string[];
  insights: Record<string, unknown>;
  recommendations: string[];
  confidenceScore: number;
}

export type CompetitionEvent = SSEEvent<CompetitionEventData>;

/**
 * Union type for all possible event data
 */
export type SSEEventData = 
  | ToolExecutionEventData
  | QuotaWarningEventData
  | AnalyticsUpdateEventData
  | TrendDetectionEventData
  | SystemHealthEventData
  | CompetitionEventData;

/**
 * Event Type Registry
 */
export const SSE_EVENT_TYPES = {
  // Tool execution events
  TOOL_EXECUTION: 'tool_execution',
  
  // API and quota events
  QUOTA_WARNING: 'quota_warning',
  RATE_LIMIT: 'rate_limit',
  
  // Analytics and insights
  ANALYTICS_UPDATE: 'analytics_update',
  TREND_DETECTION: 'trend_detection',
  COMPETITION_ANALYSIS: 'competition_analysis',
  
  // System health
  SYSTEM_HEALTH: 'system_health',
  CONNECTION_STATUS: 'connection_status',
  
  // User events
  USER_CONNECTED: 'user_connected',
  USER_DISCONNECTED: 'user_disconnected',
  
  // Heartbeat
  HEARTBEAT: 'heartbeat'
} as const;

export type SSEEventType = typeof SSE_EVENT_TYPES[keyof typeof SSE_EVENT_TYPES];

/**
 * SSE Transport Configuration
 */
export interface SSETransportConfig {
  heartbeatInterval: number; // milliseconds
  connectionTimeout: number; // milliseconds
  maxConnections: number;
  maxConnectionsPerUser: number;
  eventBufferSize: number;
  compressionEnabled: boolean;
  corsOrigins: string[];
}

/**
 * SSE Connection Statistics
 */
export interface SSEConnectionStats {
  totalConnections: number;
  activeConnections: number;
  connectionsPerSecond: number;
  eventsPerSecond: number;
  averageLatency: number;
  errorRate: number;
}

/**
 * Event Bus Message
 */
export interface EventBusMessage<T = unknown> {
  eventType: string;
  data: T;
  metadata: {
    source: string;
    timestamp: string;
    userId?: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
  };
}

/**
 * Event Router Configuration
 */
export interface EventRouterConfig {
  enableWebSocket: boolean;
  enableSSE: boolean;
  defaultTransport: 'websocket' | 'sse';
  fallbackTransport: 'websocket' | 'sse' | 'none';
  loadBalancing: 'round_robin' | 'least_connections' | 'sticky';
}

/**
 * SSE Authentication Context
 */
export interface SSEAuthContext {
  userId: string;
  apiKey?: string;
  tokenHash?: string;
  permissions: string[];
  quotaLimit: number;
  quotaUsed: number;
  rateLimit: {
    requestsPerMinute: number;
    requestsRemaining: number;
    resetTime: string;
  };
}

/**
 * SSE Error Response
 */
export interface SSEErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
  connectionId: string;
}

/**
 * Event Formatting Options
 */
export interface EventFormatOptions {
  includeId: boolean;
  includeRetry: boolean;
  compression: 'none' | 'gzip';
  maxDataSize: number;
  encoding: 'utf8' | 'base64';
}

/**
 * SSE Client Information
 */
export interface SSEClientInfo {
  connectionId: string;
  userId: string;
  userAgent: string;
  ipAddress: string;
  connectedAt: string;
  subscriptions: SSESubscription[];
  metrics: {
    eventsReceived: number;
    lastEventAt: string;
    connectionLatency: number;
  };
}

/**
 * Event Performance Metrics
 */
export interface EventPerformanceMetrics {
  eventType: string;
  count: number;
  averageProcessingTime: number;
  averageDeliveryTime: number;
  successRate: number;
  errorCount: number;
  lastProcessedAt: string;
}