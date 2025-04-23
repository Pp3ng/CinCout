/**
 * Generic session management utilities
 */
import * as pty from "node-pty";
import * as path from "path";
import * as tmp from "tmp";
import { DirResult } from "tmp";
import { WebSocket } from "ws";
import { webSocketEvents } from "./webSocketHandler";

// Define session interface
export interface Session {
  pty: pty.IPty;
  tmpDir: DirResult;
  lastActivity: number;
  dimensions: { cols: number; rows: number };
}

// Store active terminal sessions
const activeSessions = new Map<string, Session>();

// Set up WebSocket close event listener
webSocketEvents.on("websocket-close", ({ sessionId }) => {
  if (activeSessions.has(sessionId)) {
    terminateSession(sessionId);
  }
});

/**
 * Terminate a specific session
 * @param {string} sessionId - ID of the session to terminate
 */
const terminateSession = (sessionId: string): void => {
  const session = activeSessions.get(sessionId);
  if (session) {
    try {
      if (session.pty) {
        // Force kill the process to ensure it's terminated
        try {
          // SIGKILL is more forceful than the default termination signal
          session.pty.kill("SIGKILL");

          // Clean up resources immediately
          cleanupSession(sessionId);
        } catch (e) {
          console.error(`Error killing process for session ${sessionId}:`, e);
          // Still try to clean up even if kill failed
          cleanupSession(sessionId);
        }
      } else {
        // No PTY process, just clean up
        cleanupSession(sessionId);
      }
    } catch (e) {
      console.error(
        `Error during process termination for session ${sessionId}:`,
        e
      );
      // Always clean up the session even if termination failed
      cleanupSession(sessionId);
    }
  }
};

/**
 * Clean up session resources
 * @param {string} sessionId - ID of the session to clean up
 */
const cleanupSession = (sessionId: string): void => {
  const session = activeSessions.get(sessionId);
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
    activeSessions.delete(sessionId);
  }
};

/**
 * Create a PTY instance
 * @param {string} command - Command to run
 * @param {pty.IPtyForkOptions} options - PTY options
 * @returns {pty.IPty} PTY process
 */
export const createPtyProcess = (
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

/**
 * Start a compilation session
 * @param {WebSocket} ws - WebSocket connection
 * @param {string} sessionId - Session ID
 * @param {DirResult} tmpDir - Temporary directory
 * @param {string} outputFile - Path to compiled executable
 */
const startCompilationSession = (
  ws: WebSocket,
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
    activeSessions.set(sessionId, {
      pty: ptyProcess,
      tmpDir: tmpDir,
      lastActivity: Date.now(),
      dimensions: { cols, rows },
    });

    // Handle PTY output
    ptyProcess.onData((data: string) => {
      try {
        // Update last activity timestamp
        const session = activeSessions.get(sessionId);
        if (session) {
          session.lastActivity = Date.now();
        }

        // Send output to client without any filtering
        // PTY will handle echo correctly
        ws.send(
          JSON.stringify({
            type: "output",
            output: data,
            timestamp: Date.now(),
          })
        );
      } catch (e) {
        console.error(`Error sending output for session ${sessionId}:`, e);
      }
    });

    // Handle PTY exit
    ptyProcess.onExit(({ exitCode }) => {
      try {
        // Send exit notification
        ws.send(
          JSON.stringify({
            type: "exit",
            code: exitCode,
            timestamp: Date.now(),
          })
        );

        // Clean up
        cleanupSession(sessionId);
      } catch (e) {
        console.error(`Error processing exit for session ${sessionId}:`, e);
        // Always clean up
        cleanupSession(sessionId);
      }
    });

    return true;
  } catch (ptyError) {
    console.error(`Error creating PTY for session ${sessionId}:`, ptyError);
    ws.send(
      JSON.stringify({
        type: "error",
        output: `Error executing program: ${(ptyError as Error).message}`,
      })
    );

    return false;
  }
};

/**
 * Send input to a running session
 * @param {string} sessionId - Session ID
 * @param {string} input - Input to send to the process
 * @param {WebSocket} ws - WebSocket connection
 * @returns {boolean} Whether the input was sent successfully
 */
const sendInputToSession = (sessionId: string, input: string): boolean => {
  const session = activeSessions.get(sessionId);
  if (session && session.pty) {
    session.pty.write(input);
    // Update last activity time
    session.lastActivity = Date.now();
    return true;
  }
  return false;
};

/**
 * Create a temporary environment for a process
 * @param {string} filePrefix - Prefix for the temporary directory
 * @returns {DirResult} Temporary directory
 */
export const createTempEnvironment = (
  filePrefix: string = "temp-"
): DirResult => {
  return tmp.dirSync({ prefix: filePrefix, unsafeCleanup: true });
};

interface CompilationEnvironment {
  tmpDir: DirResult;
  sourceFile: string;
  outputFile: string;
  asmFile: string;
}

/**
 * Create a temporary compilation environment
 * @param {string} lang - Programming language (c/cpp)
 * @returns {CompilationEnvironment} Object containing directory and file paths
 */
export const createCompilationEnvironment = (
  lang: string
): CompilationEnvironment => {
  const tmpDir = tmp.dirSync({ prefix: "CinCout-", unsafeCleanup: true });
  const sourceExtension = lang === "cpp" ? "cpp" : "c";
  const sourceFile = path.join(tmpDir.name, `program.${sourceExtension}`);
  const outputFile = path.join(tmpDir.name, "program.out");
  const asmFile = path.join(tmpDir.name, "program.s");

  return {
    tmpDir,
    sourceFile,
    outputFile,
    asmFile,
  };
};

/**
 * Resize terminal dimensions
 * @param {string} sessionId - Session ID
 * @param {number} cols - Number of columns
 * @param {number} rows - Number of rows
 * @returns {boolean} Whether resize was successful
 */
const resizeTerminal = (
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

  const session = activeSessions.get(sessionId);
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

export {
  activeSessions,
  terminateSession,
  cleanupSession,
  startCompilationSession,
  sendInputToSession,
  resizeTerminal,
};

// Export types - fix conflict by only exporting CompilationEnvironment
export type { CompilationEnvironment };
