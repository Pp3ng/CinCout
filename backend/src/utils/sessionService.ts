/**
 * Session Service
 * Centralizes all session and process management for the application
 */
import * as pty from "node-pty";
import { DirResult } from "tmp";
import { v4 as uuidv4 } from "uuid";
import { Socket } from "socket.io";
import {
  ISessionService,
  Session,
  SessionSocket,
  SocketEvents,
} from "../types";
import { socketEvents, webSocketManager } from "./webSocketHandler";

/**
 * Session Service Implementation
 * Manages all PTY sessions and their lifecycle
 */
export class SessionService implements ISessionService {
  private sessions: Map<string, Session>;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly maxSessionAge: number; // in milliseconds

  /**
   * Create a new SessionService
   * @param {number} maxSessionAgeMinutes - Maximum session age in minutes
   */
  constructor(maxSessionAgeMinutes: number = 30) {
    this.sessions = new Map<string, Session>();
    this.maxSessionAge = maxSessionAgeMinutes * 60 * 1000;
  }

  /**
   * Initialize session service
   * Sets up event listeners and other global configurations
   */
  initSessionService(): void {
    // Clean up sessions when sockets disconnect
    socketEvents.on("socket-disconnect", ({ sessionId }) => {
      if (sessionId && this.sessions.has(sessionId)) {
        this.terminateSession(sessionId);
      }
    });

    // Set up interval to clean up stale sessions
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSessions();
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  /**
   * Create a PTY instance with standardized options
   * @param {string} command - Command to execute
   * @param {pty.IPtyForkOptions} options - Additional PTY options
   * @returns {pty.IPty} PTY process
   */
  private createPtyProcess(
    command: string,
    options: pty.IPtyForkOptions = {}
  ): pty.IPty {
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

    try {
      return pty.spawn("/bin/sh", ["-c", command], ptyOptions);
    } catch (error) {
      console.error("Error creating PTY process:", error);
      throw new Error(`Failed to create PTY process: ${error}`);
    }
  }

  /**
   * Start a new compilation session
   * @param {Socket} socket - Socket.IO connection
   * @param {string} sessionId - Session ID
   * @param {DirResult} tmpDir - Temporary directory
   * @param {string} outputFile - Path to compiled executable
   * @returns {boolean} Success status
   */
  startCompilationSession(
    socket: Socket,
    sessionId: string,
    tmpDir: DirResult,
    outputFile: string
  ): boolean {
    try {
      // Set standard terminal size
      const cols = 80;
      const rows = 24;

      // Create PTY instance
      const ptyProcess = this.createPtyProcess(`"${outputFile}"`, {
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
      this.sessions.set(sessionId, {
        pty: ptyProcess,
        tmpDir: tmpDir,
        lastActivity: Date.now(),
        dimensions: { cols, rows },
        sessionType: "compilation",
        socketId: socket.id,
      });

      // Handle PTY output
      ptyProcess.onData((data: string) => {
        try {
          // Update last activity timestamp
          this.updateSessionActivity(sessionId);

          // Send output to client
          webSocketManager.emitToClient(socket, SocketEvents.OUTPUT, {
            output: data,
          });
        } catch (e) {
          console.error(`Error sending output for session ${sessionId}:`, e);
        }
      });

      // Handle PTY exit
      ptyProcess.onExit(({ exitCode }) => {
        try {
          // Send exit notification with enhanced information
          webSocketManager.emitToClient(socket, SocketEvents.EXIT, {
            code: exitCode,
            success: exitCode === 0,
          });

          // Clean up
          this.cleanupSession(sessionId);
        } catch (e) {
          console.error(`Error processing exit for session ${sessionId}:`, e);
          // Always clean up
          this.cleanupSession(sessionId);
        }
      });

      return true;
    } catch (ptyError) {
      console.error(`Error creating PTY for session ${sessionId}:`, ptyError);
      webSocketManager.emitToClient(socket, SocketEvents.ERROR, {
        message: `Error executing program: ${(ptyError as Error).message}`,
      });

      return false;
    }
  }

  /**
   * Start a new debug session with GDB
   * @param {Socket} socket - Socket.IO connection
   * @param {string} sessionId - Session ID
   * @param {DirResult} tmpDir - Temporary directory
   * @param {string} outputFile - Path to compiled executable
   * @returns {boolean} Success status
   */
  startDebugSession(
    socket: Socket,
    sessionId: string,
    tmpDir: DirResult,
    outputFile: string
  ): boolean {
    try {
      // Set standard terminal size
      const cols = 80;
      const rows = 24;

      // Create PTY instance with GDB - use quiet mode for cleaner output
      const ptyProcess = this.createPtyProcess(
        `gdb -q -ex "set disable-randomization off" "${outputFile}"`,
        {
          name: "xterm-256color",
          cols: cols,
          rows: rows,
          cwd: tmpDir.name,
          env: {
            ...(process.env as { [key: string]: string }),
            TERM: "xterm-256color",
          },
        }
      );

      // Store session with debug flag
      this.sessions.set(sessionId, {
        pty: ptyProcess,
        tmpDir: tmpDir,
        lastActivity: Date.now(),
        dimensions: { cols, rows },
        sessionType: "debug",
        socketId: socket.id,
        isDebugSession: true,
      });

      // Handle PTY output
      ptyProcess.onData((data: string) => {
        try {
          // Update last activity timestamp
          this.updateSessionActivity(sessionId);

          const filteredData = data
            // remove reading symbols messages
            .replace(/Reading symbols from .*\.\.\.([\r\n]|\s)*/g, "")
            // replace temporary path with a simplified version
            .replace(/\/tmp\/CinCout-[^\/]*\/([^.:]+)/g, "$1");

          // Send filtered output to client
          webSocketManager.emitToClient(socket, SocketEvents.DEBUG_RESPONSE, {
            output: filteredData,
          });
        } catch (e) {
          console.error(
            `Error sending debug output for session ${sessionId}:`,
            e
          );
        }
      });

      // Handle PTY exit
      ptyProcess.onExit(({ exitCode }) => {
        try {
          // Send exit notification with enhanced information
          webSocketManager.emitToClient(socket, SocketEvents.DEBUG_EXIT, {
            code: exitCode,
            success: exitCode === 0,
          });

          // Clean up
          this.cleanupSession(sessionId);
        } catch (e) {
          console.error(
            `Error processing exit for debug session ${sessionId}:`,
            e
          );
          // Always clean up
          this.cleanupSession(sessionId);
        }
      });

      // Send some initial commands to GDB to make it more user-friendly
      setTimeout(() => {
        try {
          // Enable pretty printing of structures
          ptyProcess.write("set print pretty on\n");
          // Set pagination off to avoid pauses
          ptyProcess.write("set pagination off\n");
          // Show source code
          ptyProcess.write("list\n");
          // Set a breakpoint at main
          ptyProcess.write("break main\n");
        } catch (e) {
          console.error(
            `Error sending initial GDB commands for session ${sessionId}:`,
            e
          );
        }
      }, 500);

      return true;
    } catch (ptyError) {
      console.error(`Error creating GDB session ${sessionId}:`, ptyError);
      webSocketManager.emitToClient(socket, SocketEvents.DEBUG_ERROR, {
        message: `Error starting GDB debugger: ${(ptyError as Error).message}`,
      });

      return false;
    }
  }

  /**
   * Create a new session for a socket
   * @param {Socket} socket - Socket.IO socket
   * @returns {string} Generated session ID
   */
  createSession(socket: Socket): string {
    const sessionId = uuidv4();
    (socket as SessionSocket).sessionId = sessionId;

    // Notify the client of the new session
    webSocketManager.emitToClient(socket, SocketEvents.SESSION_CREATED, {
      sessionId,
    });

    return sessionId;
  }

  /**
   * Send input to a running session
   * @param {string} sessionId - Session ID
   * @param {string} input - Input to send
   * @returns {boolean} Success status
   */
  sendInputToSession(sessionId: string, input: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session && session.pty) {
      try {
        session.pty.write(input);
        this.updateSessionActivity(sessionId);
        return true;
      } catch (e) {
        console.error(`Error sending input to session ${sessionId}:`, e);
      }
    }
    return false;
  }

  /**
   * Update session activity timestamp
   * @param {string} sessionId - Session ID
   */
  private updateSessionActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  /**
   * Resize terminal dimensions for a session
   * @param {string} sessionId - Session ID
   * @param {number} cols - Number of columns
   * @param {number} rows - Number of rows
   * @returns {boolean} Success status
   */
  resizeTerminal(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      // Session not found - likely already terminated
      return false;
    }

    if (!session.pty) {
      // Session exists but no PTY attached
      return false;
    }

    try {
      // Update terminal dimensions
      session.pty.resize(cols, rows);

      // Update session dimensions
      session.dimensions = { cols, rows };

      // Update session activity
      this.updateSessionActivity(sessionId);
      return true;
    } catch (e) {
      console.error(`Error resizing terminal for session ${sessionId}:`, e);
      return false;
    }
  }

  /**
   * Terminate a session
   * @param {string} sessionId - Session ID
   */
  terminateSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        if (session.pty) {
          try {
            session.pty.kill("SIGKILL");
          } catch (e) {
            console.error(`Error killing process for session ${sessionId}:`, e);
          }
        }
        this.cleanupSession(sessionId);
      } catch (e) {
        console.error(`Error terminating session ${sessionId}:`, e);
        this.cleanupSession(sessionId);
      }
    }
  }

  /**
   * Clean up session resources
   * @param {string} sessionId - Session ID
   */
  private cleanupSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      if (session.tmpDir) {
        try {
          session.tmpDir.removeCallback();
        } catch (e) {
          try {
            const { exec } = require("child_process");
            exec(`rm -rf "${session.tmpDir.name}"`);
          } catch {
            console.error(
              `Failed to forcefully remove temp dir ${session.tmpDir.name}:`
            );
          }
        }
      }

      // Remove session from the map
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Clean up stale sessions
   * @private
   */
  private cleanupStaleSessions(): void {
    const now = Date.now();

    this.sessions.forEach((session, sessionId) => {
      if (now - session.lastActivity > this.maxSessionAge) {
        console.log(
          `Cleaning up stale session ${sessionId} after ${this.maxSessionAge}ms of inactivity`
        );
        this.terminateSession(sessionId);
      }
    });
  }

  /**
   * Get all active sessions
   * @returns {Map<string, Session>} Map of active sessions
   */
  getActiveSessions(): Map<string, Session> {
    return this.sessions;
  }

  /**
   * Get a specific session
   * @param {string} sessionId - Session ID
   * @returns {Session | undefined} Session or undefined if not found
   */
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }
}

// Create singleton instance
export const sessionService = new SessionService();
