const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const tmp = require('tmp');
const { sanitizeOutput } = require('../utils/helpers');
const pty = require('node-pty');

// Store active terminal sessions
const activeSessions = new Map();

// Check for dangerous system calls
const containsDangerousCalls = (code) => {
  const dangerousCalls = [
    // Process manipulation
    "fork", "vfork", "clone", "exec", "system", "popen", 
    "spawn", "posix_spawn", "daemon", "setpgrp", "setsid",

    // Network operations
    "socket", "connect", "bind", "listen", "accept", 
    "recv", "send", "sendto", "recvfrom", "gethostbyname",
    "getaddrinfo", "inet_addr", "inet_ntoa", "socketpair",
    "setsockopt", "getsockopt", "shutdown",

    // File system operations
    "unlink", "remove", "rename", "symlink", "link",
    "mkdir", "rmdir", "chmod", "chown", "truncate",
    "open", "creat", "mknod", "mkfifo", "mount", "umount",
    "chroot", "pivot_root", "sync", "fsync",

    // Process control and signals
    "ptrace", "kill", "raise", "abort", "signal",
    "sigaction", "sigsuspend", "sigwait", "setuid",
    "setgid", "setgroups", "capabilities", "reboot",
    "sysctl", "nice", "setpriority", "setrlimit",

    // Shell commands
    "system", "popen", "execl", "execlp", "execle",
    "execv", "execvp", "execvpe", "`", "shell",
    "dlopen", "dlsym", "dlclose",

    // Memory manipulation
    "asm", "__asm", "__asm__", "inline", "__builtin",
    "mmap", "mprotect", "shmat", "shmctl", "shmget",
    "semget", "semctl", "semop", "msgget", "msgsnd",
    "msgrcv", "msgctl",

    // Dangerous standard library functions
    "gets", "scanf", "getwd", "mktemp", "tmpnam",
    "setenv", "putenv", "alloca", "longjmp", "setjmp",
    "atexit", "_exit", "quick_exit", "at_quick_exit"
  ];

  return dangerousCalls.some(call => code.includes(call + "("));
};

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
    if (containsDangerousCalls(code)) {
        ws.send(JSON.stringify({
            type: 'compile-error',
            output: 'Error: Code contains restricted function calls'
        }));
        return;
    }

    // Check code length
    if (code.length > 50000) {
        ws.send(JSON.stringify({
            type: 'compile-error',
            output: 'Error: Code exceeds maximum length of 50,000 characters'
        }));
        return;
    }

    // Check line count
    if (code.split('\n').length > 1000) {
        ws.send(JSON.stringify({
            type: 'compile-error',
            output: 'Error: Code exceeds maximum of 1,000 lines'
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
        const compilerCmd = lang === 'cpp' 
            ? (compiler === 'clang' ? 'clang++' : 'g++')
            : (compiler === 'clang' ? 'clang' : 'gcc');
            
        const standardOption = lang === 'cpp' ? '-std=c++20' : '-std=c11';
        const optimizationOption = optimization || '-O0';
        
        // Compile command
        const compileCmd = `${compilerCmd} ${standardOption} ${optimizationOption} "${sourceFile}" -o "${outputFile}"`;
        
        // Execute compilation
        exec(compileCmd, (error, stdout, stderr) => {
            if (error) {
                // Compilation error
                ws.send(JSON.stringify({
                    type: 'compile-error',
                    output: sanitizeOutput(stderr) || error.message
                }));
                
                // Clean up temporary directory
                tmpDir.removeCallback();
                return;
            }
            
            // Compilation successful, notify client
            ws.send(JSON.stringify({ type: 'compile-success' }));
            
            // Create PTY instance with resource limitations
            const ptyProcess = pty.spawn('bash', ['-c', 
                `ulimit -v 102400 && ulimit -m 102400 && ulimit -t 10 && ulimit -s 8192 && "${outputFile}"`
            ], {
                name: 'xterm-color',
                cols: 80,
                rows: 24,
                cwd: tmpDir.name,
                env: process.env
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

// Terminate session
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

// Clean up session and its files
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

// Regular HTTP endpoint for compilation (assembly, etc.)
router.post('/', async (req, res) => {
  const { code, lang, compiler: selectedCompiler, optimization, action } = req.body;
  
  if (!code || code.trim() === '') {
    return res.status(400).send('Error: No code provided');
  }

  // Security checks
  if (containsDangerousCalls(code)) {
    return res.status(400).send('Error: Code contains restricted function calls');
  }

  // Check code length
  if (code.length > 50000) {
    return res.status(400).send('Error: Code exceeds maximum length of 50,000 characters');
  }

  // Check line count
  if (code.split('\n').length > 1000) {
    return res.status(400).send('Error: Code exceeds maximum of 1,000 lines');
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
    const compiler = lang === 'cpp' 
      ? (selectedCompiler === 'clang' ? 'clang++' : 'g++')
      : (selectedCompiler === 'clang' ? 'clang' : 'gcc');
    
    const standardOption = lang === 'cpp' ? '-std=c++20' : '-std=c11';
    const optimizationOption = optimization || '-O0';
    
    if (action === 'assembly' || action === 'both') {
      // Generate assembly code
      const asmCmd = `${compiler} -S -masm=intel -fno-asynchronous-unwind-tables ${optimizationOption} ${standardOption} "${sourceFile}" -o "${asmFile}"`;
      
      await new Promise((resolve, reject) => {
        exec(asmCmd, (error, stdout, stderr) => {
          if (error) {
            return reject(`Compilation Error:\n${sanitizeOutput(stderr)}`);
          }
          resolve();
        });
      });
    }
    
    if (action === 'compile' || action === 'both') {
      // Compile code
      const compileCmd = `${compiler} ${standardOption} ${optimizationOption} "${sourceFile}" -o "${outputFile}"`;
      
      await new Promise((resolve, reject) => {
        exec(compileCmd, (error, stdout, stderr) => {
          if (error) {
            return reject(`Compilation Error:\n${sanitizeOutput(stderr)}`);
          }
          resolve();
        });
      });
      
      // Execute compiled program with resource limits
      const command = `ulimit -v 102400 && ulimit -m 102400 && ulimit -t 10 && ulimit -s 8192 && "${outputFile}" 2>&1`;
      
      try {
        const { stdout } = await new Promise((resolve, reject) => {
          exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
            if (error && error.killed) {
              return reject('Error: Program execution timed out (10 seconds)');
            }
            if (error) {
              if (stdout.includes('bad_alloc') || stdout.includes('out of memory')) {
                return reject('Error: Program exceeded memory limit (100MB)');
              } else if (stdout.includes('Killed') || (error.code === 137 || error.code === 9)) {
                return reject('Error: Program killed (exceeded memory limit)');
              } else if (error.code === 124 || error.code === 142) {
                return reject('Error: Program execution timed out (10 seconds)');
              } else {
                return resolve({ stdout: `Program output (exit code ${error.code}):\n${stdout}` });
              }
            }
            resolve({ stdout });
          });
        });
        
        res.send(stdout);
      } catch (error) {
        res.status(400).send(error);
      }
    } else if (action === 'assembly') {
      // Return assembly code
      const assemblyCode = fs.readFileSync(asmFile, 'utf8');
      res.send(assemblyCode);
    }
    
    // Clean up temporary files
    tmpDir.removeCallback();
  } catch (error) {
    res.status(500).send(`Error: ${error.message || error}`);
  }
});

module.exports = { router, setupWebSocketHandlers }; 