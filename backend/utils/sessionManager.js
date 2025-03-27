/**
 * Session management for terminal sessions
 */
const pty = require('node-pty');

// Store active terminal sessions
const activeSessions = new Map();

/**
 * Terminate a specific session
 * @param {string} sessionId - ID of the session to terminate
 */
function terminateSession(sessionId) {
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
function cleanupSession(sessionId) {
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
          exec(`rm -rf "${session.tmpDir.name}"`, (err) => {
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
 * @param {Object} options - PTY options
 * @returns {Object} PTY process
 */
function createPtyProcess(command, options = {}) {
  const defaultOptions = {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
    env: process.env
  };
  
  const ptyOptions = { ...defaultOptions, ...options };
  
  return pty.spawn('bash', ['-c', 
    `ulimit -v 102400 && ulimit -m 102400 && ulimit -t 10 && ulimit -s 8192 && ${command}`
  ], ptyOptions);
}

module.exports = {
  activeSessions,
  terminateSession,
  cleanupSession,
  createPtyProcess
}; 