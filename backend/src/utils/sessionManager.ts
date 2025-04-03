/**
 * Session management for terminal sessions
 */
import * as pty from 'node-pty';
import * as path from 'path';
import * as tmp from 'tmp';
import { DirResult } from 'tmp';
import { WebSocket } from 'ws';

// Define session interface
interface Session {
  pty: pty.IPty;
  tmpDir: DirResult;
  lastActivity: number;
  dimensions: { cols: number; rows: number };
}

// Store active terminal sessions
const activeSessions = new Map<string, Session>();

// Track disconnected but preserved sessions
const preservedSessions = new Map<string, Session>();

/**
 * Terminate a specific session
 * @param {string} sessionId - ID of the session to terminate
 */
function terminateSession(sessionId: string): void {
  console.log(`Terminating session ${sessionId}`);
  const session = activeSessions.get(sessionId);
  if (session) {
    try {
      if (session.pty) {
        // Force kill the process to ensure it's terminated
        try {
          session.pty.kill('SIGKILL');
        } catch (e) {
          console.error(`Error killing process for session ${sessionId}:`, e);
        }
      }
    } catch (e) {
      console.error(`Error during process termination for session ${sessionId}:`, e);
    } finally {
      // Always clean up the session even if termination failed
      cleanupSession(sessionId);
    }
  }
}

/**
 * Clean up session resources
 * @param {string} sessionId - ID of the session to clean up
 */
function cleanupSession(sessionId: string): void {
  console.log(`Cleaning up session ${sessionId}`);
  const session = activeSessions.get(sessionId);
  if (session) {
    if (session.tmpDir) {
      try {
        // Force removal of temporary directory
        session.tmpDir.removeCallback();
        console.log(`Removed temporary directory for session ${sessionId}`);
      } catch (e) {
        console.error(`Error removing temporary directory for session ${sessionId}:`, e);
        // Try a different approach if the callback method fails
        try {
          const { exec } = require('child_process');
          exec(`rm -rf "${session.tmpDir.name}"`, (err: Error) => {
            if (err) {
              console.error(`Failed to forcefully remove temp dir ${session.tmpDir.name}:`, err);
            } else {
              console.log(`Forcefully removed temp dir ${session.tmpDir.name}`);
            }
          });
        } catch (execErr) {
          console.error(`Failed to execute rm command:`, execErr);
        }
      }
    }
    
    // Always remove the session from active sessions map
    activeSessions.delete(sessionId);
    console.log(`Removed session ${sessionId} from active sessions`);
  }
}

/**
 * Create a PTY instance with resource limitations
 * @param {string} command - Command to run
 * @param {pty.IPtyForkOptions} options - PTY options
 * @returns {pty.IPty} PTY process
 */
