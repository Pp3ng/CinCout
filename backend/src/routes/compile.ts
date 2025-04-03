/**
 * Code compilation and execution router
 */
import express, { Request, Response } from 'express';
import fs from 'fs-extra';
import { WebSocket, WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { 
  sanitizeOutput, 
  getCompilerCommand, 
  getStandardOption, 
  executeCommand,
  formatOutput
} from '../utils/helpers';
import { 
  activeSessions, 
  terminateSession, 
  validateCodeSecurity,
  startCompilationSession,
  sendInputToSession,
  createCompilationEnvironment,
  preserveSession,
  tryRestoreSession,
  resizeTerminal
} from '../utils/sessionManager';

const router = express.Router();

// Extended WebSocket interface to add properties
interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
  sessionId?: string;
}

// WebSocket setup functions
function setupWebSocketHandlers(wss: WebSocketServer): void {
  // Set up interval to ping clients and clean up dead connections
  const interval = setInterval(() => {
    wss.clients.forEach(ws => {
      const extWs = ws as ExtendedWebSocket;
      if (extWs.isAlive === false) {
        console.log('Terminating inactive WebSocket connection');
        
        // If this socket has a session ID, preserve it temporarily instead of terminating
        if (extWs.sessionId) {
          preserveSession(extWs.sessionId);
        }
        
        return extWs.terminate();
      }
      
      extWs.isAlive = false;
      extWs.ping(() => {});
    });
  }, 30000);
  
  // Clean up interval on server close
  wss.on('close', () => {
    clearInterval(interval);
  });

  wss.on('connection', (ws: WebSocket) => {
    const extWs = ws as ExtendedWebSocket;
    console.log('New WebSocket connection established for compilation');
    
    // Set up heartbeat mechanism
    extWs.isAlive = true;
    
    extWs.on('pong', () => {
      // Mark the connection as alive when pong is received
      extWs.isAlive = true;
    });
    
    // Create unique session ID for each connection
    const sessionId = uuidv4();
    extWs.sessionId = sessionId; // Store sessionId on the ws object for reference
    
    extWs.on('message', (message: Buffer | string | ArrayBuffer | Buffer[]) => {
      try {
        const data = JSON.parse(typeof message === 'string' ? message : message.toString());
        console.log(`Received ${data.type || data.action} from ${sessionId}`);
        
        switch(data.type || data.action) {
          case 'ping':
            // Handle ping from client
            console.log(`Received ping from client ${sessionId}`);
            extWs.send(JSON.stringify({
              type: 'pong',
              timestamp: Date.now()
            }));
            break;
            
          case 'restore_session':
            // Try to restore a previously disconnected session
            if (data.previousSessionId && data.previousSessionId !== sessionId) {
              const restored = tryRestoreSession(data.previousSessionId, sessionId, extWs);
              if (restored) {
                console.log(`Successfully restored session ${data.previousSessionId} as ${sessionId}`);
              } else {
                console.log(`Failed to restore session ${data.previousSessionId}`);
              }
            }
            break;
            
          case 'compile':
            // Compile and run code using PTY
            compileAndRunWithPTY(extWs, sessionId, data.code, data.lang, data.compiler, data.optimization);
            break;
            
          case 'input':
            // Send user input to the program without handling echo
            // The PTY will automatically send back the program's echo to the frontend
            if (sendInputToSession(sessionId, data.input, extWs)) {
              console.log(`Input sent to session ${sessionId}`);
            } else {
              console.log(`Failed to send input to session ${sessionId}: Session not active`);
              extWs.send(JSON.stringify({
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
              extWs.send(JSON.stringify({
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
        extWs.send(JSON.stringify({
          type: 'error',
          message: 'Error processing request: ' + (error as Error).message,
          timestamp: Date.now()
        }));
      }
    });
    
    extWs.on('close', () => {
      console.log(`WebSocket session ${sessionId} closed`);
      
      // Instead of immediately terminating, preserve the session briefly
      // to allow for reconnection (e.g., page refresh, network hiccup)
      if (activeSessions.has(sessionId)) {
        preserveSession(sessionId);
      }
    });
    
    // Send session ID back to client
    extWs.send(JSON.stringify({ 
      type: 'connected', 
      sessionId,
      timestamp: Date.now()
    }));
  });
}

// Compile and run code with PTY for true terminal experience
function compileAndRunWithPTY(ws: WebSocket, sessionId: string, code: string, lang: string, compiler?: string, optimization?: string): void {
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
        const sanitizedError = sanitizeOutput(error as string) || error;
        // Apply formatting for compiler errors
        const formattedError = formatOutput(sanitizedError.toString(), 'default');
        
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
      message: 'Error setting up compilation: ' + (error as Error).message
    }));
    
    // Clean up temporary directory
    tmpDir.removeCallback();
  }
}

interface CompileRequest {
  code: string;
  lang: string;
  compiler?: string;
  optimization?: string;
  action?: string;
}

// Regular HTTP endpoint for compilation (assembly, etc.)
router.post('/', async (req: Request, res: Response) => {
  const { code, lang, compiler: selectedCompiler, optimization, action } = req.body as CompileRequest;
  
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
          const sanitizedError = sanitizeOutput(error as string);
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
          return res.status(400).send(`Compilation Error:\n${sanitizeOutput(error as string)}`);
        }
        
        // Execute compiled program with resource limits
        const command = `ulimit -v 102400 && ulimit -m 102400 && ulimit -t 10 && ulimit -s 8192 && "${outputFile}" 2>&1`;

        try {
          const { stdout } = await executeCommand(command, { timeout: 10000 });
          res.send(stdout);
        } catch (error) {
          let errorMessage = '';
          const errorStr = (error as Error).toString();
          
          if (typeof error === 'string' && errorStr.includes('bad_alloc')) {
            errorMessage = 'Error: Program exceeded memory limit (100MB)';
          } else if (typeof error === 'string' && errorStr.includes('Killed')) {
            errorMessage = 'Error: Program killed (exceeded memory limit)';
          } else if ((error as any).code === 124 || (error as any).code === 142) {
            errorMessage = 'Error: Program execution timed out (10 seconds)';
          } else {
            errorMessage = errorStr;
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
    res.status(500).send(`Error: ${(error as Error).message || error}`);
  }
});

export { router, setupWebSocketHandlers };
