/**
 * Code compilation and execution router
 */
import express, { Request, Response } from "express";
import fs from "fs-extra";
import { WebSocketServer } from "ws";
import {
  sanitizeOutput,
  getCompilerCommand,
  getStandardOption,
  executeCommand,
  formatOutput,
  createCompilationEnvironment,
  asyncRouteHandler,
  CodeRequest,
  validateCode,
} from "../utils/routeHandler";
import {
  activeSessions,
  startCompilationSession,
  sendInputToSession,
  resizeTerminal,
} from "../utils/sessionManager";
import {
  ExtendedWebSocket,
  setupWebSocketServer,
  sendWebSocketMessage,
} from "../utils/webSocketHandler";

const router = express.Router();

// Compile and run code with PTY for true terminal experience
const compileAndRunWithPTY = (
  ws: ExtendedWebSocket,
  sessionId: string,
  code: string,
  lang: string,
  compiler?: string,
  optimization?: string
): void => {
  // Security checks - Use validateCode and pass true to enable error field
  const validation = validateCode(code, true);
  if (!validation.valid) {
    sendWebSocketMessage(ws, {
      type: "compile-error",
      output: validation.error,
    });
    return;
  }

  // Create compilation environment
  const { tmpDir, sourceFile, outputFile } = createCompilationEnvironment(lang);

  try {
    // Write code to temporary file
    fs.writeFileSync(sourceFile, code);

    // Notify client that compilation has started
    sendWebSocketMessage(ws, { type: "compiling" });

    // Determine compiler options
    const compilerCmd = getCompilerCommand(lang, compiler);
    const standardOption = getStandardOption(lang);
    const optimizationOption = optimization || "-O0";

    // Compile command - no resource limiting
    const compileCmd = `${compilerCmd} ${standardOption} ${optimizationOption} "${sourceFile}" -o "${outputFile}"`;

    // Execute compilation
    executeCommand(compileCmd)
      .then(() => {
        // Compilation successful, notify client
        sendWebSocketMessage(ws, { type: "compile-success" });

        // Start compilation session with PTY
        const success = startCompilationSession(
          ws,
          sessionId,
          tmpDir,
          outputFile
        );

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
        const formattedError = formatOutput(
          sanitizedError.toString(),
          "default"
        );

        sendWebSocketMessage(ws, {
          type: "compile-error",
          output: formattedError,
        });

        // Clean up temporary directory
        tmpDir.removeCallback();
      });
  } catch (error) {
    console.error(
      `Error setting up compilation for session ${sessionId}:`,
      error
    );
    sendWebSocketMessage(ws, {
      type: "error",
      message: "Error setting up compilation: " + (error as Error).message,
    });

    // Clean up temporary directory
    tmpDir.removeCallback();
  }
};

// Message handler for WebSocket connections
const handleWebSocketMessage = (ws: ExtendedWebSocket, data: any): void => {
  const sessionId = ws.sessionId;

  if (!sessionId) {
    sendWebSocketMessage(ws, {
      type: "error",
      message: "Session ID not found",
    });
    return;
  }

  try {
    switch (data.type || data.action) {
      case "compile":
        // Compile and run code using PTY
        compileAndRunWithPTY(
          ws,
          sessionId,
          data.code,
          data.lang,
          data.compiler,
          data.optimization
        );
        break;

      case "input":
        // Send user input to the program
        if (!sendInputToSession(sessionId, data.input, ws)) {
          sendWebSocketMessage(ws, {
            type: "error",
            message: "No active session to receive input",
          });
        }
        break;

      case "resize":
        // Handle terminal resize request
        if (data.cols && data.rows) {
          resizeTerminal(sessionId, data.cols, data.rows);
        }
        break;

      case "cleanup":
        // Handle explicit cleanup request
        if (activeSessions.has(sessionId)) {
          // The session will be terminated through the event listener in sessionManager.ts
          ws.close();
          sendWebSocketMessage(ws, {
            type: "cleanup-complete",
          });
        }
        break;

      default:
        sendWebSocketMessage(ws, {
          type: "error",
          message: "Unknown action type: " + (data.type || data.action),
        });
        break;
    }
  } catch (error) {
    console.error("Error processing message:", error);
    sendWebSocketMessage(ws, {
      type: "error",
      message: "Error processing request: " + (error as Error).message,
    });
  }
};

// Setup WebSocket handlers using the new utility
const setupCompileWebSocketHandlers = (wss: WebSocketServer): void => {
  setupWebSocketServer(wss, handleWebSocketMessage);
};

// Regular HTTP endpoint for compilation (assembly, etc.)
router.post(
  "/",
  asyncRouteHandler(async (req: Request, res: Response) => {
    const {
      code,
      lang,
      compiler: selectedCompiler,
      optimization,
      action,
    } = req.body as CodeRequest;

    // Validate code - Use validateCode and pass true to enable error field
    const validation = validateCode(code, true);
    if (!validation.valid) {
      return res.status(400).send(validation.error);
    }

    // Create compilation environment
    const { tmpDir, sourceFile, outputFile, asmFile } =
      createCompilationEnvironment(lang);

    // Write code to temporary file
    fs.writeFileSync(sourceFile, code);

    try {
      // Determine compiler and options
      const compiler = getCompilerCommand(lang, selectedCompiler);
      const standardOption = getStandardOption(lang);
      const optimizationOption = optimization || "-O0";

      if (action === "assembly") {
        // Generate assembly code
        const asmCmd = `${compiler} -S -fno-asynchronous-unwind-tables ${optimizationOption} ${standardOption} "${sourceFile}" -o "${asmFile}"`;

        try {
          await executeCommand(asmCmd);
        } catch (error) {
          const sanitizedError = sanitizeOutput(error as string);
          // Apply formatting for compiler errors
          const formattedError = formatOutput(sanitizedError, "default");
          return res.status(400).send(`Compilation Error:\n${formattedError}`);
        }

        // Return assembly code
        if (!asmFile) {
          return res.status(500).send("Assembly file path is undefined");
        }
        const assemblyCode = fs.readFileSync(asmFile, "utf8");
        res.send(assemblyCode);
      } else if (action === "compile") {
        // Compile code
        const compileCmd = `${compiler} ${standardOption} ${optimizationOption} "${sourceFile}" -o "${outputFile}"`;

        try {
          await executeCommand(compileCmd);
        } catch (error) {
          return res
            .status(400)
            .send(`Compilation Error:\n${sanitizeOutput(error as string)}`);
        }

        // Execute the compiled program
        const command = `\"${outputFile}\" 2>&1`;

        try {
          const { stdout } = await executeCommand(command);
          res.send(stdout);
        } catch (error) {
          let errorMessage = "";
          const errorStr = (error as Error).toString();

          errorMessage = errorStr;
          res.status(400).send(errorMessage);
        }
      }
    } finally {
      // Clean up temporary files
      tmpDir.removeCallback();
    }
  })
);

export { router, setupCompileWebSocketHandlers };