function createPtyProcess(command: string, options: pty.IPtyForkOptions = {}): pty.IPty {
  const defaultOptions: pty.IPtyForkOptions = {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
    env: process.env as { [key: string]: string } // Type assertion
  };
  
  const ptyOptions = { ...defaultOptions, ...options };
  
  return pty.spawn('bash', ['-c', 
    `ulimit -v 102400 && ulimit -m 102400 && ulimit -t 10 && ulimit -s 8192 && ${command}`
  ], ptyOptions);
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate code for security concerns
 * @param {string} code - Source code to validate
 * @returns {ValidationResult} Validation result
 */
function validateCodeSecurity(code: string): ValidationResult {
  // Basic validation
  if (!code || code.trim() === '') {
    return { valid: false, error: 'Error: No code provided' };
  }

  // Check code length
  if (code.length > 50000) {
    return { valid: false, error: 'Error: Code exceeds maximum length of 50,000 characters' };
  }

  // Check line count
  if (code.split('\n').length > 1000) {
    return { valid: false, error: 'Error: Code exceeds maximum of 1,000 lines' };
  }

  return { valid: true };
}

/**
 * Start a compilation session
 * @param {WebSocket} ws - WebSocket connection
 * @param {string} sessionId - Session ID
 * @param {DirResult} tmpDir - Temporary directory
 * @param {string} outputFile - Path to compiled executable
 */
function startCompilationSession(ws: WebSocket, sessionId: string, tmpDir: DirResult, outputFile: string): boolean {
  try {
    // Set standard terminal size: 80 columns, 24 rows
    const cols = 80;
    const rows = 24;
    
    // Create PTY instance with correct terminal type and size
    const ptyProcess = createPtyProcess(`"${outputFile}"`, {
      name: 'xterm-256color', // Use more complete terminal type support
      cols: cols,
      rows: rows,
      cwd: tmpDir.name,
      env: {
        ...(process.env as { [key: string]: string }),
        TERM: 'xterm-256color' // Ensure program knows the correct terminal type
      }
    });
    
    // Store PTY process and temporary directory
    activeSessions.set(sessionId, { 
      pty: ptyProcess,
      tmpDir: tmpDir,
      lastActivity: Date.now(),
      dimensions: { cols, rows }
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
        ws.send(JSON.stringify({
          type: 'output',
          output: data,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.error(`Error sending output for session ${sessionId}:`, e);
      }
    });
    
    // Handle PTY exit
    ptyProcess.onExit(({ exitCode }) => {
      console.log(`Process exited with code ${exitCode} for session ${sessionId}`);
      
      try {
        ws.send(JSON.stringify({
          type: 'exit',
          code: exitCode,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.error(`Error sending exit message for session ${sessionId}:`, e);
      }
      
      // Add a slight delay before cleanup to prevent race conditions
      setTimeout(() => {
        // Clean up session and temporary files
        if (activeSessions.has(sessionId)) {
          console.log(`Cleaning up session ${sessionId} after exit`);
          cleanupSession(sessionId);
        } else {
          console.log(`Session ${sessionId} already cleaned up`);
        }
      }, 100);
    });

    return true;
  } catch (ptyError) {
    console.error(`Error creating PTY for session ${sessionId}:`, ptyError);
    ws.send(JSON.stringify({
      type: 'error',
      output: `Error executing program: ${(ptyError as Error).message}`
    }));
    
    return false;
  }
}

/**
 * Send input to a running session
 * @param {string} sessionId - Session ID
 * @param {string} input - Input to send to the process
 * @param {WebSocket} ws - WebSocket connection
 * @returns {boolean} Whether the input was sent successfully
 */
function sendInputToSession(sessionId: string, input: string, ws: WebSocket): boolean {
  const session = activeSessions.get(sessionId);
  if (session && session.pty) {
    // In PTY, input is automatically echoed by the program (if using standard IO)
    // So we don't need to handle echo separately, just send the input
    session.pty.write(input);
    
    // Update last activity time
    session.lastActivity = Date.now();
    return true;
  }
  return false;
}

interface CompilationEnvironment {
  tmpDir: DirResult;
  sourceFile: string;
  outputFile: string;
  asmFile: string;
}

/**
 * Create a temporary compilation directory
 * @param {string} lang - Programming language (c/cpp)
 * @returns {CompilationEnvironment} Object containing directory and file paths
 */
function createCompilationEnvironment(lang: string): CompilationEnvironment {
  const tmpDir = tmp.dirSync({ prefix: 'webCpp-', unsafeCleanup: true });
  const sourceExtension = lang === 'cpp' ? 'cpp' : 'c';
  const sourceFile = path.join(tmpDir.name, `program.${sourceExtension}`);
  const outputFile = path.join(tmpDir.name, 'program.out');
  const asmFile = path.join(tmpDir.name, 'program.s');
  
  return {
    tmpDir,
    sourceFile,
    outputFile,
    asmFile
  };
}

/**
 * Try to restore a previously disconnected session
 * @param {string} previousSessionId - Previous session ID
 * @param {string} newSessionId - New session ID
 * @param {WebSocket} ws - WebSocket connection
 * @returns {boolean} Whether the session was restored
 */
function tryRestoreSession(previousSessionId: string, newSessionId: string, ws: WebSocket): boolean {
  const preservedSession = preservedSessions.get(previousSessionId);
  
  if (preservedSession) {
    // We found a preserved session, transfer it to the active sessions
    console.log(`Restoring session ${previousSessionId} as ${newSessionId}`);
    
    activeSessions.set(newSessionId, preservedSession);
    preservedSessions.delete(previousSessionId);
    
    // Reconnect the PTY's output to the new WebSocket
    if (preservedSession.pty) {
      preservedSession.pty.onData((data: string) => {
        try {
          ws.send(JSON.stringify({
            type: 'output',
            output: data,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.error(`Error sending output for restored session ${newSessionId}:`, e);
        }
      });
      
      // Send notification that session was restored
      ws.send(JSON.stringify({
        type: 'session_restored',
        message: 'Previous session restored'
      }));
      
      return true;
    }
  }
  
  return false;
}

/**
 * Temporarily preserve a session instead of terminating it immediately
 * Useful for brief disconnections
 * @param {string} sessionId - Session ID to preserve
 */
function preserveSession(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    console.log(`Preserving session ${sessionId} for potential reconnection`);
    // Move from active to preserved
    preservedSessions.set(sessionId, session);
    activeSessions.delete(sessionId);
    
    // Set a timeout to actually terminate the session if not reclaimed
    setTimeout(() => {
      if (preservedSessions.has(sessionId)) {
        console.log(`Preserved session ${sessionId} timed out, terminating`);
        const preservedSession = preservedSessions.get(sessionId);
        
        // Clean up the preserved session
        if (preservedSession && preservedSession.pty) {
          try {
            preservedSession.pty.kill('SIGKILL');
          } catch (e) {
            console.error(`Error killing preserved process for session ${sessionId}:`, e);
          }
        }
        
        if (preservedSession && preservedSession.tmpDir) {
          try {
            preservedSession.tmpDir.removeCallback();
          } catch (e) {
            console.error(`Error removing temporary directory for preserved session ${sessionId}:`, e);
          }
        }
        
        preservedSessions.delete(sessionId);
      }
    }, 30000); // Preserve for 30 seconds
  }
}

/**
 * Resize terminal dimensions
 * @param {string} sessionId - Session ID
 * @param {number} cols - Number of columns
 * @param {number} rows - Number of rows
 * @returns {boolean} Whether resize was successful
 */
function resizeTerminal(sessionId: string, cols: number, rows: number): boolean {
  const session = activeSessions.get(sessionId);
  if (session && session.pty) {
    try {
      session.pty.resize(cols, rows);
      session.dimensions = { cols, rows };
      return true;
    } catch (e) {
      console.error(`Error resizing terminal for session ${sessionId}:`, e);
      return false;
    }
  }
  return false;
}

export {
  activeSessions,
  terminateSession,
  cleanupSession,
  createPtyProcess,
  validateCodeSecurity,
  startCompilationSession,
  sendInputToSession,
  createCompilationEnvironment,
  preserveSession,
  tryRestoreSession,
  resizeTerminal,
  Session,
  ValidationResult,
  CompilationEnvironment
};
