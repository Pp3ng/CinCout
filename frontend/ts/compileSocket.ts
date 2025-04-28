/**
 * CompileSocket - Module handling compilation-related WebSocket communication
 */

import { terminalManager } from "./terminal";
import { CompilationState } from "./websocket";

// Interface for compile options
export interface CompileOptions {
  lang: string;
  compiler: string;
  optimization: string;
  code: string;
}

// Interface for WebSocket messages
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

// Interface for the Socket API
export interface CinCoutSocket {
  init: (messageHandler: (event: MessageEvent) => void) => void;
  sendData: (data: any) => Promise<void>;
  isConnected: () => boolean;
  getSessionId: () => string | null;
  setSessionId: (id: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  setProcessRunning: (running: boolean) => void;
  isProcessRunning: () => boolean;
  updateStateFromMessage: (type: string) => void;
  getCompilationState: () => CompilationState | string;
}

// Interface for UI state updates
export interface CompileStateUpdater {
  updateCompilationState: (state: CompilationState | string) => void;
  showOutput: () => void;
  activateOutputTab: () => void;
  refreshEditor: () => void;
}

/**
 * CompileSocketManager handles the WebSocket communication for code compilation
 */
export class CompileSocketManager {
  private socket: CinCoutSocket;
  private stateUpdater: CompileStateUpdater;

  /**
   * Create a new CompileSocketManager
   *
   * @param socket WebSocket interface for communication
   * @param stateUpdater Interface to update UI state based on socket events
   */
  constructor(socket: CinCoutSocket, stateUpdater: CompileStateUpdater) {
    this.socket = socket;
    this.stateUpdater = stateUpdater;
    this.socket.init(this.handleWebSocketMessage.bind(this));
  }

  /**
   * Clean up the WebSocket connection and send cleanup request to server
   */
  cleanup(): void {
    try {
      const sessionId = this.socket.getSessionId();
      if (sessionId && this.socket.isConnected()) {
        console.log(
          `Sending cleanup request for session ${sessionId} and disconnecting...`
        );
        this.socket
          .sendData({
            type: "cleanup",
            sessionId: sessionId,
          })
          .catch((e) => console.error("Error sending cleanup message:", e));

        this.socket.disconnect();
      }
    } catch (error) {
      console.error("Failed to handle cleanup:", error);
    }
  }

  /**
   * Compile code using WebSocket communication
   *
   * @param options Compilation options including code, language, compiler, etc.
   */
  async compile(options: CompileOptions): Promise<void> {
    if (this.socket.isProcessRunning()) {
      console.log("A process is already running, ignoring compile request");
      return;
    }

    if (options.code.trim() === "") {
      this.showOutputMessage(
        '<div class="error-output">Error: Code cannot be empty</div>'
      );
      return;
    }

    try {
      this.stateUpdater.showOutput();
      this.showOutputMessage('<div class="loading">Connecting...</div>');

      await this.socket.connect();
      this.showOutputMessage(
        '<div class="loading">Sending code for compilation...</div>'
      );

      await this.socket.sendData({
        type: "compile",
        code: options.code,
        lang: options.lang,
        compiler: options.compiler,
        optimization: options.optimization,
      });
    } catch (error) {
      console.error("WebSocket operation failed:", error);
      this.showOutputMessage(
        '<div class="error-output">Error: WebSocket connection failed. Please try again.</div>'
      );

      try {
        this.socket.disconnect();
      } catch (e) {
        console.error("Error disconnecting after failure:", e);
      }
    }
  }

  /**
   * Handle WebSocket messages from the server
   *
   * @param event MessageEvent from the WebSocket
   */
  private handleWebSocketMessage(event: MessageEvent): void {
    const data = JSON.parse(event.data) as WebSocketMessage;
    this.socket.updateStateFromMessage(data.type);

    this.stateUpdater.updateCompilationState(this.socket.getCompilationState());

    switch (data.type) {
      case "connected":
        this.socket.setSessionId(data.sessionId);
        break;

      case "compiling":
        this.stateUpdater.showOutput();
        this.stateUpdater.activateOutputTab();
        this.showOutputMessage('<div class="loading">Compiling</div>');
        this.stateUpdater.refreshEditor();
        break;

      case "compile-error":
        // Handle compilation error
        this.stateUpdater.showOutput();
        this.stateUpdater.activateOutputTab();
        this.showOutputMessage(
          `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Compilation Error:<br>${data.output}</div>`
        );
        this.socket.disconnect();
        break;

      case "compile-success":
        // Reset any existing terminal first
        terminalManager.dispose();

        this.stateUpdater.showOutput();
        this.stateUpdater.activateOutputTab();

        // Set up the terminal with the correct DOM elements
        terminalManager.setDomElements({
          output: document.getElementById("output"),
          outputPanel: document.getElementById("outputPanel"),
          outputTab: document.getElementById("outputTab"),
        });

        // Initialize terminal - this works for both regular compilation and memcheck
        terminalManager.setupTerminal();
        this.stateUpdater.refreshEditor();
        break;

      case "memcheck-start":
        this.stateUpdater.showOutput();
        this.stateUpdater.activateOutputTab();

        // Make sure terminal is ready for memcheck output if it wasn't set up by compile-success
        if (!terminalManager.getTerminal()) {
          terminalManager.setDomElements({
            output: document.getElementById("output"),
            outputPanel: document.getElementById("outputPanel"),
            outputTab: document.getElementById("outputTab"),
          });
          terminalManager.setupTerminal();
        }
        break;

      case "output":
        terminalManager.write(data.output);
        break;

      case "error":
        console.error(
          "Received error from server:",
          data.output || data.message
        );
        terminalManager.writeError(data.output || data.message);
        break;

      case "memcheck-report":
        // Display memcheck report through the terminal instead of replacing it
        if (data.output) {
          // First clear the terminal to show the formatted report cleanly
          if (terminalManager.getTerminal()) {
            // Write report to the terminal with proper formatting
            terminalManager.write(
              "\r\n\x1b[36m---- Memory Check Results ----\x1b[0m\r\n\r\n"
            );
            terminalManager.write(data.output);
            terminalManager.write(
              "\r\n\x1b[36m---- End of Memory Check ----\x1b[0m\r\n"
            );
          } else {
            // Fallback to old approach if terminal is not available
            const output = document.getElementById("output");
            if (output) {
              output.innerHTML = `<div class="memcheck-output" style="white-space: pre-wrap; overflow: visible;">${data.output}</div>`;
            }
          }

          // After displaying the memcheck report, disconnect the WebSocket
          setTimeout(() => {
            this.socket.disconnect();
          }, 100);
        }
        break;

      case "exit":
        // First display the exit message
        terminalManager.writeExitMessage(data.code);

        // If we're running a memcheck session, immediately show the "waiting for report" message
        if (data.isMemcheck === true) {
          const output = document.getElementById("output");
          if (output) {
            output.innerHTML = `<div class="loading">Processing memory check results...</div>`;
          }
          // Don't disconnect - wait for the memcheck-report message
        } else {
          // Regular run - disconnect immediately
          this.socket.disconnect();
        }
        break;

      default:
        console.log(`Unknown message type: ${data.type}`);
    }
  }

  /**
   * Display a message in the output panel
   */
  private showOutputMessage(html: string): void {
    const output = document.getElementById("output");
    if (output) {
      output.innerHTML = html;
    }
  }
}

export default CompileSocketManager;
