/**
 * Code compilation and execution router
 */
const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const { 
  sanitizeOutput, 
  getCompilerCommand, 
  getStandardOption, 
  executeCommand,
  formatOutput
} = require('../utils/helpers');
const { 
  activeSessions, 
  terminateSession, 
  validateCodeSecurity,
  startCompilationSession,
  sendInputToSession,
  createCompilationEnvironment,
  preserveSession,
  tryRestoreSession,
  resizeTerminal
} = require('../utils/sessionManager');

// WebSocket setup functions
function setupWebSocketHandlers(wss) {
  // Set up interval to ping clients and clean up dead connections
  const interval = setInterval(() => {
    wss.clients.forEach(ws => {
      if (ws.isAlive === false) {
        console.log('Terminating inactive WebSocket connection');
        
        // If this socket has a session ID, preserve it temporarily instead of terminating
        if (ws.sessionId) {
          preserveSession(ws.sessionId);
        }
        
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping(() => {});
    });
  }, 30000);
  
  // Clean up interval on server close
  wss.on('close', () => {
    clearInterval(interval);
  });

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established for compilation');
    
    // Set up heartbeat mechanism
    ws.isAlive = true;
    
    ws.on('pong', () => {
      // Mark the connection as alive when pong is received
      ws.isAlive = true;
    });
    
    // Create unique session ID for each connection
    const sessionId = require('uuid').v4();
    ws.sessionId = sessionId; // Store sessionId on the ws object for reference
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log(`Received ${data.type || data.action} from ${sessionId}`);
        
        switch(data.type || data.action) {
          case 'ping':
            // Handle ping from client
            console.log(`Received ping from client ${sessionId}`);
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: Date.now()
            }));
            break;
            
          case 'restore_session':
            // Try to restore a previously disconnected session
            if (data.previousSessionId && data.previousSessionId !== sessionId) {
              const restored = tryRestoreSession(data.previousSessionId, sessionId, ws);
              if (restored) {
                console.log(`Successfully restored session ${data.previousSessionId} as ${sessionId}`);
              } else {
                console.log(`Failed to restore session ${data.previousSessionId}`);
              }
            }
            break;
            
          case 'compile':
            // Compile and run code using PTY
            compileAndRunWithPTY(ws, sessionId, data.code, data.lang, data.compiler, data.optimization);
            break;
            
          case 'input':
            // Send user input to the program without handling echo
            // The PTY will automatically send back the program's echo to the frontend
            if (sendInputToSession(sessionId, data.input, ws)) {
              console.log(`Input sent to session ${sessionId}`);
            } else {
              console.log(`Failed to send input to session ${sessionId}: Session not active`);
              ws.send(JSON.stringify({
                type: 'error',
                message: 'No active session to receive input',
                timestamp: Date.now()
              }));
            }
            break;
            
          case 'resize':
            // Handle terminal resize request
            if (data.cols && data.rows) {
              if (resizeTerminal(sessionId, data.cols, data.rows)) {
                console.log(`Terminal resized for session ${sessionId} to ${data.cols}x${data.rows}`);
              } else {
                console.log(`Failed to resize terminal for session ${sessionId}`);
              }
            }
            break;
            
          case 'cleanup':
            // Handle explicit cleanup request
            console.log(`Received cleanup request for session ${sessionId}`);
            if (activeSessions.has(sessionId)) {
              terminateSession(sessionId);
              ws.send(JSON.stringify({
                type: 'cleanup-complete',
                timestamp: Date.now()
              }));
            }
            break;
            
          default:
            console.log(`Unhandled message type: ${data.type || data.action}`);
        }
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Error processing request: ' + error.message,
          timestamp: Date.now()
        }));
      }
    });
    
    ws.on('close', () => {
      console.log(`WebSocket session ${sessionId} closed`);
      
      // Instead of immediately terminating, preserve the session briefly
      // to allow for reconnection (e.g., page refresh, network hiccup)
      if (activeSessions.has(sessionId)) {
        preserveSession(sessionId);
      }
    });
    
    // Send session ID back to client
    ws.send(JSON.stringify({ 
      type: 'connected', 
      sessionId,
      timestamp: Date.now()
    }));
  });
}

