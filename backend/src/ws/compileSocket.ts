/**
 * Socket.IO handler for code compilation and execution
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

const handledSockets = new Set<string>();

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
    const env = this.compilationService.createCompilationEnvironment(lang);

    try {
      this.compilationService.writeCodeToFile(env.sourceFile, code);
      this.emitToClient(socket, SocketEvents.COMPILING, {});

      this.compilationService
        .compileCode(env, code, { lang, compiler, optimization })
        .then((result) => {
          if (result.success) {
            this.emitToClient(socket, SocketEvents.COMPILE_SUCCESS, {});

            const success = this.sessionService.startCompilationSession(
              socket,
              socket.sessionId,
              env.tmpDir,
              env.outputFile
            );

            if (!success) {
              env.tmpDir.removeCallback();
            }
          } else {
            this.emitToClient(socket, SocketEvents.COMPILE_ERROR, {
              output: result.error,
            });
            env.tmpDir.removeCallback();
          }
        })
        .catch((error) => {
          this.emitToClient(socket, SocketEvents.ERROR, {
            message: "Unexpected error: " + (error as Error).message,
          });
          env.tmpDir.removeCallback();
        });
    } catch (error) {
      this.emitToClient(socket, SocketEvents.ERROR, {
        message: "Error setting up compilation: " + (error as Error).message,
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
    // Get the session to verify it's a compilation session, not a debug session
    const sessionId = socket.sessionId;
    const session = this.sessionService.getSession(sessionId);

    // Only process input for compilation sessions
    if (session && session.sessionType === "compilation") {
      if (!this.sessionService.sendInputToSession(sessionId, data.input)) {
        this.emitToClient(socket, SocketEvents.ERROR, {
          message: "No active compilation session to receive input",
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

    // Only handle cleanup for compilation sessions
    if (session && session.sessionType === "compilation") {
      this.sessionService.terminateSession(sessionId);
      this.emitToClient(socket, SocketEvents.CLEANUP_COMPLETE, {});
    }
  }

  /**
   * Setup event handlers for a socket
   * @param {SessionSocket} socket - Socket.IO connection
   */
  setupSocketHandlers(socket: SessionSocket): void {
    if (handledSockets.has(socket.id)) {
      return;
    }

    handledSockets.add(socket.id);

    socket.on(SocketEvents.DISCONNECT, () => {
      handledSockets.delete(socket.id);
    });

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
export const compileHandler = new CompileWebSocketHandler(
  compilationService,
  sessionService,
  webSocketManager
);
