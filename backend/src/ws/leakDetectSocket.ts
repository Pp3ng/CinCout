/**
 * Socket.IO handler for memory leak detection
 * Implements Valgrind-based memory checking with WebSocket communication
 */
import {
  ICompilationService,
  ISessionService,
  IWebSocketManager,
  SessionSocket,
  CompilationEnvironment,
} from "../types";
import { compilationService } from "../utils/compilationService";
import { sessionService } from "../utils/sessionService";
import { webSocketManager, SocketEvents, BaseSocketHandler } from "./webSocketManager";
import path from "path";
import fs from "fs-extra";

/**
 * LeakDetectWebSocketHandler handles memory leak detection using Valgrind
 * This class follows the pattern of the existing CompileWebSocketHandler
 */
export class LeakDetectWebSocketHandler extends BaseSocketHandler {
  /**
   * Create a new LeakDetectWebSocketHandler
   * @param compilationService - Compilation service
   * @param sessionService - Session service
   * @param webSocketManager - WebSocket manager
   */
  constructor(
    compilationService: ICompilationService,
    sessionService: ISessionService,
    webSocketManager: IWebSocketManager
  ) {
    super(compilationService, sessionService, webSocketManager);
  }

  /**
   * Handle leak detection requests
   * @param {SessionSocket} socket - Socket.IO connection
   * @param {any} data - Leak detection request data
   */
  handleLeakDetectRequest(
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
      this.emitToClient(socket, SocketEvents.LEAK_CHECK_COMPILING, {});

      // Compile the code with debug info for better Valgrind output
      this.compileCodeForLeakCheck(socket, env, code, {
        lang,
        compiler,
        optimization,
      });
    } catch (error) {
      this.emitToClient(socket, SocketEvents.LEAK_CHECK_ERROR, {
        message: "Error setting up leak detection: " + (error as Error).message,
      });
      env.tmpDir.removeCallback();
    }
  }

  /**
   * Compile code with debug info for leak checking
   * @param socket - Socket.IO connection
   * @param env - Compilation environment
   * @param code - Source code
   * @param options - Compilation options
   * @private
   */
  private compileCodeForLeakCheck(
    socket: SessionSocket,
    env: CompilationEnvironment,
    code: string,
    options: { lang: string; compiler?: string; optimization?: string }
  ): void {
    this.compilationService
      .compileCode(env, code, {
        ...options,
        // Add debug info for better Valgrind output
        // Allow user's optimization level to be used
      })
      .then((result) => {
        if (result.success) {
          // Start a special leak detection session
          this.startLeakDetectionSession(socket, env);
        } else {
          this.emitToClient(socket, SocketEvents.LEAK_CHECK_ERROR, {
            output: result.error,
          });
          env.tmpDir.removeCallback();
        }
      })
      .catch((error) => {
        this.emitToClient(socket, SocketEvents.LEAK_CHECK_ERROR, {
          message: "Unexpected error: " + (error as Error).message,
        });
        env.tmpDir.removeCallback();
      });
  }

  /**
   * Start a leak detection session
   * @param socket - Socket.IO connection
   * @param env - Compilation environment
   * @private
   */
  private startLeakDetectionSession(
    socket: SessionSocket,
    env: CompilationEnvironment
  ): void {
    const valgrindLogFile = path.join(env.tmpDir.name, "valgrind.log");

    // Let the client know we're running leak detection
    this.emitToClient(socket, SocketEvents.LEAK_CHECK_RUNNING, {});

    // Create a session for running the program with Valgrind
    const sessionId = socket.sessionId;
    const cols = 80;
    const rows = 24;

    try {
      // Build Valgrind command
      const valgrindCmd = `valgrind --tool=memcheck --leak-check=full --show-leak-kinds=all --track-origins=yes --log-file="${valgrindLogFile}" "${env.outputFile}"`;

      // Create PTY instance
      const ptyProcess = sessionService["createPtyProcess"](valgrindCmd, {
        name: "xterm-256color",
        cols: cols,
        rows: rows,
        cwd: env.tmpDir.name,
        env: {
          ...(process.env as { [key: string]: string }),
          TERM: "xterm-256color",
        },
      });

      // Store session
      sessionService["sessions"].set(sessionId, {
        pty: ptyProcess,
        tmpDir: env.tmpDir,
        lastActivity: Date.now(),
        dimensions: { cols, rows },
        sessionType: "leak_detection",
        socketId: socket.id,
      });

      // Handle PTY output
      ptyProcess.onData((data: string) => {
        try {
          // Update last activity timestamp
          sessionService["updateSessionActivity"](sessionId);

          // Send output to client
          this.emitToClient(socket, SocketEvents.OUTPUT, {
            output: data,
          });
        } catch (e) {
          console.error(
            `Error sending output for leak detection session ${sessionId}:`,
            e
          );
        }
      });

      // Handle PTY exit
      ptyProcess.onExit(({ exitCode }) => {
        try {
          this.processLeakDetectionResults(socket, valgrindLogFile, exitCode);
        } catch (e) {
          console.error(
            `Error processing leak detection exit for session ${sessionId}:`,
            e
          );
          this.emitToClient(socket, SocketEvents.LEAK_CHECK_ERROR, {
            message:
              "Error processing leak detection results: " +
              (e as Error).message,
          });
        } finally {
          // Always clean up
          this.cleanupSession(sessionId);
        }
      });
    } catch (error) {
      console.error(
        `Error creating PTY for leak detection session ${sessionId}:`,
        error
      );
      this.emitToClient(socket, SocketEvents.LEAK_CHECK_ERROR, {
        message: `Error executing leak detection: ${(error as Error).message}`,
      });
      env.tmpDir.removeCallback();
    }
  }

  /**
   * Process Valgrind leak detection results
   * @param socket - Socket.IO connection
   * @param valgrindLogFile - Path to Valgrind log file
   * @param exitCode - Exit code of the Valgrind process
   * @private
   */
  private processLeakDetectionResults(
    socket: SessionSocket,
    valgrindLogFile: string,
    exitCode: number
  ): void {
    try {
      if (fs.existsSync(valgrindLogFile)) {
        // Read Valgrind log
        const valgrindOutput = fs.readFileSync(valgrindLogFile, "utf8");

        // Extract important information
        let report = "";
        const lines = valgrindOutput.split("\n");
        let startReading = false;

        for (const line of lines) {
          if (line.includes("HEAP SUMMARY:")) {
            startReading = true;
          }

          if (
            startReading &&
            line.trim() !== "" &&
            !line.includes("For lists of")
          ) {
            report += line + "\n";
          }
        }

        // Format report
        const formattedReport = compilationService["formatOutput"](
          report,
          "memcheck"
        );

        // Send report to client
        this.emitToClient(socket, SocketEvents.LEAK_CHECK_REPORT, {
          report: formattedReport,
          exitCode: exitCode,
        });
      } else {
        this.emitToClient(socket, SocketEvents.LEAK_CHECK_ERROR, {
          message: "Valgrind log file not found after execution",
        });
      }
    } catch (error) {
      this.emitToClient(socket, SocketEvents.LEAK_CHECK_ERROR, {
        message:
          "Error processing leak detection results: " +
          (error as Error).message,
      });
    }
  }

  /**
   * Handle sending input to a running program during leak detection
   * @param {SessionSocket} socket - Socket.IO connection
   * @param {any} data - Input data
   */
  handleInput(socket: SessionSocket, data: { input: string }): void {
    const sessionId = socket.sessionId;
    const session = this.sessionService.getSession(sessionId);

    // Only process input for leak detection sessions
    if (session && session.sessionType === "leak_detection") {
      if (!this.sessionService.sendInputToSession(sessionId, data.input)) {
        this.emitToClient(socket, SocketEvents.LEAK_CHECK_ERROR, {
          message: "No active leak detection session to receive input",
        });
      }
    }
  }

  /**
   * Handle cleanup request
   * @param {SessionSocket} socket - Socket.IO connection
   */
  protected handleCleanupRequest(socket: SessionSocket): void {
    this.handleCleanup(socket, "leak_detection");
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
      SocketEvents.LEAK_CHECK,
      (data: {
        code: string;
        lang: string;
        compiler?: string;
        optimization?: string;
      }) => {
        this.handleLeakDetectRequest(socket, data);
      }
    );

    socket.on(SocketEvents.INPUT, (data: { input: string }) => {
      this.handleInput(socket, data);
    });
  }
}

// Create singleton instance with dependencies
export const leakDetectHandler = new LeakDetectWebSocketHandler(
  compilationService,
  sessionService,
  webSocketManager
);
