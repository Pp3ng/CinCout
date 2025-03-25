/**
 * Code compilation and execution router
 */
const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const tmp = require('tmp');
const { validateCode, sanitizeOutput, getCompilerCommand, getStandardOption, executeCommand } = require('../utils/helpers');
const { validateCodeSecurity } = require('../utils/security');
const { activeSessions, terminateSession, cleanupSession, createPtyProcess } = require('../utils/sessionManager');

// WebSocket setup functions
function setupWebSocketHandlers(wss) {
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established for compilation');
    
    // Create unique session ID for each connection
    const sessionId = require('uuid').v4();
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        switch(data.type) {
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

// Compile and run code with PTY for true terminal experience
function compileAndRunWithPTY(ws, sessionId, code, lang, compiler, optimization) {
  // Security checks
  const validation = validateCodeSecurity(code);
  if (!validation.valid) {
    ws.send(JSON.stringify({
      type: 'compile-error',
      output: validation.error
    }));
    return;
  }

  // Terminate any existing session
  terminateSession(sessionId);
  
  // Create temporary directory
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
    
    // Execute compilation
    executeCommand(compileCmd)
      .then(() => {
        // Compilation successful, notify client
        ws.send(JSON.stringify({ type: 'compile-success' }));
        
        // Create PTY instance with resource limitations
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
          ws.send(JSON.stringify({
            type: 'output',
            output: data
          }));
        });
        
        // Handle PTY exit
        ptyProcess.onExit(({ exitCode }) => {
          ws.send(JSON.stringify({
            type: 'exit',
            code: exitCode
          }));
          
          // Clean up session and temporary files
          cleanupSession(sessionId);
        });

        // Set a timeout to kill long-running processes
        setTimeout(() => {
          const session = activeSessions.get(sessionId);
          if (session && session.pty) {
            ws.send(JSON.stringify({
              type: 'error',
              output: '\r\nError: Program execution timed out (10 seconds)'
            }));
            terminateSession(sessionId);
          }
        }, 10000);
      })
      .catch((error) => {
        // Compilation error
        ws.send(JSON.stringify({
          type: 'compile-error',
          output: sanitizeOutput(error) || error
        }));
        
        // Clean up temporary directory
        tmpDir.removeCallback();
      });
  } catch (error) {
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
          res.send(stdout);
        } catch (error) {
          if (typeof error === 'string' && error.includes('bad_alloc')) {
            return res.status(400).send('Error: Program exceeded memory limit (100MB)');
          } else if (typeof error === 'string' && error.includes('Killed')) {
            return res.status(400).send('Error: Program killed (exceeded memory limit)');
          } else if (error.code === 124 || error.code === 142) {
            return res.status(400).send('Error: Program execution timed out (10 seconds)');
          } else {
            return res.status(400).send(error);
          }
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