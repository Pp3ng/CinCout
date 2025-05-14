/**
 * DebugSocket - Module handling GDB debugging-related Socket.IO communication
 */
import { getTerminalService } from "../service/terminal";
import { CompileOptions, StateUpdater } from "../types";
import { socketManager, SocketEvents } from "./webSocketManager";

/**
 * DebugSocketManager handles the Socket.IO communication for GDB debugging
 */
export class DebugSocketManager {
  private stateUpdater: StateUpdater;

  /**
   * Create a new DebugSocketManager
   * @param stateUpdater Interface to update UI based on socket events
   */
  constructor(stateUpdater: StateUpdater) {
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
    });

    // Handle debugging events
    socketManager.on(SocketEvents.DEBUG_START, (data) => {
      // Reset any existing terminal first
      const terminalService = getTerminalService();
      terminalService.dispose();

      this.stateUpdater.showOutput();

      // Setup a terminal for GDB interaction
      terminalService.setDomElements({
        output: document.getElementById("output"),
        outputPanel: document.getElementById("outputPanel"),
      });

      // Initialize the terminal - this creates an xterm.js instance
      const terminal = terminalService.setupTerminal();
      if (!terminal) {
        return;
      }

      if (data && data.message) {
        terminalService.write(`${data.message}\r\n\r\n`);
      }
    });

    socketManager.on(SocketEvents.DEBUG_RESPONSE, (data) => {
      // Only process debug responses for debug session
      if (socketManager.getSessionType() === "debug" && data && data.output) {
        // Send GDB output directly to terminal
        const terminalService = getTerminalService();
        terminalService.write(data.output);
      }
    });

    socketManager.on(SocketEvents.DEBUG_ERROR, (data) => {
      // Only process debug errors for debug session
      if (socketManager.getSessionType() === "debug") {
        console.error("Received debug error from server:", data.message);
        const terminalService = getTerminalService();
        terminalService.writeError(`\r\nError: ${data.message}\r\n`);
      }
    });

    socketManager.on(SocketEvents.DEBUG_EXIT, (data) => {
      // Display the exit message
      const terminalService = getTerminalService();
      terminalService.writeExitMessage(data.code);
      socketManager.disconnect();
    });

    // Handle error and exit events
    socketManager.on(SocketEvents.COMPILE_ERROR, (data) => {
      this.stateUpdater.showOutput();
      socketManager.disconnect();
    });

    socketManager.on(SocketEvents.ERROR, (data) => {
      // Only process general errors for debug session
      if (socketManager.getSessionType() === "debug") {
        console.error("Received error from server:", data.message);
        const terminalService = getTerminalService();
        terminalService.writeError(`\r\nError: ${data.message}\r\n`);
      }
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
   * Start a debug session using Socket.IO communication
   * @param options Compilation options including code, language, compiler, etc.
   */
  async startDebugSession(options: CompileOptions): Promise<void> {
    if (socketManager.isProcessRunning()) {
      return;
    }

    if (options.code.trim() === "") {
      return;
    }

    try {
      this.stateUpdater.showOutput();

      await socketManager.connect();

      // Set session type to debug
      socketManager.setSessionType("debug");

      await socketManager.emit(SocketEvents.DEBUG_START, {
        code: options.code,
        lang: options.lang,
        compiler: options.compiler,
      });
    } catch (error) {
      console.error("Debug socket operation failed:", error);

      try {
        socketManager.disconnect();
      } catch (e) {
        console.error("Error disconnecting after debug failure:", e);
      }
    }
  }

  /**
   * Send input to the running program under GDB
   * This handles both GDB commands and program input
   * @param input Input to send
   */
  async sendInput(input: string): Promise<void> {
    try {
      // For GDB commands, we need to add a newline
      const inputWithNewline = input.endsWith("\n") ? input : input + "\n";
      await socketManager.sendInput(inputWithNewline);
    } catch (error) {
      console.error("Failed to send input to debug session:", error);
    }
  }
}

export default DebugSocketManager;
