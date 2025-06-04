/**
 * WebSocket Transport Service for Remote MCP
 * Handles WebSocket connections, message routing, and real-time communication
 */

import type { CloudflareEnvironment, CloudflareWebSocket, WebSocketPair } from '../types/cloudflare.types';
import type { 
  WebSocketMessage, 
  ClientConnection, 
  UserSession, 
  MCPEvent,
  AuthRequest,
  AuthResponse,
  RemoteMCPTool
} from '../types/remote-mcp.types';
import type { LoggerUtil } from '../utils/logger.util';
import type { ErrorHandlerUtil } from '../utils/error-handler.util';

// Forward declare service types to avoid circular dependencies
interface AuthenticationService {
  validateApiKey(apiKey: string): Promise<UserSession | null>;
  getUserQuotaUsage(userId: string): Promise<{ used: number; limit: number; resetAt: string; warningThreshold: number; }>;
}

interface ConnectionManagementService {
  registerConnection(sessionId: string, connection: ClientConnection): Promise<void>;
  unregisterConnection(sessionId: string): Promise<void>;
}

export class WebSocketTransportService {
  private connections: Map<string, ClientConnection> = new Map();
  private messageHandlers: Map<string, (message: WebSocketMessage, connection: ClientConnection) => Promise<void>> = new Map();

  constructor(
    private env: CloudflareEnvironment,
    private logger: LoggerUtil,
    private errorHandler: ErrorHandlerUtil,
    private authService: AuthenticationService,
    private connectionManager: ConnectionManagementService
  ) {
    this.setupMessageHandlers();
  }

