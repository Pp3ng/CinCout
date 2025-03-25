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
  const session = activeSessions.get(sessionId);
  if (session) {
    try {
      if (session.pty) {
        session.pty.kill();
      }
    } catch (e) {
      console.error(`Error killing process for session ${sessionId}:`, e);
    }
    cleanupSession(sessionId);
  }
}

/**
 * Clean up session resources
 * @param {string} sessionId - ID of the session to clean up
 */
function cleanupSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session) {
    if (session.tmpDir) {
      try {
        session.tmpDir.removeCallback();
      } catch (e) {
        console.error(`Error removing temporary directory for session ${sessionId}:`, e);
      }
    }
    activeSessions.delete(sessionId);
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