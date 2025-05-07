/**
 * DebugSocket - Module handling GDB debugging-related Socket.IO communication
 */
import { terminalManager } from "./terminal";
import { CompileOptions, DebugStateUpdater } from "./types";
import { socketManager, SocketEvents } from "./websocket";

/**
 * DebugSocketManager handles the Socket.IO communication for GDB debugging
 * Mirrors the backend's debug websocket handling structure
 */
export class DebugSocketManager {
  private stateUpdater: DebugStateUpdater;

  /**
   * Create a new DebugSocketManager
   * @param stateUpdater Interface to update UI state based on socket events
   */
  constructor(stateUpdater: DebugStateUpdater) {
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
      this.stateUpdater.refreshEditor();
      this.updateDebugState();
    });

    // Handle debugging events
    socketManager.on(SocketEvents.DEBUG_START, (data) => {
      // Reset any existing terminal first
      terminalManager.dispose();

      this.stateUpdater.showOutput();

      // Setup a terminal for GDB interaction
      terminalManager.setDomElements({
        output: document.getElementById("output"),
        outputPanel: document.getElementById("outputPanel"),
      });

      // Initialize the terminal - this creates an xterm.js instance
      const terminal = terminalManager.setupTerminal();
      if (!terminal) {
        return;
      }

      this.stateUpdater.setDebuggingActive(true);
      this.updateDebugState();

      if (data && data.message) {
        terminalManager.write(`${data.message}\r\n\r\n`);
      }
    });

    socketManager.on(SocketEvents.DEBUG_RESPONSE, (data) => {
      if (data && data.output) {
        // Send GDB output directly to terminal
        terminalManager.write(data.output);
      }
    });

    socketManager.on(SocketEvents.DEBUG_ERROR, (data) => {
      console.error("Received debug error from server:", data.message);
      terminalManager.writeError(`\r\nError: ${data.message}\r\n`);
      this.stateUpdater.setDebuggingActive(false);
      this.updateDebugState();
    });

    socketManager.on(SocketEvents.DEBUG_EXIT, (data) => {
      // Display the exit message
      terminalManager.writeExitMessage(data.code);
      socketManager.disconnect();
      this.stateUpdater.setDebuggingActive(false);
      this.updateDebugState();
    });

    // Handle error and exit events
    socketManager.on(SocketEvents.COMPILE_ERROR, (data) => {
      this.stateUpdater.showOutput();
      socketManager.disconnect();
      this.updateDebugState();
    });

    socketManager.on(SocketEvents.ERROR, (data) => {
      console.error("Received error from server:", data.message);
      terminalManager.writeError(`\r\nError: ${data.message}\r\n`);
    });
  }

  /**
   * Update the UI based on the current debug state
   */
  private updateDebugState(): void {
    this.stateUpdater.updateDebugState(socketManager.getCompilationState());
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
        this.stateUpdater.setDebuggingActive(false);
      }
    } catch (error) {
      console.error("Failed to handle cleanup:", error);
    }
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
   * Send a GDB command to the debug session
   * @param command GDB command to execute
   */
  async sendDebugCommand(command: string): Promise<void> {
    try {
      await socketManager.emit(SocketEvents.DEBUG_COMMAND, { command });
    } catch (error) {
      console.error("Failed to send debug command:", error);
    }
  }

  /**
   * Send standard input to the running program under GDB
   * @param input Input to send
   */
  async sendInput(input: string): Promise<void> {
    try {
      await socketManager.sendInput(input);
    } catch (error) {
      console.error("Failed to send input to debug session:", error);
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
      console.error("Failed to resize debug terminal:", error);
    }
  }
}

export default DebugSocketManager;