// Compile and run code with PTY for true terminal experience
function compileAndRunWithPTY(ws, sessionId, code, lang, compiler, optimization) {
  console.log(`Compile request received for session ${sessionId}`);
  
  // Security checks
  const validation = validateCodeSecurity(code);
  if (!validation.valid) {
    ws.send(JSON.stringify({
      type: 'compile-error',
      output: validation.error
    }));
    return;
  }

  // Check if session already exists and terminate it
  if (activeSessions.has(sessionId)) {
    console.log(`Session ${sessionId} already exists, terminating first`);
    terminateSession(sessionId);
  }
  
  // Create compilation environment
  const { tmpDir, sourceFile, outputFile } = createCompilationEnvironment(lang);
  
  try {
    // Write code to temporary file
    fs.writeFileSync(sourceFile, code);
    
    // Notify client that compilation has started
    ws.send(JSON.stringify({ type: 'compiling' }));
    
    // Determine compiler options
    const compilerCmd = getCompilerCommand(lang, compiler);
    const standardOption = getStandardOption(lang);
    const optimizationOption = optimization || '-O0';
    
    // Compile command
    const compileCmd = `${compilerCmd} ${standardOption} ${optimizationOption} "${sourceFile}" -o "${outputFile}"`;
    console.log(`Compiling with command: ${compileCmd}`);
    
    // Execute compilation
    executeCommand(compileCmd)
      .then(() => {
        // Compilation successful, notify client
        console.log(`Compilation successful, preparing to run session ${sessionId}`);
        ws.send(JSON.stringify({ type: 'compile-success' }));
        
        // Start compilation session with PTY
        const success = startCompilationSession(ws, sessionId, tmpDir, outputFile);
        
        if (!success) {
          // Clean up on PTY creation error
          tmpDir.removeCallback();
        }
      })
      .catch((error) => {
        // Compilation error
        console.error(`Compilation error for session ${sessionId}:`, error);
        const sanitizedError = sanitizeOutput(error) || error;
        // Apply formatting for compiler errors
        const formattedError = formatOutput(sanitizedError, 'default');
        
        ws.send(JSON.stringify({
          type: 'compile-error',
          output: formattedError
        }));
        
        // Clean up temporary directory
        tmpDir.removeCallback();
      });
  } catch (error) {
    console.error(`Error setting up compilation for session ${sessionId}:`, error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Error setting up compilation: ' + error.message
    }));
    
    // Clean up temporary directory
    tmpDir.removeCallback();
  }
}

// Regular HTTP endpoint for compilation (assembly, etc.)
router.post('/', async (req, res) => {
  const { code, lang, compiler: selectedCompiler, optimization, action } = req.body;
  
  // Validate code
  const validation = validateCodeSecurity(code);
  if (!validation.valid) {
    return res.status(400).send(validation.error);
  }

  try {
    // Create compilation environment
    const { tmpDir, sourceFile, outputFile, asmFile } = createCompilationEnvironment(lang);
    
    // Write code to temporary file
    fs.writeFileSync(sourceFile, code);
    
    // Determine compiler and options
    const compiler = getCompilerCommand(lang, selectedCompiler);
    const standardOption = getStandardOption(lang);
    const optimizationOption = optimization || '-O0';
    
    try {
      if (action === 'assembly' || action === 'both') {
        // Generate assembly code
        const asmCmd = `${compiler} -S -masm=intel -fno-asynchronous-unwind-tables ${optimizationOption} ${standardOption} "${sourceFile}" -o "${asmFile}"`;
        
        try {
          await executeCommand(asmCmd);
        } catch (error) {
          const sanitizedError = sanitizeOutput(error);
          // Apply formatting for compiler errors
          const formattedError = formatOutput(sanitizedError, 'default');
          return res.status(400).send(`Compilation Error:\n${formattedError}`);
        }
      }
      
      if (action === 'compile' || action === 'both') {
        // Compile code
        const compileCmd = `${compiler} ${standardOption} ${optimizationOption} "${sourceFile}" -o "${outputFile}"`;
        
        try {
          await executeCommand(compileCmd);
        } catch (error) {
          return res.status(400).send(`Compilation Error:\n${sanitizeOutput(error)}`);
        }
        
        // Execute compiled program with resource limits
        const command = `ulimit -v 102400 && ulimit -m 102400 && ulimit -t 10 && ulimit -s 8192 && "${outputFile}" 2>&1`;

        try {
          const { stdout } = await executeCommand(command, { timeout: 10000 });
          res.send(stdout);
        } catch (error) {
          let errorMessage = '';
          if (typeof error === 'string' && error.includes('bad_alloc')) {
            errorMessage = 'Error: Program exceeded memory limit (100MB)';
          } else if (typeof error === 'string' && error.includes('Killed')) {
            errorMessage = 'Error: Program killed (exceeded memory limit)';
          } else if (error.code === 124 || error.code === 142) {
            errorMessage = 'Error: Program execution timed out (10 seconds)';
          } else {
            errorMessage = error.toString();
          }
          res.status(400).send(errorMessage);
        }
      } else if (action === 'assembly') {
        // Return assembly code
        const assemblyCode = fs.readFileSync(asmFile, 'utf8');
        res.send(assemblyCode);
      }
    } finally {
      // Clean up temporary files
      tmpDir.removeCallback();
    }
  } catch (error) {
    res.status(500).send(`Error: ${error.message || error}`);
  }
});

module.exports = { router, setupWebSocketHandlers };