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
  createSocketServer,
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
 * Handle compilation requests
 * @param {SessionSocket} socket - Socket.IO connection
 * @param {any} data - Compilation request data
 */
const handleCompileRequest = (
  socket: SessionSocket,
  data: {
    code: string;
    lang: string;
    compiler?: string;
    optimization?: string;
  }
): void => {
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
};

/**
 * Setup Socket.IO handlers for compilation
 * @param {http.Server} server - HTTP server for Socket.IO
 * @returns {void}
 */
export const setupCompileSocketHandlers = (server: http.Server): void => {
  // Create Socket.IO server
  createSocketServer(server);

  // Handle new socket connections
  socketEvents.on("socket-connect", ({ socket }) => {
    const sessionSocket = socket as SessionSocket;

    // Generate and assign a session ID
    createSession(sessionSocket);

    // Set up event handlers for compilation-related messages
    socket.on(
      SocketEvents.COMPILE,
      (data: {
        code: string;
        lang: string;
        compiler?: string;
        optimization?: string;
      }) => {
        handleCompileRequest(sessionSocket, data);
      }
    );

    // Handle input from client to program
    socket.on(SocketEvents.INPUT, (data: { input: string }) => {
      if (!sendInputToSession(sessionSocket.sessionId, data.input)) {
        emitToClient(socket, SocketEvents.ERROR, {
          message: "No active compilation session to receive input",
        });
      }
    });

    socket.on(SocketEvents.RESIZE, (data: { cols: number; rows: number }) => {
      const { cols, rows } = data;
      if (!resizeTerminal(sessionSocket.sessionId, cols, rows)) {
        console.warn(
          `Failed to resize terminal for session ${sessionSocket.sessionId}: cols=${cols}, rows=${rows}`
        );
      }
    });

    // Handle cleanup requests
    socket.on(SocketEvents.CLEANUP, () => {
      terminateSession(sessionSocket.sessionId);
      emitToClient(socket, SocketEvents.CLEANUP_COMPLETE, {});
    });
  });
};
