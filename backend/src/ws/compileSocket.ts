/**
 * Socket.IO handler for code compilation and execution
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
 * CompileWebSocketHandler handles compilation-related Socket.IO communication
 * This class mirrors the frontend's CompileSocketManager structure
 */
export class CompileWebSocketHandler extends BaseSocketHandler {
  /**
   * Create a new CompileWebSocketHandler
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

    // Create a temporary directory for compilation
    const env = this.compilationService.createCompilationEnvironment(lang);

    try {
      // Write the code to a temporary file
      this.compilationService.writeCodeToFile(env.sourceFile, code);

      // Notify client that compilation has started
      this.emitToClient(socket, SocketEvents.COMPILING, {});

      // Run the compilation
      this.compilationService
        .compileCode(env, code, { lang, compiler, optimization })
        .then((result) => {
          if (result.success) {
            // Compilation succeeded, run the program
            this.emitToClient(socket, SocketEvents.COMPILE_SUCCESS, {});

            this.runCompiledProgram(socket, env);
          } else {
            // Compilation failed, send error to client
            this.emitToClient(socket, SocketEvents.COMPILE_ERROR, {
              output: result.error,
            });

            // Clean up the temporary directory
            env.tmpDir.removeCallback();
          }
        })
        .catch((error) => {
          // Unexpected error
          this.emitToClient(socket, SocketEvents.COMPILE_ERROR, {
            output: `Unexpected error: ${(error as Error).message}`,
          });

          // Clean up the temporary directory
          env.tmpDir.removeCallback();
        });
    } catch (error) {
      // Error handling
      this.emitToClient(socket, SocketEvents.COMPILE_ERROR, {
        output: `Error: ${(error as Error).message}`,
      });

      // Clean up the temporary directory
      env.tmpDir.removeCallback();
    }
  }

  /**
   * Run a compiled program
   * @param {SessionSocket} socket - Socket.IO connection
   * @param {any} env - Compilation environment
   * @private
   */
  private runCompiledProgram(socket: SessionSocket, env: any): void {
    try {
      // Execute the compilation session
      if (
        !this.sessionService.executeCompilationSession(
          socket,
          socket.sessionId,
          env.tmpDir,
          env.outputFile
        )
      ) {
        this.emitToClient(socket, SocketEvents.ERROR, {
          message: "Failed to execute compilation session",
        });
        env.tmpDir.removeCallback();
      }
    } catch (error) {
      this.emitToClient(socket, SocketEvents.ERROR, {
        message: `Failed to run program: ${(error as Error).message}`,
      });
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

    // Only process input for compilation sessions
    if (session && session.sessionType === "compilation") {
      if (!this.sessionService.sendInputToSession(sessionId, data.input)) {
        this.emitToClient(socket, SocketEvents.ERROR, {
          message: "No active program to receive input",
        });
      }
    }
  }

  /**
   * Handle cleanup request
   * @param {SessionSocket} socket - Socket.IO connection
   */
  protected handleCleanupRequest(socket: SessionSocket): void {
    this.handleCleanup(socket, "compilation");
  }

  /**
   * Setup event handlers for a socket
   * @param {SessionSocket} socket - Socket.IO connection
   */
  public setupSocketHandlers(socket: SessionSocket): void {
    if (!this.setupCommonHandlers(socket)) {
      return;
    }

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

    socket.on(SocketEvents.INPUT, (data: { input: string }) => {
      this.handleInput(socket, data);
    });
  }
}

// Create singleton instance with dependencies
export const compileHandler = new CompileWebSocketHandler(
  codeProcessingService,
  sessionService,
  webSocketManager
);
