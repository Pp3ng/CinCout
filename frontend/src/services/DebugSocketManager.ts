/**
 * DebugSocketManager - Module handling debugging-related Socket.IO communication
 */
import { terminalManager } from "./TerminalManager";
import { CompileOptions, DebugStateUpdater } from "../types";
import { socketManager, SocketEvents } from "./WebSocketManager";

/**
 * DebugSocketManager handles WebSocket communication for GDB debug sessions
 */
export class DebugSocketManager {
  private stateUpdater: DebugStateUpdater;
  private debugPrompt = "(gdb) ";

  /**
   * Create a new DebugSocketManager
   * @param stateUpdater - Interface to update UI state based on socket events
   */
  constructor(stateUpdater: DebugStateUpdater) {
    this.stateUpdater = stateUpdater;
    this.setupEventListeners();
  }

  /**
   * Set up listeners for debugging-related events
   */
  private setupEventListeners(): void {
    // Define all event handlers
    const eventHandlers = {
      [SocketEvents.COMPILING]: () => {
        this.stateUpdater.showOutput();
        this.stateUpdater.refreshEditor();
        this.updateDebugState("compiling");
      },

      [SocketEvents.DEBUG_START]: (data) => {
        // Reset any existing terminal first
        terminalManager.dispose();
        this.stateUpdater.showOutput();

        // Set up the terminal with the correct DOM elements
        terminalManager.setDomElements({
          output: document.getElementById("output"),
          outputPanel: document.getElementById("outputPanel"),
        });

        // Initialize terminal
        const terminal = terminalManager.setupTerminal();

        // Update state to show we're in debug mode
        this.stateUpdater.setDebuggingActive(true);
        this.updateDebugState("debugging");
        this.stateUpdater.refreshEditor();

        // Show startup message if provided
        if (data?.message) {
          terminalManager.write(`${data.message}\r\n\r\n`);
        }
      },

      [SocketEvents.DEBUG_RESPONSE]: (data) => {
        if (data.output) {
          terminalManager.write(data.output);
        }
      },

      [SocketEvents.DEBUG_ERROR]: (data) => {
        console.error("Received debug error from server:", data.message);
        terminalManager.writeError(`\r\nError: ${data.message}\r\n`);
        this.stateUpdater.setDebuggingActive(false);
        this.updateDebugState("idle");

        // Ensure we reset the socket state
        socketManager.setProcessRunning(false);
      },

      [SocketEvents.DEBUG_EXIT]: (data) => {
        terminalManager.writeExitMessage(data.code);

        // First set debug state to idle
        this.stateUpdater.setDebuggingActive(false);
        this.updateDebugState("idle");

        // Then disconnect socket after display is updated
        socketManager.disconnect();

        // Ensure we reset the socket state
        socketManager.setProcessRunning(false);
      },

      [SocketEvents.COMPILE_ERROR]: () => {
        this.stateUpdater.showOutput();

        // First set debug state to idle
        this.updateDebugState("idle");

        // Then disconnect socket
        socketManager.disconnect();

        // Ensure we reset the socket state
        socketManager.setProcessRunning(false);
      },

      [SocketEvents.ERROR]: (data) => {
        console.error("Received error from server:", data.message);
        terminalManager.writeError(`\r\nError: ${data.message}\r\n`);
      },
    };

    // Register all event handlers
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      socketManager.on(event, handler);
    });
  }

  /**
   * Update debug state and notify UI
   * @param state - New debug state
   */
  private updateDebugState(state: string): void {
    this.stateUpdater.updateDebugState(state);
  }

  /**
   * Start a debug session
   * @param options - Compilation options for the code to debug
   */
  async startDebugSession(options: CompileOptions): Promise<void> {
    if (socketManager.isProcessRunning()) {
      return;
    }

    if (!options.code.trim()) {
      this.showOutputMessage(
        '<div class="error-output">Error: Code cannot be empty</div>'
      );
      return;
    }

    try {
      // Make sure we start with a clean terminal regardless of previous state
      terminalManager.dispose();

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
      socketManager.setProcessRunning(false); // Ensure socket state is reset
    }
  }

  /**
   * Send a GDB command to the debug session
   * @param command - GDB command to execute
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
   * Clean up debug connections
   */
  cleanup(): void {
    try {
      const sessionId = socketManager.getSessionId();
      if (sessionId && socketManager.isConnected()) {
        socketManager
          .emit(SocketEvents.CLEANUP)
          .catch((e) => console.error("Error sending cleanup message:", e));
      }

      // Disconnect socket
      socketManager.disconnect();

      // Reset debug states
      this.stateUpdater.setDebuggingActive(false);

      // Make sure the socket state is reset
      socketManager.setProcessRunning(false);

      // Make sure to dispose of the terminal to clean up resources
      terminalManager.dispose();
    } catch (error) {
      console.error("Failed to handle debug cleanup:", error);
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

export default DebugSocketManager;
