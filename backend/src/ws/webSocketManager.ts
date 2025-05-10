/**
 * Socket.IO Handler
 * Centralized utilities for Socket.IO communication
 */
import { Server as SocketIOServer, Socket } from "socket.io";
import { EventEmitter } from "events";
import { Server } from "http";
import { IWebSocketManager, SessionSocket, ISessionService, ICompilationService } from "../types";
import { sessionService } from "../utils/sessionService";

/**
 * Socket event types enum
 */
export enum SocketEvents {
  // Connection lifecycle events
  CONNECT = "connect",
  DISCONNECT = "disconnect",

  // Compilation events
  COMPILE = "compile",
  COMPILING = "compiling",
  COMPILE_SUCCESS = "compile_success",
  COMPILE_ERROR = "compile_error",

  // Execution events
  OUTPUT = "output",
  INPUT = "input",
  EXIT = "exit",

  // Session management
  SESSION_CREATED = "session_created",
  CLEANUP = "cleanup",
  CLEANUP_COMPLETE = "cleanup_complete",

  // Error handling
  ERROR = "error",

  // GDB Debugging events
  DEBUG_START = "debug_start",
  DEBUG_RESPONSE = "debug_response",
  DEBUG_ERROR = "debug_error",
  DEBUG_EXIT = "debug_exit",

  // Memory leak detection events
  LEAK_CHECK = "leak_check",
  LEAK_CHECK_COMPILING = "leak_check_compiling",
  LEAK_CHECK_RUNNING = "leak_check_running",
  LEAK_CHECK_REPORT = "leak_check_report",
  LEAK_CHECK_ERROR = "leak_check_error",
}

/**
 * Base class for socket handlers with common functionality
 */
export abstract class BaseSocketHandler {
  protected compilationService: ICompilationService;
  protected sessionService: ISessionService;
  protected webSocketManager: IWebSocketManager;
  protected handledSockets: Set<string> = new Set<string>();
  
  /**
   * Create a new socket handler
   * @param compilationService - Compilation service
   * @param sessionService - Session service
   * @param webSocketManager - WebSocket manager
   */
  constructor(
    compilationService: ICompilationService,
    sessionService: ISessionService,
    webSocketManager: IWebSocketManager
  ) {
    this.compilationService = compilationService;
    this.sessionService = sessionService;
    this.webSocketManager = webSocketManager;
  }
  
  /**
   * Send a message to a client
   * @param socket - Socket.IO socket
   * @param event - Event name
   * @param data - Data to send
   * @protected
   */
  protected emitToClient(socket: SessionSocket, event: string, data: any): void {
    this.webSocketManager.emitToClient(socket, event, data);
  }
  
  /**
   * Clean up a session
   * @param sessionId - Session ID
   * @protected
   */
  protected cleanupSession(sessionId: string): void {
    this.sessionService.terminateSession(sessionId);
  }
  
  /**
   * Handle cleanup requests
   * @param socket - Socket.IO connection
   * @param sessionType - Type of session to clean up
   */
  protected handleCleanup(socket: SessionSocket, sessionType: string): void {
    const sessionId = socket.sessionId;
    const session = this.sessionService.getSession(sessionId);

    // Only handle cleanup for specified session type
    if (session && session.sessionType === sessionType) {
      this.cleanupSession(sessionId);
      this.emitToClient(socket, SocketEvents.CLEANUP_COMPLETE, {});
    }
  }
  
  /**
   * Common setup for socket event handlers
   * @param socket - Socket.IO connection
   * @protected
   */
  protected setupCommonHandlers(socket: SessionSocket): boolean {
    // Prevent duplicate handlers
    if (this.handledSockets.has(socket.id)) {
      return false;
    }

    // Mark socket as handled
    this.handledSockets.add(socket.id);

    // Remove from set on disconnect
    socket.on(SocketEvents.DISCONNECT, () => {
      this.handledSockets.delete(socket.id);
    });
    
    // Set up cleanup handler
    socket.on(SocketEvents.CLEANUP, () => {
      this.handleCleanupRequest(socket);
    });
    
    return true;
  }
  
  /**
   * Handle cleanup request - to be implemented by subclasses
   * @param socket - Socket.IO connection
   */
  protected abstract handleCleanupRequest(socket: SessionSocket): void;
  
  /**
   * Setup socket handlers - to be implemented by subclasses
   * @param socket - Socket.IO connection
   */
  public abstract setupSocketHandlers(socket: SessionSocket): void;
}

// Events emitter for cross-component communication
export const socketEvents = new EventEmitter();

// Track active sockets
const connectedSockets = new Set<string>();

/**
 * WebSocket Manager Class
 * Central handler for all Socket.IO operations
 */
export class WebSocketManager implements IWebSocketManager {
  private io: SocketIOServer | null = null;

  /**
   * Initialize Socket.IO server
   * @param server - HTTP server to attach Socket.IO
   * @returns Configured Socket.IO server
   */
  initialize(server: Server): SocketIOServer {
    try {
      this.io = new SocketIOServer(server, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"],
        },
        transports: ["websocket", "polling"],
      });

      // Set up connection handler
      this.io.on(SocketEvents.CONNECT, (socket: Socket) => {
        // Skip if already handled
        if (connectedSockets.has(socket.id)) {
          return;
        }

        // Track this socket
        connectedSockets.add(socket.id);

        // Initialize socket with session ID (UUID will be generated by the message handler)
        const sessionSocket = socket as SessionSocket;

        // Generate and assign a session ID
        sessionService.createSession(sessionSocket);

        // Use dynamic imports for handlers to avoid circular dependencies
        setupCompileHandlers(sessionSocket);
        setupDebugHandlers(sessionSocket);
        setupLeakDetectHandlers(sessionSocket);

        // Handle disconnect
        socket.on(SocketEvents.DISCONNECT, () => {
          // Remove from tracking
          connectedSockets.delete(socket.id);

          socketEvents.emit("socket-disconnect", {
            socketId: socket.id,
            sessionId: sessionSocket.sessionId,
          });
        });

        // Emit internal event about new connection
        socketEvents.emit("socket-connect", {
          socketId: socket.id,
          socket: sessionSocket,
        });
      });

      return this.io;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send a message to a specific client
   * @param socket - Socket.IO socket
   * @param event - Event name
   * @param data - Data to send
   */
  emitToClient(socket: Socket, event: string, data: any): void {
    if (socket && socket.connected) {
      socket.emit(event, data);
    }
  }
}

// Helper function to set up compile handlers
async function setupCompileHandlers(socket: SessionSocket) {
  const { compileHandler } = await import("./compileSocket");
  compileHandler.setupSocketHandlers(socket);
}

// Helper function to set up debug handlers
async function setupDebugHandlers(socket: SessionSocket) {
  const { debugHandler } = await import("./debugSocket");
  debugHandler.setupSocketHandlers(socket);
}

// Helper function to set up leak detection handlers
async function setupLeakDetectHandlers(socket: SessionSocket) {
  const { leakDetectHandler } = await import("./leakDetectSocket");
  leakDetectHandler.setupSocketHandlers(socket);
}

// Create singleton instance
export const webSocketManager = new WebSocketManager();

/**
 * Setup all Socket.IO handlers for the application
 * @param server - HTTP server for Socket.IO
 * @returns {void}
 */
export const setupSocketHandlers = (server: Server): void => {
  // Initialize session service first
  sessionService.initSessionService();

  // Initialize Socket.IO server
  webSocketManager.initialize(server);
};
