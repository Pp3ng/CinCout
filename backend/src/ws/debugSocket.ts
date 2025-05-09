/**
 * Socket.IO handler for GDB debugging
 */
import {
  ICompilationService,
  ISessionService,
  IWebSocketManager,
  SessionSocket,
} from "../types";
import { compilationService } from "../utils/compilationService";
import { sessionService } from "../utils/sessionService";
import { webSocketManager, SocketEvents } from "./webSocketManager";

// Track sockets that already have handlers attached
const handledSockets = new Set<string>();

/**
 * DebugWebSocketHandler handles debugging-related Socket.IO communication
 */
export class DebugWebSocketHandler {
  private compilationService: ICompilationService;
  private sessionService: ISessionService;
  private webSocketManager: IWebSocketManager;

  /**
   * Create a new DebugWebSocketHandler
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
   * Handle debug session requests
   * @param {SessionSocket} socket - Socket.IO connection
   * @param {any} data - Debug request data
   */
  handleDebugRequest(
    socket: SessionSocket,
    data: {
      code: string;
      lang: string;
      compiler?: string;
    }
  ): void {
    const { code, lang, compiler } = data;

    // Create compilation environment
    const env = this.compilationService.createCompilationEnvironment(lang);

    try {
      // Write code to temporary file
      this.compilationService.writeCodeToFile(env.sourceFile, code);

      // Notify client that compilation has started
      this.emitToClient(socket, SocketEvents.COMPILING, {});

      // Compile the code with debug flags
      this.compilationService
        .startDebugSession(env, { lang, compiler, optimization: "-O0" })
        .then((result) => {
          if (result.success) {
            // Start debug session with GDB
            const success = this.sessionService.startDebugSession(
              socket,
              socket.sessionId,
              env.tmpDir,
              env.outputFile
            );

            if (!success) {
              this.emitToClient(socket, SocketEvents.DEBUG_ERROR, {
                message: "Failed to start GDB debug session",
              });
              // Clean up on error
              env.tmpDir.removeCallback();
            } else {
              this.emitToClient(socket, SocketEvents.DEBUG_START, {});
            }
          } else {
            // Compilation error
            this.emitToClient(socket, SocketEvents.COMPILE_ERROR, {
              output: result.error,
            });

            // Clean up temporary directory
            env.tmpDir.removeCallback();
          }
        })
        .catch((error) => {
          // Unexpected error
          this.emitToClient(socket, SocketEvents.DEBUG_ERROR, {
            message: "Unexpected error: " + (error as Error).message,
          });

          // Clean up temporary directory
          env.tmpDir.removeCallback();
        });
    } catch (error) {
      this.emitToClient(socket, SocketEvents.DEBUG_ERROR, {
        message: "Error setting up debug session: " + (error as Error).message,
      });

      // Clean up temporary directory
      env.tmpDir.removeCallback();
    }
  }

  /**
   * Handle debug command requests
   * @param {SessionSocket} socket - Socket.IO connection
   * @param {any} data - Debug command data
   */
  handleDebugCommand(socket: SessionSocket, data: { command: string }): void {
    const sessionId = socket.sessionId;
    const session = this.sessionService.getSession(sessionId);

    // Only process debug commands for debug sessions
    if (session && session.isDebugSession) {
      if (
        !this.sessionService.sendInputToSession(sessionId, data.command + "\n")
      ) {
        this.emitToClient(socket, SocketEvents.DEBUG_ERROR, {
          message: "No active debug session to receive commands",
        });
      }
    }
  }

  /**
   * Handle sending input to a running program
   * @param {SessionSocket} socket - Socket.IO connection
   * @param {any} data - Input data
   */
  handleInput(socket: SessionSocket, data: { input: string }): void {
    const sessionId = socket.sessionId;
    const session = this.sessionService.getSession(sessionId);

    // Only process input for debug sessions
    if (session && session.sessionType === "debug") {
      if (!this.sessionService.sendInputToSession(sessionId, data.input)) {
        this.emitToClient(socket, SocketEvents.ERROR, {
          message: "No active debug session to receive input",
        });
      }
    }
  }

  /**
   * Handle cleanup requests
   * @param {SessionSocket} socket - Socket.IO connection
   */
  handleCleanup(socket: SessionSocket): void {
    const sessionId = socket.sessionId;
    const session = this.sessionService.getSession(sessionId);

    // Only handle cleanup for debug sessions
    if (session && session.sessionType === "debug") {
      this.sessionService.terminateSession(sessionId);
      this.emitToClient(socket, SocketEvents.CLEANUP_COMPLETE, {});
    }
  }

  /**
   * Setup event handlers for a socket
   * @param {SessionSocket} socket - Socket.IO connection
   */
  setupSocketHandlers(socket: SessionSocket): void {
    // Prevent duplicate handlers by checking if we've already handled this socket
    if (handledSockets.has(socket.id)) {
      return; // Skip if already handled
    }

    // Mark socket as handled
    handledSockets.add(socket.id);

    // Remove from set on disconnect
    socket.on(SocketEvents.DISCONNECT, () => {
      handledSockets.delete(socket.id);
      // NOTE: We don't call terminateSession here anymore
      // This is now handled centrally in webSocketManager
    });

    // Set up event handlers for debugging
    socket.on(
      SocketEvents.DEBUG_START,
      (data: { code: string; lang: string; compiler?: string }) => {
        this.handleDebugRequest(socket, data);
      }
    );

    socket.on(SocketEvents.DEBUG_COMMAND, (data: { command: string }) => {
      this.handleDebugCommand(socket, data);
    });

    // Handle input from client to program
    socket.on(SocketEvents.INPUT, (data: { input: string }) => {
      this.handleInput(socket, data);
    });

    // Handle cleanup requests
    socket.on(SocketEvents.CLEANUP, () => {
      this.handleCleanup(socket);
    });
  }

  /**
   * Send a message to a client
   * @param socket - Socket.IO socket
   * @param event - Event name
   * @param data - Data to send
   * @private
   */
  private emitToClient(socket: SessionSocket, event: string, data: any): void {
    this.webSocketManager.emitToClient(socket, event, data);
  }
}

// Create singleton instance with dependencies
export const debugHandler = new DebugWebSocketHandler(
  compilationService,
  sessionService,
  webSocketManager
);
