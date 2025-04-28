/**
 * WebSocket handler for code compilation and execution
 */
import { WebSocketServer } from "ws";
import {
  compileCode,
  createCompilationEnvironment,
  writeCodeToFile,
} from "../utils/compilationService";
import {
  setupWebSocketServer,
  sendWebSocketMessage,
  ExtendedWebSocket,
} from "../utils/webSocketHandler";
import {
  startCompilationSession,
  sendInputToSession,
  resizeTerminal,
  terminateSession,
  initSessionService,
} from "../utils/sessionService";

// Initialize session service
initSessionService();

// Message handler for WebSocket connections
const handleCompileWebSocketMessage = (
  ws: ExtendedWebSocket,
  data: any
): void => {
  const sessionId = ws.sessionId;

  if (!sessionId) {
    sendWebSocketMessage(ws, {
      type: "error",
      message: "Session ID not found",
    });
    return;
  }

  try {
    switch (data.type) {
      case "compile":
        // Handle compilation request
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
        if (!sendInputToSession(sessionId, data.input)) {
          sendWebSocketMessage(ws, {
            type: "error",
            message: "No active compilation session to receive input",
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
        terminateSession(sessionId);
        sendWebSocketMessage(ws, {
          type: "cleanup-complete",
        });
        break;

      default:
        sendWebSocketMessage(ws, {
          type: "error",
          message: "Unknown action type: " + data.type,
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

// Compile and run code with PTY for true terminal experience
const compileAndRunWithPTY = (
  ws: ExtendedWebSocket,
  sessionId: string,
  code: string,
  lang: string,
  compiler?: string,
  optimization?: string
): void => {
  // Create compilation environment
  const env = createCompilationEnvironment(lang);

  try {
    // Write code to temporary file
    writeCodeToFile(env.sourceFile, code);

    // Notify client that compilation has started
    sendWebSocketMessage(ws, { type: "compiling" });

    // Compile the code
    compileCode(env, code, { lang, compiler, optimization })
      .then((result) => {
        if (result.success) {
          // Compilation successful, notify client
          sendWebSocketMessage(ws, { type: "compile-success" });

          // Start compilation session with PTY
          const success = startCompilationSession(
            ws,
            sessionId,
            env.tmpDir,
            env.outputFile
          );

          if (!success) {
            // Clean up on PTY creation error
            env.tmpDir.removeCallback();
          }
        } else {
          // Compilation error
          sendWebSocketMessage(ws, {
            type: "compile-error",
            output: result.error,
          });

          // Clean up temporary directory
          env.tmpDir.removeCallback();
        }
      })
      .catch((error) => {
        // Unexpected error
        console.error(`Unexpected error for session ${sessionId}:`, error);
        sendWebSocketMessage(ws, {
          type: "error",
          message: "Unexpected error: " + (error as Error).message,
        });

        // Clean up temporary directory
        env.tmpDir.removeCallback();
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
    env.tmpDir.removeCallback();
  }
};

// Setup WebSocket handlers for compilation
const setupCompileWebSocketHandlers = (wss: WebSocketServer): void => {
  setupWebSocketServer(wss, handleCompileWebSocketMessage);
};

export { setupCompileWebSocketHandlers };