  /**
   * Handle WebSocket upgrade request
   */
  async handleUpgrade(request: Request): Promise<Response> {
    try {
      // Validate WebSocket upgrade headers
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426 });
      }

      // Create WebSocket pair
      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      // Accept the WebSocket connection
      await this.acceptWebSocket(server, request);

      // Return the client WebSocket to the browser
      return new Response(null, {
        status: 101,
        webSocket: client
      } as any); // Type assertion for Cloudflare Workers

    } catch (error) {
      this.logger.error('WebSocket upgrade failed', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return this.errorHandler.createErrorResponse(500, 'WebSocket upgrade failed', 'ws-upgrade');
    }
  }

  /**
   * Accept and configure WebSocket connection
   */
  private async acceptWebSocket(websocket: CloudflareWebSocket, request: Request): Promise<void> {
    // Extract connection metadata
    const metadata = {
      userAgent: request.headers.get('User-Agent') || undefined,
      ipAddress: request.headers.get('CF-Connecting-IP') || undefined,
      clientVersion: request.headers.get('X-Client-Version') || undefined,
      platform: request.headers.get('X-Client-Platform') || undefined,
    };

    // Create temporary connection (auth required)
    const tempConnection: Partial<ClientConnection> = {
      websocket,
      connectedAt: new Date(),
      lastPing: new Date(),
      subscriptions: new Set(),
      metadata,
    };

    // Set up event listeners
    websocket.addEventListener('message', async (event: MessageEvent) => {
      await this.handleMessage(event, tempConnection as ClientConnection);
    });

    websocket.addEventListener('close', async (event: CloseEvent) => {
      await this.handleDisconnection(tempConnection as ClientConnection, event.code, event.reason);
    });

    websocket.addEventListener('error', async (event: Event) => {
      this.logger.error('WebSocket error', { 
        sessionId: tempConnection.sessionId, 
        error: 'WebSocket connection error'
      });
    });

    // Send initial handshake
    await this.sendHandshake(websocket);

    this.logger.info('WebSocket connection accepted', { metadata });
  }

  /**
   * Send initial handshake message
   */
  private async sendHandshake(websocket: CloudflareWebSocket): Promise<void> {
    const handshake: WebSocketMessage = {
      id: crypto.randomUUID(),
      type: 'notification',
      method: 'handshake',
      params: {
        serverVersion: '1.0.0',
        protocolVersion: '2024-11-05',
        capabilities: ['tools', 'resources', 'notifications', 'streaming'],
        authRequired: true,
      },
      timestamp: new Date().toISOString(),
    };

    websocket.send(JSON.stringify(handshake));
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(event: MessageEvent, connection: ClientConnection): Promise<void> {
    try {
      const data = JSON.parse(event.data as string) as WebSocketMessage;
      
      // Update last activity
      connection.lastPing = new Date();

      // Route message to appropriate handler
      const handler = this.messageHandlers.get(data.method || data.type);
      if (handler) {
        await handler(data, connection);
      } else {
        await this.handleUnknownMessage(data, connection);
      }

    } catch (error) {
      this.logger.error('Failed to handle WebSocket message', {
        sessionId: connection.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await this.sendError(connection.websocket, 'invalid_message', 'Failed to parse message', '');
    }
  }

  /**
   * Setup message handlers for different message types
   */
  private setupMessageHandlers(): void {
    this.messageHandlers.set('authenticate', this.handleAuthentication.bind(this));
    this.messageHandlers.set('ping', this.handlePing.bind(this));
    this.messageHandlers.set('pong', this.handlePong.bind(this));
    this.messageHandlers.set('tools/list', this.handleToolsList.bind(this));
    this.messageHandlers.set('tools/call', this.handleToolCall.bind(this));
    this.messageHandlers.set('subscribe', this.handleSubscribe.bind(this));
    this.messageHandlers.set('unsubscribe', this.handleUnsubscribe.bind(this));
  }

  /**
   * Handle authentication request
   */
  private async handleAuthentication(message: WebSocketMessage, connection: ClientConnection): Promise<void> {
    try {
      const authRequest = message.params as AuthRequest;
      
      // Validate API key
      const session = await this.authService.validateApiKey(authRequest.apiKey);
      if (!session) {
        await this.sendAuthResponse(connection.websocket, {
          success: false,
          error: 'Invalid API key',
          serverInfo: {
            version: '1.0.0',
            capabilities: [],
            quotaLimits: { used: 0, limit: 0, resetAt: '', warningThreshold: 80 }
          }
        }, message.id);
        return;
      }

      // Update connection with session info
      connection.sessionId = session.id;
      
      // Register authenticated connection
      await this.connectionManager.registerConnection(session.id, connection);
      this.connections.set(session.id, connection);

      // Send successful auth response
      const quotaInfo = await this.authService.getUserQuotaUsage(session.id);
      await this.sendAuthResponse(connection.websocket, {
        success: true,
        session,
        serverInfo: {
          version: '1.0.0',
          capabilities: ['tools', 'resources', 'notifications', 'streaming'],
          quotaLimits: quotaInfo
        }
      }, message.id);

      this.logger.info('Client authenticated successfully', {
        sessionId: session.id,
        clientInfo: authRequest.clientInfo
      });

    } catch (error) {
      this.logger.error('Authentication failed', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      await this.sendError(connection.websocket, 'auth_failed', 'Authentication failed', message.id);
    }
  }

  /**
   * Handle ping messages for keepalive
   */
  private async handlePing(message: WebSocketMessage, connection: ClientConnection): Promise<void> {
    const pong: WebSocketMessage = {
      id: crypto.randomUUID(),
      type: 'pong',
      timestamp: new Date().toISOString(),
    };

    connection.websocket.send(JSON.stringify(pong));
  }

  /**
   * Handle pong responses
   */
  private async handlePong(message: WebSocketMessage, connection: ClientConnection): Promise<void> {
    // Update last ping time for connection health tracking
    connection.lastPing = new Date();
  }

  /**
   * Handle tools list request
   */
  private async handleToolsList(message: WebSocketMessage, connection: ClientConnection): Promise<void> {
    try {
      if (!connection.sessionId) {
        await this.sendError(connection.websocket, 'not_authenticated', 'Authentication required', message.id);
        return;
      }

      // Get tools from registry (would be injected)
      const tools: RemoteMCPTool[] = []; // TODO: Get from tool registry
      
      const response: WebSocketMessage = {
        id: message.id,
        type: 'response',
        result: { tools },
        timestamp: new Date().toISOString(),
      };

      connection.websocket.send(JSON.stringify(response));

    } catch (error) {
      await this.sendError(
        connection.websocket, 
        'tools_list_failed', 
        error instanceof Error ? error.message : 'Unknown error', 
        message.id
      );
    }
  }

  /**
   * Handle tool execution request
   */
  private async handleToolCall(message: WebSocketMessage, connection: ClientConnection): Promise<void> {
    try {
      if (!connection.sessionId) {
        await this.sendError(connection.websocket, 'not_authenticated', 'Authentication required', message.id);
        return;
      }

      // TODO: Execute tool via tool registry
      const result = { message: 'Tool execution not yet implemented' };
      
      const response: WebSocketMessage = {
        id: message.id,
        type: 'response',
        result,
        timestamp: new Date().toISOString(),
      };

      connection.websocket.send(JSON.stringify(response));

    } catch (error) {
      await this.sendError(
        connection.websocket, 
        'tool_call_failed', 
        error instanceof Error ? error.message : 'Unknown error', 
        message.id
      );
    }
  }

  /**
   * Handle subscription to notifications
   */
  private async handleSubscribe(message: WebSocketMessage, connection: ClientConnection): Promise<void> {
    try {
      const { toolName } = message.params as { toolName: string };
      
      if (!connection.sessionId) {
        await this.sendError(connection.websocket, 'not_authenticated', 'Authentication required', message.id);
        return;
      }

      connection.subscriptions.add(toolName);
      
      const response: WebSocketMessage = {
        id: message.id,
        type: 'response',
        result: { subscribed: toolName },
        timestamp: new Date().toISOString(),
      };

      connection.websocket.send(JSON.stringify(response));

      this.logger.info('Client subscribed to notifications', {
        sessionId: connection.sessionId,
        toolName
      });

    } catch (error) {
      await this.sendError(
        connection.websocket, 
        'subscribe_failed', 
        error instanceof Error ? error.message : 'Unknown error', 
        message.id
      );
    }
  }

  /**
   * Handle unsubscription from notifications
   */
  private async handleUnsubscribe(message: WebSocketMessage, connection: ClientConnection): Promise<void> {
    try {
      const { toolName } = message.params as { toolName: string };
      
      if (!connection.sessionId) {
        await this.sendError(connection.websocket, 'not_authenticated', 'Authentication required', message.id);
        return;
      }

      connection.subscriptions.delete(toolName);
      
      const response: WebSocketMessage = {
        id: message.id,
        type: 'response',
        result: { unsubscribed: toolName },
        timestamp: new Date().toISOString(),
      };

      connection.websocket.send(JSON.stringify(response));

    } catch (error) {
      await this.sendError(
        connection.websocket, 
        'unsubscribe_failed', 
        error instanceof Error ? error.message : 'Unknown error', 
        message.id
      );
    }
  }

  /**
   * Handle unknown message types
   */
  private async handleUnknownMessage(message: WebSocketMessage, connection: ClientConnection): Promise<void> {
    await this.sendError(
      connection.websocket, 
      'unknown_method', 
      `Unknown method: ${message.method}`, 
      message.id
    );
  }

  /**
   * Handle client disconnection
   */
  private async handleDisconnection(connection: ClientConnection, code: number, reason: string): Promise<void> {
    if (connection.sessionId) {
      this.connections.delete(connection.sessionId);
      await this.connectionManager.unregisterConnection(connection.sessionId);
      
      this.logger.info('Client disconnected', {
        sessionId: connection.sessionId,
        code,
        reason,
        duration: Date.now() - connection.connectedAt.getTime()
      });
    }
  }

  /**
   * Send authentication response
   */
  private async sendAuthResponse(websocket: CloudflareWebSocket, response: AuthResponse, messageId: string): Promise<void> {
    const message: WebSocketMessage = {
      id: messageId,
      type: 'response',
      result: response,
      timestamp: new Date().toISOString(),
    };

    websocket.send(JSON.stringify(message));
  }

  /**
   * Send error message
   */
  private async sendError(websocket: CloudflareWebSocket, code: string, message: string, messageId: string): Promise<void> {
    const errorMessage: WebSocketMessage = {
      id: messageId,
      type: 'response',
      error: {
        code,
        message,
      },
      timestamp: new Date().toISOString(),
    };

    websocket.send(JSON.stringify(errorMessage));
  }

  /**
   * Broadcast event to subscribed clients
   */
  async broadcastEvent(event: MCPEvent): Promise<void> {
    const targetConnections = event.data.targetUsers 
      ? event.data.targetUsers.map(userId => this.connections.get(userId)).filter(Boolean)
      : Array.from(this.connections.values());

    const message: WebSocketMessage = {
      id: crypto.randomUUID(),
      type: 'notification',
      method: 'event',
      params: event,
      timestamp: new Date().toISOString(),
    };

    const messageStr = JSON.stringify(message);

    for (const connection of targetConnections) {
      if (connection) {
        try {
          connection.websocket.send(messageStr);
        } catch (error) {
          this.logger.warn('Failed to send event to client', {
            sessionId: connection.sessionId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    subscriptions: Record<string, number>;
  } {
    const authenticated = Array.from(this.connections.values()).filter(c => c.sessionId);
    const subscriptions: Record<string, number> = {};

    for (const connection of authenticated) {
      for (const sub of connection.subscriptions) {
        subscriptions[sub] = (subscriptions[sub] || 0) + 1;
      }
    }

    return {
      totalConnections: this.connections.size,
      authenticatedConnections: authenticated.length,
      subscriptions,
    };
  }

  /**
   * Close all connections (for shutdown)
   */
  async closeAllConnections(): Promise<void> {
    for (const connection of this.connections.values()) {
      try {
        connection.websocket.close(1001, 'Server shutting down');
      } catch (error) {
        // Ignore errors during shutdown
      }
    }
    this.connections.clear();
  }
}