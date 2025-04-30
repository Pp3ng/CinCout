/**
 * Socket.IO handler for code compilation and execution
 */
import http from "http";
import {
  compileCode,
  createCompilationEnvironment,
  writeCodeToFile,
} from "../utils/compilationService";
import {
  webSocketManager,
  emitToClient,
  SessionSocket,
  socketEvents,
  SocketEvents,
} from "../utils/webSocketHandler";
import {
  startCompilationSession,
  sendInputToSession,
  terminateSession,
  initSessionService,
  createSession,
  resizeTerminal,
} from "../utils/sessionService";

// Initialize session service
initSessionService();

/**
 * CompileWebSocketHandler handles compilation-related Socket.IO communication
 * This class mirrors the frontend's CompileSocketManager structure
 */
export class CompileWebSocketHandler {
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
    const env = createCompilationEnvironment(lang);

    try {
      // Write code to temporary file
      writeCodeToFile(env.sourceFile, code);

      // Notify client that compilation has started
      emitToClient(socket, SocketEvents.COMPILING, {});

      // Compile the code
      compileCode(env, code, { lang, compiler, optimization })
        .then((result) => {
          if (result.success) {
            // Compilation successful, notify client
            emitToClient(socket, SocketEvents.COMPILE_SUCCESS, {});

            // Start compilation session with PTY
            const success = startCompilationSession(
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
            emitToClient(socket, SocketEvents.COMPILE_ERROR, {
              output: result.error,
            });

            // Clean up temporary directory
            env.tmpDir.removeCallback();
          }
        })
        .catch((error) => {
          // Unexpected error
          console.error(
            `Unexpected error for session ${socket.sessionId}:`,
            error
          );
          emitToClient(socket, SocketEvents.ERROR, {
            message: "Unexpected error: " + (error as Error).message,
          });

          // Clean up temporary directory
          env.tmpDir.removeCallback();
        });
    } catch (error) {
      console.error(
        `Error setting up compilation for session ${socket.sessionId}:`,
        error
      );
      emitToClient(socket, SocketEvents.ERROR, {
        message: "Error setting up compilation: " + (error as Error).message,
      });

      // Clean up temporary directory
      env.tmpDir.removeCallback();
    }
  }

  /**
   * Handle sending input to a running program
   * @param {SessionSocket} socket - Socket.IO connection
   * @param {any} data - Input data
   */
  handleInput(socket: SessionSocket, data: { input: string }): void {
    if (!sendInputToSession(socket.sessionId, data.input)) {
      emitToClient(socket, SocketEvents.ERROR, {
        message: "No active compilation session to receive input",
      });
    }
  }

  /**
   * Handle terminal resize events
   * @param {SessionSocket} socket - Socket.IO connection
   * @param {any} data - Resize dimensions
   */
  handleResize(socket: SessionSocket, data: { cols: number; rows: number }): void {
    const { cols, rows } = data;
    if (!resizeTerminal(socket.sessionId, cols, rows)) {
      console.warn(
        `Failed to resize terminal for session ${socket.sessionId}: cols=${cols}, rows=${rows}`
      );
    }
  }

  /**
   * Handle cleanup requests
   * @param {SessionSocket} socket - Socket.IO connection
   */
  handleCleanup(socket: SessionSocket): void {
    terminateSession(socket.sessionId);
    emitToClient(socket, SocketEvents.CLEANUP_COMPLETE, {});
  }

  /**
   * Setup event handlers for a socket
   * @param {SessionSocket} socket - Socket.IO connection
   */
  setupSocketHandlers(socket: SessionSocket): void {
    // Generate and assign a session ID
    createSession(socket);

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

    // Handle input from client to program
    socket.on(SocketEvents.INPUT, (data: { input: string }) => {
      this.handleInput(socket, data);
    });

    // Handle terminal resize events
    socket.on(SocketEvents.RESIZE, (data: { cols: number; rows: number }) => {
      this.handleResize(socket, data);
    });

    // Handle cleanup requests
    socket.on(SocketEvents.CLEANUP, () => {
      this.handleCleanup(socket);
    });
  }
}

// Create singleton instance
export const compileHandler = new CompileWebSocketHandler();

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
