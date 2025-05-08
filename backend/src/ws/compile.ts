/**
 * Socket.IO handler for code compilation and execution
 */
import http from "http";
import { Socket } from "socket.io";
import {
  ICompilationService,
  ISessionService,
  IWebSocketManager,
  SessionSocket,
  SocketEvents,
} from "../types";
import { compilationService } from "../utils/compilationService";
import { sessionService } from "../utils/sessionService";
import { webSocketManager, socketEvents } from "../utils/webSocketHandler";

/**
 * CompileWebSocketHandler handles compilation-related Socket.IO communication
 * This class mirrors the frontend's CompileSocketManager structure
 */
export class CompileWebSocketHandler {
  private compilationService: ICompilationService;
  private sessionService: ISessionService;
  private webSocketManager: IWebSocketManager;

  /**
   * Create a new CompileWebSocketHandler
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

    // Initialize session service
    this.sessionService.initSessionService();
  }

  /**
   * Handle compilation requests
   * @param {SessionSocket} socket - Socket.IO connection
   * @param {any} data - Compilation request data
   */
  handleCompileRequest(
    socket: SessionSocket,
    data: {
      code: string;
      lang: string;
      compiler?: string;
      optimization?: string;
    }
  ): void {
    const { code, lang, compiler, optimization } = data;

    // Create compilation environment
    const env = this.compilationService.createCompilationEnvironment(lang);

    try {
      // Write code to temporary file
      this.compilationService.writeCodeToFile(env.sourceFile, code);

      // Notify client that compilation has started
      this.emitToClient(socket, SocketEvents.COMPILING, {});

      // Compile the code
      this.compilationService
        .compileCode(env, code, { lang, compiler, optimization })
        .then((result) => {
          if (result.success) {
            // Compilation successful, notify client
            this.emitToClient(socket, SocketEvents.COMPILE_SUCCESS, {});

            // Start compilation session with PTY
            const success = this.sessionService.startCompilationSession(
              socket,
              socket.sessionId,
              env.tmpDir,
              env.outputFile
            );

            if (!success) {
              // Clean up on PTY creation error
              env.tmpDir.removeCallback();
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
          this.emitToClient(socket, SocketEvents.ERROR, {
            message: "Unexpected error: " + (error as Error).message,
          });

          // Clean up temporary directory
          env.tmpDir.removeCallback();
        });
    } catch (error) {
      this.emitToClient(socket, SocketEvents.ERROR, {
        message: "Error setting up compilation: " + (error as Error).message,
      });

      // Clean up temporary directory
      env.tmpDir.removeCallback();
    }
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
          console.error(
            `Unexpected error for debug session ${socket.sessionId}:`,
            error
          );
          this.emitToClient(socket, SocketEvents.DEBUG_ERROR, {
            message: "Unexpected error: " + (error as Error).message,
          });

          // Clean up temporary directory
          env.tmpDir.removeCallback();
        });
    } catch (error) {
      console.error(
        `Error setting up debug session for session ${socket.sessionId}:`,
        error
      );
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
    const { command } = data;

    if (
      !this.sessionService.sendInputToSession(socket.sessionId, command + "\n")
    ) {
      this.emitToClient(socket, SocketEvents.DEBUG_ERROR, {
        message: "No active debug session to receive commands",
      });
    }
  }

  /**
   * Handle sending input to a running program
   * @param {SessionSocket} socket - Socket.IO connection
   * @param {any} data - Input data
   */
  handleInput(socket: SessionSocket, data: { input: string }): void {
    if (!this.sessionService.sendInputToSession(socket.sessionId, data.input)) {
      this.emitToClient(socket, SocketEvents.ERROR, {
        message: "No active compilation session to receive input",
      });
    }
  }

  /**
   * Handle cleanup requests
   * @param {SessionSocket} socket - Socket.IO connection
   */
  handleCleanup(socket: SessionSocket): void {
    this.sessionService.terminateSession(socket.sessionId);
    this.emitToClient(socket, SocketEvents.CLEANUP_COMPLETE, {});
  }

  /**
   * Setup event handlers for a socket
   * @param {SessionSocket} socket - Socket.IO connection
   */
  setupSocketHandlers(socket: SessionSocket): void {
    // Generate and assign a session ID
    this.sessionService.createSession(socket);

    // Set up event handlers for compilation-related messages
    socket.on(
      SocketEvents.COMPILE,
      (data: {
        code: string;
        lang: string;
        compiler?: string;
        optimization?: string;
      }) => {
        this.handleCompileRequest(socket, data);
      }
    );

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

    // Handle disconnect
    socket.on(SocketEvents.DISCONNECT, () => {
      this.sessionService.terminateSession(socket.sessionId);
    });
  }

  /**
   * Send a message to a client
   * @param {Socket} socket - Socket.IO socket
   * @param {string} event - Event name
   * @param {any} data - Data to send
   * @private
   */
  private emitToClient(socket: Socket, event: string, data: any): void {
    this.webSocketManager.emitToClient(socket, event, data);
  }
}

// Create singleton instance with dependencies
export const compileHandler = new CompileWebSocketHandler(
  compilationService,
  sessionService,
  webSocketManager
);

/**
 * Setup Socket.IO handlers for compilation
 * @param {http.Server} server - HTTP server for Socket.IO
 * @returns {void}
 */
export const setupCompileSocketHandlers = (server: http.Server): void => {
  // Create Socket.IO server
  webSocketManager.initialize(server);

  // Handle new socket connections
  socketEvents.on("socket-connect", ({ socket }) => {
    const sessionSocket = socket as SessionSocket;
    compileHandler.setupSocketHandlers(sessionSocket);
  });
};
