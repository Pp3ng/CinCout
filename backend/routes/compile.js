/**
 * Code compilation and execution router
 */
const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const tmp = require('tmp');
const { sanitizeOutput, getCompilerCommand, getStandardOption, executeCommand } = require('../utils/helpers');
const { activeSessions, terminateSession, cleanupSession, createPtyProcess } = require('../utils/sessionManager');

// WebSocket setup functions
function setupWebSocketHandlers(wss) {
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
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        switch(data.type || data.action) {
          case 'ping':
            // Handle ping from client
            console.log(`Received ping from client ${sessionId}`);
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: Date.now()
            }));
            break;
            
          case 'compile':
            // Compile and run code using PTY
            compileAndRunWithPTY(ws, sessionId, data.code, data.lang, data.compiler, data.optimization);
            break;
            
          case 'input':
            // Send user input to running program
            const session = activeSessions.get(sessionId);
            if (session && session.pty) {
              session.pty.write(data.input + '\r');
            }
            break;
            
          case 'cleanup':
            // Handle explicit cleanup request
            console.log(`Received cleanup request for session ${sessionId}`);
            if (activeSessions.has(sessionId)) {
              terminateSession(sessionId);
              ws.send(JSON.stringify({
                type: 'cleanup-complete'
              }));
            }
            break;
        }
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Error processing request: ' + error.message
        }));
      }
    });
    
    ws.on('close', () => {
      console.log(`WebSocket session ${sessionId} closed`);
      terminateSession(sessionId);
    });
    
    // Send session ID back to client
    ws.send(JSON.stringify({ type: 'connected', sessionId }));
  });
}

const validateCodeSecurity = (code) => {
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
};

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
  
  // Create temporary directory
  console.log(`Creating temporary directory for session ${sessionId}`);
  const tmpDir = tmp.dirSync({ prefix: 'webCpp-', unsafeCleanup: true });
  const sourceExtension = lang === 'cpp' ? 'cpp' : 'c';
  const sourceFile = path.join(tmpDir.name, `program.${sourceExtension}`);
  const outputFile = path.join(tmpDir.name, 'program.out');
  
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
        
        // Create PTY instance with resource limitations
        try {
          const ptyProcess = createPtyProcess(`"${outputFile}"`, {
            cwd: tmpDir.name
          });
          
          // Store PTY process and temporary directory
          activeSessions.set(sessionId, { 
            pty: ptyProcess,
            tmpDir: tmpDir
          });
          
          // Handle PTY output
          ptyProcess.onData((data) => {
            try {
              ws.send(JSON.stringify({
                type: 'output',
                output: data
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
                code: exitCode
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

        } catch (ptyError) {
          console.error(`Error creating PTY for session ${sessionId}:`, ptyError);
          ws.send(JSON.stringify({
            type: 'error',
            output: `Error executing program: ${ptyError.message}`
          }));
          
          // Clean up on PTY creation error
          tmpDir.removeCallback();
        }
      })
      .catch((error) => {
        // Compilation error
        console.error(`Compilation error for session ${sessionId}:`, error);
        ws.send(JSON.stringify({
          type: 'compile-error',
          output: sanitizeOutput(error) || error
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
    // Create temporary directory
    const tmpDir = tmp.dirSync({ prefix: 'webCpp-', unsafeCleanup: true });
    const sourceExtension = lang === 'cpp' ? 'cpp' : 'c';
    const sourceFile = path.join(tmpDir.name, `program.${sourceExtension}`);
    const outputFile = path.join(tmpDir.name, 'program.out');
    const asmFile = path.join(tmpDir.name, 'program.s');
    
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
          return res.status(400).send(`Compilation Error:\n${sanitizeOutput(error)}`);
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
          ws.send(JSON.stringify({ type: 'output', output: stdout }));
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
          ws.send(JSON.stringify({ type: 'error', output: `\r\n${errorMessage}` }));
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