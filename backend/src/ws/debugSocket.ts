/**
 * Socket.IO handler for GDB debugging
 */
import {
  ICodeProcessingService,
  ISessionService,
  IWebSocketManager,
  SessionSocket,
} from "../types";
import { codeProcessingService } from "../utils/codeProcessingService";
import { sessionService } from "../utils/sessionService";
import {
  webSocketManager,
  SocketEvents,
  BaseSocketHandler,
} from "./webSocketManager";

/**
 * DebugWebSocketHandler handles debugging-related Socket.IO communication
 */
export class DebugWebSocketHandler extends BaseSocketHandler {
  /**
   * Create a new DebugWebSocketHandler
   * @param compilationService - Compilation service
   * @param sessionService - Session service
   * @param webSocketManager - WebSocket manager
   */
  constructor(
    compilationService: ICodeProcessingService,
    sessionService: ISessionService,
    webSocketManager: IWebSocketManager
  ) {
    super(compilationService, sessionService, webSocketManager);
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
      this.webSocketManager.emitToClient(socket, SocketEvents.COMPILING, {});

      // Compile the code with debug flags
      this.compilationService
        .prepareDebugSession(env, { lang, compiler, optimization: "-O0" })
        .then((result) => {
          if (result.success) {
            // Execute debug session with GDB
            const success = this.sessionService.executeDebugSession(
              socket,
              socket.sessionId,
              env.tmpDir,
              env.outputFile
            );

            if (!success) {
              this.webSocketManager.emitToClient(
                socket,
                SocketEvents.DEBUG_ERROR,
                {
                  message: "Failed to start GDB debug session",
                }
              );
              // Clean up on error
              env.tmpDir.removeCallback();
            } else {
              this.webSocketManager.emitToClient(
                socket,
                SocketEvents.DEBUG_START,
                {}
              );
            }
          } else {
            // Compilation error
            this.webSocketManager.emitToClient(
              socket,
              SocketEvents.COMPILE_ERROR,
              {
                output: result.error,
              }
            );

            // Clean up temporary directory
            env.tmpDir.removeCallback();
          }
        })
        .catch((error) => {
          // Unexpected error
          this.webSocketManager.emitToClient(socket, SocketEvents.DEBUG_ERROR, {
            message: "Unexpected error: " + (error as Error).message,
          });

          // Clean up temporary directory
          env.tmpDir.removeCallback();
        });
    } catch (error) {
      this.webSocketManager.emitToClient(socket, SocketEvents.DEBUG_ERROR, {
        message: "Error setting up debug session: " + (error as Error).message,
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
    const sessionId = socket.sessionId;
    const session = this.sessionService.getSession(sessionId);

    // Only process input for debug sessions
    if (session && session.sessionType === "debug") {
      if (!this.sessionService.sendInputToSession(sessionId, data.input)) {
        this.webSocketManager.emitToClient(socket, SocketEvents.ERROR, {
          message: "No active debug session to receive input",
        });
      }
    }
  }

  /**
   * Handle cleanup request
   * @param {SessionSocket} socket - Socket.IO connection
   */
  protected handleCleanupRequest(socket: SessionSocket): void {
    this.handleCleanup(socket, "debug");
  }

  /**
   * Setup event handlers for a socket
   * @param {SessionSocket} socket - Socket.IO connection
   */
  public setupSocketHandlers(socket: SessionSocket): void {
    if (!this.setupCommonHandlers(socket)) {
      return;
    }

    // Set up event handlers for debugging
    socket.on(
      SocketEvents.DEBUG_START,
      (data: { code: string; lang: string; compiler?: string }) => {
        this.handleDebugRequest(socket, data);
      }
    );

    // Handle input from client to program
    socket.on(SocketEvents.INPUT, (data: { input: string }) => {
      this.handleInput(socket, data);
    });
  }
}

// Create singleton instance with dependencies
export const debugHandler = new DebugWebSocketHandler(
  codeProcessingService,
  sessionService,
  webSocketManager
);
