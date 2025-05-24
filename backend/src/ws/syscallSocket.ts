/**
 * Socket.IO handler for system call tracing
 * Implements strace-based syscall tracing with WebSocket communication
 */
import {
  ICodeProcessingService,
  ISessionService,
  IWebSocketManager,
  SessionSocket,
  CompilationEnvironment,
} from "../types";
import { codeProcessingService } from "../utils/codeProcessingService";
import { sessionService } from "../utils/sessionService";
import {
  webSocketManager,
  SocketEvents,
  BaseSocketHandler,
  socketEvents,
} from "./webSocketManager";
import fs from "fs-extra";

/**
 * SyscallWebSocketHandler handles system call tracing with strace
 * This class follows the pattern of the LeakDetectWebSocketHandler
 */
export class SyscallWebSocketHandler extends BaseSocketHandler {
  /**
   * Create a new SyscallWebSocketHandler
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
   * Handle strace session requests
   * @param {SessionSocket} socket - Socket.IO connection
   * @param {any} data - Strace request data
   */
  handleStraceRequest(
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
      this.webSocketManager.emitToClient(socket, SocketEvents.COMPILING, {});

      // Compile the code for syscall tracing
      this.compileCodeForSyscallTracing(socket, env, code, {
        lang,
        compiler,
        optimization: optimization || "-O0",
      });
    } catch (error) {
      this.webSocketManager.emitToClient(socket, SocketEvents.STRACE_ERROR, {
        message:
          "Error setting up syscall tracing: " + (error as Error).message,
      });
      env.tmpDir.removeCallback();
    }
  }

  /**
   * Compile code for syscall tracing
   * @param socket - Socket.IO connection
   * @param env - Compilation environment
   * @param code - Source code
   * @param options - Compilation options
   * @private
   */
  private compileCodeForSyscallTracing(
    socket: SessionSocket,
    env: CompilationEnvironment,
    code: string,
    options: { lang: string; compiler?: string; optimization?: string }
  ): void {
    this.compilationService
      .prepareSyscallTracing(env, code, options)
      .then((result) => {
        if (result.success) {
          // Signal to client
          this.webSocketManager.emitToClient(
            socket,
            SocketEvents.COMPILE_SUCCESS,
            {}
          );

          // Execute a special syscall tracing session
          this.executeSyscallTracingSession(socket, env, result.straceLogFile!);
        } else {
          this.webSocketManager.emitToClient(
            socket,
            SocketEvents.STRACE_ERROR,
            {
              output: result.error,
            }
          );
          env.tmpDir.removeCallback();
        }
      })
      .catch((error) => {
        this.webSocketManager.emitToClient(socket, SocketEvents.STRACE_ERROR, {
          message: "Unexpected error: " + (error as Error).message,
        });
        env.tmpDir.removeCallback();
      });
  }

  /**
   * Execute a syscall tracing session
   * @param socket - Socket.IO connection
   * @param env - Compilation environment
   * @param straceLogFile - Path to the strace log file
   * @private
   */
  private executeSyscallTracingSession(
    socket: SessionSocket,
    env: CompilationEnvironment,
    straceLogFile: string
  ): void {
    // Create a session for running the program with strace
    const sessionId = socket.sessionId;

    try {
      // Set up handler for strace session exit event
      socketEvents.once(
        "strace-session-exit",
        ({
          sessionId: sid,
          straceLogFile: logFile,
          exitCode,
        }: {
          sessionId: string;
          socketId: string;
          straceLogFile: string;
          exitCode: number;
        }) => {
          if (sid === sessionId) {
            try {
              this.processSyscallTracingResults(socket, logFile, exitCode);
            } catch (e) {
              console.error(
                `Error processing strace exit for session ${sessionId}:`,
                e
              );
              this.webSocketManager.emitToClient(
                socket,
                SocketEvents.STRACE_ERROR,
                {
                  message:
                    "Error processing strace results: " + (e as Error).message,
                }
              );
            } finally {
              // Always clean up
              this.cleanupSession(sessionId);
            }
          }
        }
      );

      // Use sessionService to execute the strace session
      if (
        !this.sessionService.executeStraceSession(
          socket,
          sessionId,
          env.tmpDir,
          env.outputFile,
          straceLogFile
        )
      ) {
        throw new Error("Failed to execute strace session");
      }
    } catch (error) {
      console.error(`Error creating strace session ${sessionId}:`, error);
      this.webSocketManager.emitToClient(socket, SocketEvents.STRACE_ERROR, {
        message: `Error executing strace: ${(error as Error).message}`,
      });
      env.tmpDir.removeCallback();
    }
  }

  /**
   * Process strace results
   * @param socket - Socket.IO connection
   * @param straceLogFile - Path to strace log file
   * @param exitCode - Exit code of the strace process
   * @private
   */
  private processSyscallTracingResults(
    socket: SessionSocket,
    straceLogFile: string,
    exitCode: number
  ): void {
    try {
      if (fs.existsSync(straceLogFile)) {
        // Read strace log
        const straceOutput = fs.readFileSync(straceLogFile, "utf8");

        // Check if file has content
        if (!straceOutput || straceOutput.trim().length === 0) {
          console.error("Strace log file is empty");
          this.webSocketManager.emitToClient(
            socket,
            SocketEvents.STRACE_ERROR,
            {
              message:
                "No system call information captured. The program may have failed to execute properly.",
            }
          );
          return;
        }

        // Send report to client - this will cause the frontend to disconnect
        this.webSocketManager.emitToClient(socket, SocketEvents.STRACE_REPORT, {
          report: straceOutput,
          exitCode: exitCode,
        });
      } else {
        console.error(`Strace log file not found: ${straceLogFile}`);
        this.webSocketManager.emitToClient(socket, SocketEvents.STRACE_ERROR, {
          message: "Strace log file not found after execution",
        });
      }
    } catch (error) {
      console.error("Error processing strace results:", error);
      this.webSocketManager.emitToClient(socket, SocketEvents.STRACE_ERROR, {
        message: "Error processing strace results: " + (error as Error).message,
      });
    }
  }

  /**
   * Handle sending input to a running program during syscall tracing
   * @param {SessionSocket} socket - Socket.IO connection
   * @param {any} data - Input data
   */
  handleInput(socket: SessionSocket, data: { input: string }): void {
    const sessionId = socket.sessionId;
    const session = this.sessionService.getSession(sessionId);

    // Only process input for strace sessions
    if (session && session.sessionType === "strace") {
      if (!this.sessionService.sendInputToSession(sessionId, data.input)) {
        this.webSocketManager.emitToClient(socket, SocketEvents.STRACE_ERROR, {
          message: "No active strace session to receive input",
        });
      }
    }
  }

  /**
   * Handle cleanup request
   * @param {SessionSocket} socket - Socket.IO connection
   */
  protected handleCleanupRequest(socket: SessionSocket): void {
    this.handleCleanup(socket, "strace");
  }

  /**
   * Setup event handlers for a socket
   * @param {SessionSocket} socket - Socket.IO connection
   */
  public setupSocketHandlers(socket: SessionSocket): void {
    if (!this.setupCommonHandlers(socket)) {
      return;
    }

    // Set up event handlers for strace
    socket.on(
      SocketEvents.STRACE_START,
      (data: {
        code: string;
        lang: string;
        compiler?: string;
        optimization?: string;
      }) => {
        this.handleStraceRequest(socket, data);
      }
    );

    socket.on(SocketEvents.INPUT, (data: { input: string }) => {
      this.handleInput(socket, data);
    });
  }
}

// Create singleton instance with dependencies
export const straceHandler = new SyscallWebSocketHandler(
  codeProcessingService,
  sessionService,
  webSocketManager
);
