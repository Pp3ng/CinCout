/**
 * CompileSocket - Module handling compilation-related Socket.IO communication
 */
import { terminalManager } from "./terminal";
import { CompileOptions, CompileStateUpdater } from "./types";
import { socketManager, SocketEvents } from "./websocket";

/**
 * CompileSocketManager handles the Socket.IO communication for code compilation
 * Mirrors the backend CompileWebSocketHandler structure
 */
export class CompileSocketManager {
  private stateUpdater: CompileStateUpdater;

  /**
   * Create a new CompileSocketManager
   * @param stateUpdater Interface to update UI state based on socket events
   */
  constructor(stateUpdater: CompileStateUpdater) {
    this.stateUpdater = stateUpdater;
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for Socket.IO events
   */
  private setupEventListeners(): void {
    // Handle compilation events
    socketManager.on(SocketEvents.COMPILING, () => {
      this.stateUpdater.showOutput();
      this.showOutputMessage('<div class="loading">Compiling</div>');
      this.stateUpdater.refreshEditor();
      this.updateCompilationState();
    });

    socketManager.on(SocketEvents.COMPILE_SUCCESS, () => {
      // Reset any existing terminal first
      terminalManager.dispose();

      this.stateUpdater.showOutput();

      // Set up the terminal with the correct DOM elements
      terminalManager.setDomElements({
        output: document.getElementById("output"),
        outputPanel: document.getElementById("outputPanel"),
      });

      // Initialize terminal
      terminalManager.setupTerminal();
      this.stateUpdater.refreshEditor();
      this.updateCompilationState();
    });

    socketManager.on(SocketEvents.COMPILE_ERROR, (data) => {
      this.stateUpdater.showOutput();
      this.showOutputMessage(
        `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Compilation Error:<br>${data.output}</div>`
      );
      socketManager.disconnect();
      this.updateCompilationState();
    });

    // Handle execution events
    socketManager.on(SocketEvents.OUTPUT, (data) => {
      terminalManager.write(data.output);
    });

    socketManager.on(SocketEvents.ERROR, (data) => {
      console.error("Received error from server:", data.message);
      terminalManager.writeError(data.message);
    });

    socketManager.on(SocketEvents.EXIT, (data) => {
      // Display the exit message
      terminalManager.writeExitMessage(data.code);

      socketManager.disconnect();

      this.updateCompilationState();
    });
  }

  /**
   * Update the UI based on the current compilation state
   */
  private updateCompilationState(): void {
    this.stateUpdater.updateCompilationState(
      socketManager.getCompilationState()
    );
  }

  /**
   * Clean up the Socket.IO connection and send cleanup request to server
   */
  cleanup(): void {
    try {
      const sessionId = socketManager.getSessionId();
      if (sessionId && socketManager.isConnected()) {
        socketManager
          .emit(SocketEvents.CLEANUP)
          .catch((e) => console.error("Error sending cleanup message:", e));

        socketManager.disconnect();
      }
    } catch (error) {
      console.error("Failed to handle cleanup:", error);
    }
  }

  /**
   * Compile code using Socket.IO communication
   * @param options Compilation options including code, language, compiler, etc.
   */
  async compile(options: CompileOptions): Promise<void> {
    if (socketManager.isProcessRunning()) {
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

      await socketManager.connect();
      this.showOutputMessage(
        '<div class="loading">Sending code for compilation...</div>'
      );

      await socketManager.emit(SocketEvents.COMPILE, {
        code: options.code,
        lang: options.lang,
        compiler: options.compiler,
        optimization: options.optimization,
      });
    } catch (error) {
      console.error("Socket operation failed:", error);
      this.showOutputMessage(
        '<div class="error-output">Error: Socket connection failed. Please try again.</div>'
      );

      try {
        socketManager.disconnect();
      } catch (e) {
        console.error("Error disconnecting after failure:", e);
      }
    }
  }

  /**
   * Send input to the running program
   * @param input Input to send
   */
  async sendInput(input: string): Promise<void> {
    try {
      await socketManager.sendInput(input);
    } catch (error) {
      console.error("Failed to send input:", error);
    }
  }

  /**
   * Resize the terminal
   * @param cols Number of columns
   * @param rows Number of rows
   */
  async resizeTerminal(cols: number, rows: number): Promise<void> {
    try {
      await socketManager.resizeTerminal(cols, rows);
    } catch (error) {
      console.error("Failed to resize terminal:", error);
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
