/**
 * WebSocket handler for code compilation and execution
 */
import fs from "fs-extra";
import { WebSocketServer } from "ws";
import {
  sanitizeOutput,
  getCompilerCommand,
  getStandardOption,
  executeCommand,
  formatOutput,
} from "../utils/routeHandler";
import {
  ExtendedWebSocket,
  setupWebSocketServer,
  sendWebSocketMessage,
  webSocketEvents,
} from "../utils/webSocketHandler";

// Re-implement compilation session functions specific to this module
import * as pty from "node-pty";
import { DirResult } from "tmp";
import { createCompilationEnvironment } from "../utils/sessionManager";

// Map to store active compilation sessions
const activeCompilationSessions = new Map();

// Interface for compilation session
interface CompilationSession {
  pty: pty.IPty;
  tmpDir: DirResult;
  lastActivity: number;
  dimensions: { cols: number; rows: number };
}

// Compile and run code with PTY for true terminal experience
const compileAndRunWithPTY = (
  ws: ExtendedWebSocket,
  sessionId: string,
  code: string,
  lang: string,
  compiler?: string,
  optimization?: string
): void => {
  // Create compilation environment
  const { tmpDir, sourceFile, outputFile } = createCompilationEnvironment(lang);

  try {
    // Write code to temporary file
    fs.writeFileSync(sourceFile, code);

    // Notify client that compilation has started
    sendWebSocketMessage(ws, { type: "compiling" });

    // Determine compiler options
    const compilerCmd = getCompilerCommand(lang, compiler);
    const standardOption = getStandardOption(lang);
    const optimizationOption = optimization || "-O0";

    // Compile command - no resource limiting
    const compileCmd = `${compilerCmd} ${standardOption} ${optimizationOption} "${sourceFile}" -o "${outputFile}"`;

    // Execute compilation
    executeCommand(compileCmd)
      .then(() => {
        // Compilation successful, notify client
        sendWebSocketMessage(ws, { type: "compile-success" });

        // Start compilation session with PTY
        const success = startCompilationSession(
          ws,
          sessionId,
          tmpDir,
          outputFile
        );

        if (!success) {
          // Clean up on PTY creation error
          tmpDir.removeCallback();
        }
      })
      .catch((error) => {
        // Compilation error
        console.error(`Compilation error for session ${sessionId}:`, error);
        const sanitizedError = sanitizeOutput(error as string) || error;
        // Apply formatting for compiler errors
        const formattedError = formatOutput(
          sanitizedError.toString(),
          "default"
        );

        sendWebSocketMessage(ws, {
          type: "compile-error",
          output: formattedError,
        });

        // Clean up temporary directory
        tmpDir.removeCallback();
      });
  } catch (error) {
    console.error(
      `Error setting up compilation for session ${sessionId}:`,
      error
    );
    sendWebSocketMessage(ws, {
      type: "error",
      message: "Error setting up compilation: " + (error as Error).message,
    });

    // Clean up temporary directory
    tmpDir.removeCallback();
  }
};

// Start a compilation session
const startCompilationSession = (
  ws: ExtendedWebSocket,
  sessionId: string,
  tmpDir: DirResult,
  outputFile: string
): boolean => {
  try {
    // Set standard terminal size: 80 columns, 24 rows
    const cols = 80;
    const rows = 24;

    // Create PTY instance with correct terminal type and size
    const ptyProcess = createPtyProcess(`"${outputFile}"`, {
      name: "xterm-256color",
      cols: cols,
      rows: rows,
      cwd: tmpDir.name,
      env: {
        ...(process.env as { [key: string]: string }),
        TERM: "xterm-256color",
      },
    });

    // Store PTY process and temporary directory
    activeCompilationSessions.set(sessionId, {
      pty: ptyProcess,
      tmpDir: tmpDir,
      lastActivity: Date.now(),
      dimensions: { cols, rows },
    });

    // Handle PTY output
    ptyProcess.onData((data: string) => {
      try {
        // Update last activity timestamp
        const session = activeCompilationSessions.get(sessionId);
        if (session) {
          session.lastActivity = Date.now();
        }

        // Send output to client without any filtering
        // PTY will handle echo correctly
        sendWebSocketMessage(ws, {
          type: "output",
          output: data,
          timestamp: Date.now(),
        });
      } catch (e) {
        console.error(`Error sending output for session ${sessionId}:`, e);
      }
    });

    // Handle PTY exit
    ptyProcess.onExit(({ exitCode }) => {
      try {
        // Send exit notification
        sendWebSocketMessage(ws, {
          type: "exit",
          code: exitCode,
          timestamp: Date.now(),
        });

        // Clean up
        cleanupCompilationSession(sessionId);
      } catch (e) {
        console.error(`Error processing exit for session ${sessionId}:`, e);
        // Always clean up
        cleanupCompilationSession(sessionId);
      }
    });

    return true;
  } catch (ptyError) {
    console.error(`Error creating PTY for session ${sessionId}:`, ptyError);
    sendWebSocketMessage(ws, {
      type: "error",
      output: `Error executing program: ${(ptyError as Error).message}`,
    });

    return false;
  }
};

// Create a PTY instance
const createPtyProcess = (
  command: string,
  options: pty.IPtyForkOptions = {}
): pty.IPty => {
  const defaultOptions: pty.IPtyForkOptions = {
    name: "xterm-256color",
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
    env: process.env as { [key: string]: string }, // Type assertion
  };

  const ptyOptions = { ...defaultOptions, ...options };

  return pty.spawn("bash", ["-c", command], ptyOptions);
};

