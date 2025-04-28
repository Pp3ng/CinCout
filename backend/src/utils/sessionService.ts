/**
 * Session Service
 * Centralizes all session and process management for the application
 */
import * as pty from "node-pty";
import { DirResult } from "tmp";
import { Session } from "../types";
import {
  sendWebSocketMessage,
  webSocketEvents,
  ExtendedWebSocket,
} from "./webSocketHandler";

// Store active sessions with structured type information
const activeSessions = new Map<string, Session>();

/**
 * Initialize session service
 * Sets up event listeners and other global configurations
 */
export const initSessionService = (): void => {
  // Set up WebSocket close event listener
  webSocketEvents.on("websocket-close", ({ sessionId }) => {
    if (activeSessions.has(sessionId)) {
      terminateSession(sessionId);
    }
  });

  // Set up interval to clean up stale sessions
  setInterval(() => {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    activeSessions.forEach((session, sessionId) => {
      if (now - session.lastActivity > maxAge) {
        console.log(
          `Cleaning up stale session ${sessionId} after ${maxAge}ms of inactivity`
        );
        terminateSession(sessionId);
      }
    });
  }, 5 * 60 * 1000); // Check every 5 minutes
};

/**
 * Create a PTY instance with standardized options
 * @param {string} command - Command to execute
 * @param {pty.IPtyForkOptions} options - Additional PTY options
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
    env: {
      ...(process.env as { [key: string]: string }),
      TERM: "xterm-256color",
    },
  };

  const ptyOptions = { ...defaultOptions, ...options };

  return pty.spawn("/bin/sh", ["-c", command], ptyOptions);
};

/**
 * Start a new compilation session
 * @param {ExtendedWebSocket} ws - WebSocket connection
 * @param {string} sessionId - Session ID
 * @param {DirResult} tmpDir - Temporary directory
 * @param {string} outputFile - Path to compiled executable
 * @returns {boolean} Success status
 */
export const startCompilationSession = (
  ws: ExtendedWebSocket,
  sessionId: string,
  tmpDir: DirResult,
  outputFile: string
): boolean => {
  try {
    // Set standard terminal size
    const cols = 80;
    const rows = 24;

    // Create PTY instance
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

    // Store session
    activeSessions.set(sessionId, {
      pty: ptyProcess,
      tmpDir: tmpDir,
      lastActivity: Date.now(),
      dimensions: { cols, rows },
      sessionType: "compilation",
    });

    // Handle PTY output
    ptyProcess.onData((data: string) => {
      try {
        // Update last activity timestamp
        updateSessionActivity(sessionId);

        // Send output to client
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
        // Send exit notification with enhanced information
        sendWebSocketMessage(ws, {
          type: "exit",
          code: exitCode,
          success: exitCode === 0,
          timestamp: Date.now(),
        });

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
    sendWebSocketMessage(ws, {
      type: "error",
      output: `Error executing program: ${(ptyError as Error).message}`,
    });

    return false;
  }
};

/**
 * Send input to a running session
 * @param {string} sessionId - Session ID
 * @param {string} input - Input to send
 * @returns {boolean} Success status
 */
export const sendInputToSession = (
  sessionId: string,
  input: string
): boolean => {
  const session = activeSessions.get(sessionId);
  if (session && session.pty) {
    try {
      session.pty.write(input);
      updateSessionActivity(sessionId);
      return true;
    } catch (e) {
      console.error(`Error sending input to session ${sessionId}:`, e);
    }
  }
  return false;
};

/**
 * Resize terminal dimensions for a session
 * @param {string} sessionId - Session ID
 * @param {number} cols - Number of columns
 * @param {number} rows - Number of rows
 * @returns {boolean} Success status
 */
export const resizeTerminal = (
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
  cols = Math.max(2, Math.floor(cols));
  rows = Math.max(1, Math.floor(rows));

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
        updateSessionActivity(sessionId);
        return true;
      }
      return true; // Already at requested size
    } catch (e) {
      console.error(`Error resizing terminal for session ${sessionId}:`, e);
    }
  }
  return false;
};

/**
 * Update session activity timestamp
 * @param {string} sessionId - Session ID
 */
export const updateSessionActivity = (sessionId: string): void => {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.lastActivity = Date.now();
  }
};

/**
 * Terminate a session
 * @param {string} sessionId - Session ID
 */
export const terminateSession = (sessionId: string): void => {
  const session = activeSessions.get(sessionId);
  if (session) {
    try {
      if (session.pty) {
        try {
          session.pty.kill("SIGKILL");
        } catch (e) {
          console.error(`Error killing process for session ${sessionId}:`, e);
        }
      }
      cleanupSession(sessionId);
    } catch (e) {
      console.error(`Error terminating session ${sessionId}:`, e);
      cleanupSession(sessionId);
    }
  }
};

/**
 * Clean up session resources
 * @param {string} sessionId - Session ID
 */
export const cleanupSession = (sessionId: string): void => {
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
 * Get all active sessions
 * @returns {Map<string, Session>} Map of active sessions
 */
export const getActiveSessions = (): Map<string, Session> => {
  return activeSessions;
};

/**
 * Get a specific session
 * @param {string} sessionId - Session ID
 * @returns {Session | undefined} Session or undefined if not found
 */
export const getSession = (sessionId: string): Session | undefined => {
  return activeSessions.get(sessionId);
};
