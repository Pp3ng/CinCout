/**
 * Socket.IO Handler
 * Centralized utilities for Socket.IO communication
 */
import { Server as SocketIOServer, Socket } from "socket.io";
import { EventEmitter } from "events";
import { Server } from "http";
import zlib from "zlib";
import {
  IWebSocketManager,
  SessionSocket,
  ISessionService,
  ICodeProcessingService,
} from "../types";
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

  // Strace system call tracing events
  STRACE_START = "strace_start",
  STRACE_RESPONSE = "strace_response",
  STRACE_ERROR = "strace_error",
  STRACE_REPORT = "strace_report",
}

/**
 * Base class for socket handlers with common functionality
 */
export abstract class BaseSocketHandler {
  protected compilationService: ICodeProcessingService;
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
    compilationService: ICodeProcessingService,
    sessionService: ISessionService,
    webSocketManager: IWebSocketManager
  ) {
    this.compilationService = compilationService;
    this.sessionService = sessionService;
    this.webSocketManager = webSocketManager;
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
      this.webSocketManager.emitToClient(
        socket,
        SocketEvents.CLEANUP_COMPLETE,
        {}
      );
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
        transports: ["websocket"],
        // Enable compression
        perMessageDeflate: {
          threshold: 1024, // Only compress data if larger than 1KB
          zlibDeflateOptions: {
            level: 5,
            memLevel: 8,
            strategy: zlib.constants.Z_DEFAULT_STRATEGY,
          },
          serverNoContextTakeover: true, // Free up compression context after each message
          clientNoContextTakeover: true, // Request clients to free compression context
        },
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
        setupStraceHandlers(sessionSocket);

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
      console.error("Socket.IO initialization error:", error);
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

const setupCompileHandlers = async (socket: SessionSocket) => {
  const { compileHandler } = await import("./compileSocket");
  compileHandler.setupSocketHandlers(socket);
};

const setupDebugHandlers = async (socket: SessionSocket) => {
  const { debugHandler } = await import("./debugSocket");
  debugHandler.setupSocketHandlers(socket);
};

const setupLeakDetectHandlers = async (socket: SessionSocket) => {
  const { leakDetectHandler } = await import("./leakDetectSocket");
  leakDetectHandler.setupSocketHandlers(socket);
};

const setupStraceHandlers = async (socket: SessionSocket) => {
  const { straceHandler } = await import("./syscallSocket");
  straceHandler.setupSocketHandlers(socket);
};

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
