/**
 * CompileSocket - Module handling compilation-related Socket.IO communication
 */
import { getTerminalService } from "../service/terminal";
import { CompileOptions, CompileStateUpdater } from "../types";
import { socketManager, SocketEvents } from "./webSocketManager";

/**
 * CompileSocketManager handles the Socket.IO communication for code compilation
 */
export class CompileSocketManager {
  private stateUpdater: CompileStateUpdater;

  /**
   * Create a new CompileSocketManager
   * @param stateUpdater Interface to update UI based on socket events
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
    });

    socketManager.on(SocketEvents.COMPILE_SUCCESS, () => {
      // Reset any existing terminal first
      const terminalService = getTerminalService();
      terminalService.dispose();

      this.stateUpdater.showOutput();

      // Set up the terminal with the correct DOM elements
      terminalService.setDomElements({
        output: document.getElementById("output"),
        outputPanel: document.getElementById("outputPanel"),
      });

      // Initialize terminal
      terminalService.setupTerminal();
      this.stateUpdater.refreshEditor();
    });

    socketManager.on(SocketEvents.COMPILE_ERROR, (data) => {
      this.stateUpdater.showOutput();
      this.showOutputMessage(
        `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Compilation Error:<br>${data.output}</div>`
      );
      socketManager.disconnect();
    });

    // Handle execution events
    socketManager.on(SocketEvents.OUTPUT, (data) => {
      // Only process output for compilation session
      if (socketManager.getSessionType() === "compilation") {
        const terminalService = getTerminalService();
        terminalService.write(data.output);
      }
    });

    socketManager.on(SocketEvents.ERROR, (data) => {
      // Only process errors for compilation session
      if (socketManager.getSessionType() === "compilation") {
        console.error("Received error from server:", data.message);
        const terminalService = getTerminalService();
        terminalService.writeError(data.message);
      }
    });

    socketManager.on(SocketEvents.EXIT, (data) => {
      // Display the exit message
      const terminalService = getTerminalService();
      terminalService.writeExitMessage(data.code);
      socketManager.disconnect();
    });
  }

  /**
   * Clean up the Socket.IO connection and send cleanup request to server
   */
  cleanup(): void {
    socketManager
      .cleanupSession()
      .catch((error) => console.error("Cleanup failed:", error));
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

      // Set session type to compilation
      socketManager.setSessionType("compilation");

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