// Clean up compilation session resources
const cleanupCompilationSession = (sessionId: string): void => {
  const session = activeCompilationSessions.get(sessionId);
  if (session) {
    if (session.tmpDir) {
      try {
        // Force removal of temporary directory
        session.tmpDir.removeCallback();
      } catch (e) {
        console.error(
          `Error removing temporary directory for session ${sessionId}:`,
          e
        );
        // Try a different approach if the callback method fails
        try {
          const { exec } = require("child_process");
          exec(`rm -rf "${session.tmpDir.name}"`, (err: Error) => {
            if (err) {
              console.error(
                `Failed to forcefully remove temp dir ${session.tmpDir.name}:`,
                err
              );
            }
          });
        } catch (execErr) {
          console.error(`Failed to execute rm command:`, execErr);
        }
      }
    }

    // Always remove the session from active sessions map
    activeCompilationSessions.delete(sessionId);
  }
};

// Terminate a specific compilation session
const terminateCompilationSession = (sessionId: string): void => {
  const session = activeCompilationSessions.get(sessionId);
  if (session) {
    try {
      if (session.pty) {
        // Force kill the process to ensure it's terminated
        try {
          // SIGKILL is more forceful than the default termination signal
          session.pty.kill("SIGKILL");

          // Clean up resources immediately
          cleanupCompilationSession(sessionId);
        } catch (e) {
          console.error(`Error killing process for session ${sessionId}:`, e);
          // Still try to clean up even if kill failed
          cleanupCompilationSession(sessionId);
        }
      } else {
        // No PTY process, just clean up
        cleanupCompilationSession(sessionId);
      }
    } catch (e) {
      console.error(
        `Error during process termination for session ${sessionId}:`,
        e
      );
      // Always clean up the session even if termination failed
      cleanupCompilationSession(sessionId);
    }
  }
};

// Send input to a running compilation session
const sendInputToCompilationSession = (
  sessionId: string,
  input: string
): boolean => {
  const session = activeCompilationSessions.get(sessionId);
  if (session && session.pty) {
    session.pty.write(input);
    // Update last activity time
    session.lastActivity = Date.now();
    return true;
  }
  return false;
};

// Resize terminal dimensions for a compilation session
const resizeCompilationTerminal = (
  sessionId: string,
  cols: number,
  rows: number
): boolean => {
  // Input validation
  if (typeof cols !== "number" || typeof rows !== "number") {
    console.error(`Invalid terminal dimensions: cols=${cols}, rows=${rows}`);
    return false;
  }

  // Ensure integer values and reasonable bounds
  cols = Math.floor(cols);
  rows = Math.floor(rows);

  // Ensure minimum dimensions to prevent errors
  cols = Math.max(2, cols);
  rows = Math.max(1, rows);

  const session = activeCompilationSessions.get(sessionId);
  if (session && session.pty) {
    try {
      // Only resize if dimensions actually changed
      if (
        session.dimensions.cols !== cols ||
        session.dimensions.rows !== rows
      ) {
        session.pty.resize(cols, rows);
        session.dimensions = { cols, rows };
        return true;
      }
      return true; // Already at requested size
    } catch (e) {
      console.error(`Error resizing terminal for session ${sessionId}:`, e);
      return false;
    }
  } else if (!session) {
    console.warn(`Resize requested for non-existent session: ${sessionId}`);
  } else if (!session.pty) {
    console.warn(`Resize requested for session ${sessionId} with no PTY`);
  }
  return false;
};

// Message handler for WebSocket connections
const handleCompileWebSocketMessage = (
  ws: ExtendedWebSocket,
  data: any
): void => {
  const sessionId = ws.sessionId;

  if (!sessionId) {
    sendWebSocketMessage(ws, {
      type: "error",
      message: "Session ID not found",
    });
    return;
  }

  try {
    switch (data.type) {
      case "compile":
        // Compile and run code using PTY
        compileAndRunWithPTY(
          ws,
          sessionId,
          data.code,
          data.lang,
          data.compiler,
          data.optimization
        );
        break;

      case "input":
        // Send user input to the program
        if (!sendInputToCompilationSession(sessionId, data.input)) {
          sendWebSocketMessage(ws, {
            type: "error",
            message: "No active compilation session to receive input",
          });
        }
        break;

      case "resize":
        // Handle terminal resize request
        if (data.cols && data.rows) {
          resizeCompilationTerminal(sessionId, data.cols, data.rows);
        }
        break;

      case "cleanup":
        // Handle explicit cleanup request
        if (activeCompilationSessions.has(sessionId)) {
          // The session will be terminated through the event listener
          ws.close();
          sendWebSocketMessage(ws, {
            type: "cleanup-complete",
          });
        }
        break;

      default:
        sendWebSocketMessage(ws, {
          type: "error",
          message: "Unknown action type: " + data.type,
        });
        break;
    }
  } catch (error) {
    console.error("Error processing message:", error);
    sendWebSocketMessage(ws, {
      type: "error",
      message: "Error processing request: " + (error as Error).message,
    });
  }
};

// Setup WebSocket close event listener for cleanup
webSocketEvents.on("websocket-close", ({ sessionId }) => {
  if (activeCompilationSessions.has(sessionId)) {
    terminateCompilationSession(sessionId);
  }
});

// Setup WebSocket handlers for compilation
const setupCompileWebSocketHandlers = (wss: WebSocketServer): void => {
  setupWebSocketServer(wss, handleCompileWebSocketMessage);
};

export { setupCompileWebSocketHandlers };
