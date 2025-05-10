// Socket.IO communication module
import { io, Socket } from "socket.io-client";

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
 * WebSocketManager class for frontend
 */
export class WebSocketManager {
  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private eventHandlers: Map<string, Set<(data: any) => void>> = new Map();
  private isRunning: boolean = false;
  private sessionType: string | null = null;

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
        this.isRunning = true;
        resolve(this.socket as Socket);
      });

      this.socket.once("connect_error", (error: any) => {
        console.error("Socket connection error:", error);
        reject(error);
      });

      this.socket.on(SocketEvents.DISCONNECT, (reason: string) => {
        if (reason === "io server disconnect") {
          this.socket?.connect();
        }
      });

      // Handle session creation
      this.socket.on(SocketEvents.SESSION_CREATED, (data: any) => {
        this.sessionId = data.sessionId;
        this.notifyListeners(SocketEvents.SESSION_CREATED, data);
      });

      this.socket.on(SocketEvents.COMPILING, () => {
        this.isRunning = true;
        this.notifyListeners(SocketEvents.COMPILING, {});
      });

      this.socket.on(SocketEvents.COMPILE_SUCCESS, () => {
        this.isRunning = true;
        this.notifyListeners(SocketEvents.COMPILE_SUCCESS, {});
      });

      this.socket.on(SocketEvents.COMPILE_ERROR, (data: any) => {
        this.isRunning = false;
        this.notifyListeners(SocketEvents.COMPILE_ERROR, data);
      });

      this.socket.on(SocketEvents.EXIT, (data: any) => {
        this.isRunning = false;
        this.notifyListeners(SocketEvents.EXIT, data);
      });

      // Handle debug session events
      this.socket.on(SocketEvents.DEBUG_START, (data: any) => {
        this.isRunning = true;
        this.notifyListeners(SocketEvents.DEBUG_START, data);
      });

      this.socket.on(SocketEvents.DEBUG_EXIT, (data: any) => {
        this.isRunning = false;
        this.notifyListeners(SocketEvents.DEBUG_EXIT, data);
      });

      // Handle leak detection events
      this.socket.on(SocketEvents.LEAK_CHECK_COMPILING, () => {
        this.isRunning = true;
        this.notifyListeners(SocketEvents.LEAK_CHECK_COMPILING, {});
      });

      this.socket.on(SocketEvents.LEAK_CHECK_RUNNING, () => {
        this.isRunning = true;
        this.notifyListeners(SocketEvents.LEAK_CHECK_RUNNING, {});
      });

      this.socket.on(SocketEvents.LEAK_CHECK_REPORT, (data: any) => {
        this.isRunning = false;
        this.notifyListeners(SocketEvents.LEAK_CHECK_REPORT, data);
      });

      this.socket.on(SocketEvents.LEAK_CHECK_ERROR, (data: any) => {
        this.isRunning = false;
        this.notifyListeners(SocketEvents.LEAK_CHECK_ERROR, data);
      });

      // Forward all other events to listeners
      [
        SocketEvents.OUTPUT,
        SocketEvents.ERROR,
        SocketEvents.CLEANUP_COMPLETE,
        SocketEvents.DEBUG_RESPONSE,
        SocketEvents.DEBUG_ERROR,
      ].forEach((event) => {
        this.socket?.on(event, (data: any) => {
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
    this.sessionType = null;
    this.isRunning = false;
  }

  /**
   * Common cleanup method for all socket managers
   * Sends cleanup request and disconnects
   * @returns {Promise<void>}
   */
  cleanupSession(): Promise<void> {
    return new Promise<void>((resolve) => {
      try {
        if (this.sessionId && this.isConnected()) {
          this.emit(SocketEvents.CLEANUP)
            .catch((e) => console.error("Error sending cleanup message:", e))
            .finally(() => {
              this.setSessionType(null);
              this.disconnect();
              resolve();
            });
        } else {
          this.disconnect();
          resolve();
        }
      } catch (error) {
        console.error("Failed to handle cleanup:", error);
        this.disconnect();
        resolve();
      }
    });
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
   * Check if a process is running
   * @returns {boolean} True if a process is running
   */
  isProcessRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Set process running state
   * @param {boolean} running - Whether a process is running
   */
  setProcessRunning(running: boolean): void {
    this.isRunning = running;
  }

  /**
   * Send input to a running process
   * @param {string} input - Input to send
   * @returns {Promise<void>}
   */
  sendInput(input: string): Promise<void> {
    return this.emit(SocketEvents.INPUT, { input });
  }

  /**
   * Get session type
   * @returns {string | null} Session type
   */
  getSessionType(): string | null {
    return this.sessionType;
  }

  /**
   * Set session type
   * @param {string | null} type - Session type ('compilation', 'debug', 'leak_detection')
   */
  setSessionType(type: string | null): void {
    this.sessionType = type;
  }
}

// Export singleton instance for use across the app
export const socketManager = new WebSocketManager();

// Export as window global for legacy support
(window as any).CinCoutSocket = socketManager;
