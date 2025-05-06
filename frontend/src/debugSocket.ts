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
    // map of event names to their handlers
    const eventHandlers = {
      [SocketEvents.COMPILING]: () => {
        this.stateUpdater.showOutput();
        this.stateUpdater.refreshEditor();
        this.updateDebugState();
      },

      [SocketEvents.DEBUG_START]: (data) => {
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
        if (!terminal) return;

        this.stateUpdater.setDebuggingActive(true);
        this.updateDebugState();

        if (data?.message) {
          terminalManager.write(`${data.message}\r\n\r\n`);
        }
      },

      [SocketEvents.DEBUG_RESPONSE]: (data) => {
        if (data?.output) {
          terminalManager.write(data.output);
        }
      },

      [SocketEvents.DEBUG_ERROR]: (data) => {
        console.error("Received debug error from server:", data.message);
        terminalManager.writeError(`\r\nError: ${data.message}\r\n`);
        this.stateUpdater.setDebuggingActive(false);
        this.updateDebugState();
      },

      [SocketEvents.DEBUG_EXIT]: (data) => {
        terminalManager.writeExitMessage(data.code);
        socketManager.disconnect();
        this.stateUpdater.setDebuggingActive(false);
        this.updateDebugState();
      },

      [SocketEvents.COMPILE_ERROR]: () => {
        this.stateUpdater.showOutput();
        socketManager.disconnect();
        this.updateDebugState();
      },

      [SocketEvents.ERROR]: (data) => {
        console.error("Received error from server:", data.message);
        terminalManager.writeError(`\r\nError: ${data.message}\r\n`);
      },
    };

    // Register all event handlers at once
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      socketManager.on(event, handler);
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
    if (socketManager.isProcessRunning() || !options.code.trim()) {
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
      socketManager.disconnect();
    }
  }

  /**
   * Send a GDB command to the debug session
   * @param command GDB command to execute
   */
  async sendDebugCommand(command: string): Promise<void> {
    if (!command) return;

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
