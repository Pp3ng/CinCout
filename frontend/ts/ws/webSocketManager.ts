// Socket.IO communication module
import { io, Socket } from "socket.io-client";
import { CompilationState } from "../types";

// Create a strongly-typed event system matching backend
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
  DEBUG_COMMAND = "debug_command",
  DEBUG_RESPONSE = "debug_response",
  DEBUG_ERROR = "debug_error",
  DEBUG_EXIT = "debug_exit",
}

/**
 * WebSocketManager class for frontend
 * Mirrors the backend WebSocketManager structure
 */
export class WebSocketManager {
  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private eventHandlers: Map<string, Set<(data: any) => void>> = new Map();
  private compilationState: CompilationState = CompilationState.IDLE;

  /**
   * Connect to the Socket.IO server
   * @returns {Promise<Socket>} Socket instance
   */
  connect(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.connected) {
        resolve(this.socket);
        return;
      }

      // Create socket with optimal settings
      this.socket = io({
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
      });

      // Setup core event handlers
      this.socket.once(SocketEvents.CONNECT, () => {
        this.compilationState = CompilationState.RUNNING;
        resolve(this.socket as Socket);
      });

      this.socket.once("connect_error", (error) => {
        console.error("Socket connection error:", error);
        reject(error);
      });

      this.socket.on(SocketEvents.DISCONNECT, (reason) => {
        if (reason === "io server disconnect") {
          this.socket?.connect();
        }
      });

      // Handle session creation
      this.socket.on(SocketEvents.SESSION_CREATED, (data) => {
        this.sessionId = data.sessionId;
        this.notifyListeners(SocketEvents.SESSION_CREATED, data);
      });

      // Update compilation state based on events
      this.socket.on(SocketEvents.COMPILING, () => {
        this.compilationState = CompilationState.COMPILING;
        this.notifyListeners(SocketEvents.COMPILING, {});
      });

      this.socket.on(SocketEvents.COMPILE_SUCCESS, () => {
        this.compilationState = CompilationState.RUNNING;
        this.notifyListeners(SocketEvents.COMPILE_SUCCESS, {});
      });

      this.socket.on(SocketEvents.COMPILE_ERROR, (data) => {
        this.compilationState = CompilationState.IDLE;
        this.notifyListeners(SocketEvents.COMPILE_ERROR, data);
      });

      this.socket.on(SocketEvents.EXIT, (data) => {
        this.compilationState = CompilationState.IDLE;
        this.notifyListeners(SocketEvents.EXIT, data);
      });

      // Handle debug session events
      this.socket.on(SocketEvents.DEBUG_START, (data) => {
        this.compilationState = CompilationState.RUNNING;
        this.notifyListeners(SocketEvents.DEBUG_START, data);
      });

      this.socket.on(SocketEvents.DEBUG_EXIT, (data) => {
        this.compilationState = CompilationState.IDLE;
        this.notifyListeners(SocketEvents.DEBUG_EXIT, data);
      });

      // Forward all other events to listeners
      [
        SocketEvents.OUTPUT,
        SocketEvents.ERROR,
        SocketEvents.CLEANUP_COMPLETE,
        SocketEvents.DEBUG_RESPONSE,
        SocketEvents.DEBUG_ERROR,
      ].forEach((event) => {
        this.socket?.on(event, (data) => {
          this.notifyListeners(event, data);
        });
      });
    });
  }

  /**
   * Disconnect from the Socket.IO server
   */
  disconnect(): void {
    if (!this.socket) return;

    this.socket.disconnect();
    this.sessionId = null;
    this.compilationState = CompilationState.IDLE;
  }

  /**
   * Send an event to the server
   * @param {string} event - Event name
   * @param {any} data - Event data
   * @returns {Promise<void>}
   */
  emit(event: string, data: any = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error("Socket not connected"));
        return;
      }

      try {
        this.socket.emit(event, data);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add an event listener
   * @param {string} event - Event name
   * @param {function} handler - Event handler
   */
  on(event: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)?.add(handler);
  }

  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {function} handler - Event handler to remove
   */
  off(event: string, handler: (data: any) => void): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  /**
   * Notify all listeners of an event
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  private notifyListeners(event: string, data: any): void {
    this.eventHandlers.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Check if the socket is connected
   * @returns {boolean} Connection status
   */
  isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }

  /**
   * Get session ID
   * @returns {string | null} Session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Set session ID
   * @param {string} id - Session ID
   */
  setSessionId(id: string): void {
    this.sessionId = id;
  }

  /**
   * Get compilation state
   * @returns {CompilationState} Current compilation state
   */
  getCompilationState(): CompilationState {
    return this.compilationState;
  }

  /**
   * Check if a process is running
   * @returns {boolean} True if a process is running
   */
  isProcessRunning(): boolean {
    return this.compilationState !== CompilationState.IDLE;
  }

  /**
   * Set process running state - updates compilation state
   * @param {boolean} running - Whether a process is running
   */
  setProcessRunning(running: boolean): void {
    this.compilationState = running
      ? CompilationState.RUNNING
      : CompilationState.IDLE;
  }

  /**
   * Send input to the running program
   * @param {string} input - Input to send
   * @returns {Promise<void>}
   */
  sendInput(input: string): Promise<void> {
    return this.emit(SocketEvents.INPUT, { input });
  }
}

// Create singleton instance
export const socketManager = new WebSocketManager();

// Export as window global for legacy support
(window as any).CinCoutSocket = socketManager;
