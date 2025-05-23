/**
 * DebugSocket - Module handling GDB debugging-related Socket.IO communication
 */
import { getTerminalService } from "../service/terminal";
import { CompileOptions } from "../types";
import { socketManager, SocketEvents } from "./webSocketManager";
import { domUtils } from "../app";

/**
 * DebugSocketManager handles the Socket.IO communication for GDB debugging
 */
export class DebugSocketManager {
  /**
   * Create a new DebugSocketManager
   */
  constructor() {
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for Socket.IO events
   */
  private setupEventListeners(): void {
    // Handle compilation events
    socketManager.on(SocketEvents.COMPILING, () => {
      domUtils.showOutputPanel();
    });

    // Handle debugging events
    socketManager.on(SocketEvents.DEBUG_START, (data) => {
      // Reset any existing terminal first
      const terminalService = getTerminalService();
      terminalService.dispose();

      domUtils.showOutputPanel();

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
    socketManager.on(SocketEvents.COMPILE_ERROR, () => {
      domUtils.showOutputPanel();
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
   * Start a debug session using Socket.IO communication
   * @param options Compilation options including code, language, compiler, etc.
   */
  async startDebugSession(options: CompileOptions): Promise<void> {
    if (options.code.trim() === "") {
      return;
    }

    try {
      domUtils.showOutputPanel();

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
}

export default DebugSocketManager;
