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
  resizeTerminal
} from '../utils/sessionManager';

const router = express.Router();

// Extended WebSocket interface to add properties
interface ExtendedWebSocket extends WebSocket {
  sessionId?: string;
  isAlive?: boolean;
}

// WebSocket setup functions
function setupWebSocketHandlers(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket) => {
    const extWs = ws as ExtendedWebSocket;
    // Create unique session ID for each connection
    const sessionId = uuidv4();
    extWs.sessionId = sessionId;
    
    // Set isAlive flag for heartbeat
    extWs.isAlive = true;
    
    // Handle pong messages - client is alive
    extWs.on('pong', () => {
      extWs.isAlive = true;
    });
    
    // Set up auto-close timeout - if 3 minutes with no activity, close connection
    const autoCloseTimeout = setTimeout(() => {
      if (extWs.readyState === WebSocket.OPEN) {
        extWs.close();
      }
    }, 180000); // 3 minutes timeout
    
    // Handle incoming messages
    extWs.on('message', (message: Buffer | string | ArrayBuffer | Buffer[]) => {
      try {
        // Reset timeout on any message
        clearTimeout(autoCloseTimeout);
        
        const data = JSON.parse(typeof message === 'string' ? message : message.toString());
        
        switch(data.type || data.action) {
          case 'compile':
            // Compile and run code using PTY
            compileAndRunWithPTY(extWs, sessionId, data.code, data.lang, data.compiler, data.optimization);
            break;
            
          case 'input':
            // Send user input to the program
            if (!sendInputToSession(sessionId, data.input, extWs)) {
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
              resizeTerminal(sessionId, data.cols, data.rows);
            }
            break;
            
          case 'cleanup':
            // Handle explicit cleanup request
            if (activeSessions.has(sessionId)) {
              terminateSession(sessionId);
              extWs.send(JSON.stringify({
                type: 'cleanup-complete',
                timestamp: Date.now()
              }));
            }
            break;
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
    
    // Handle WebSocket close
    extWs.on('close', () => {
      clearTimeout(autoCloseTimeout);
      
      // Immediately terminate any active session when WebSocket closes
      if (activeSessions.has(sessionId)) {
        terminateSession(sessionId);
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
    
    // Compile command - no resource limiting
    const compileCmd = `${compilerCmd} ${standardOption} ${optimizationOption} "${sourceFile}" -o "${outputFile}"`;
    
    // Execute compilation
    executeCommand(compileCmd)
      .then(() => {
        // Compilation successful, notify client
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
        const asmCmd = `${compiler} -S -fno-asynchronous-unwind-tables ${optimizationOption} ${standardOption} "${sourceFile}" -o "${asmFile}"`;
        
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
        
        // Execute the compiled program
        const command = `\"${outputFile}\" 2>&1`;

        try {
          const { stdout } = await executeCommand(command);
          res.send(stdout);
        } catch (error) {
          let errorMessage = '';
          const errorStr = (error as Error).toString();
          
          errorMessage = errorStr;
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