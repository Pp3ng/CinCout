/**
 * CompileSocket - Module handling compilation-related Socket.IO communication
 */
import { getTerminalService } from "../service/terminal";
import { CompileOptions } from "../types";
import { socketManager, SocketEvents } from "./webSocketManager";
import { domUtils } from "../app";

/**
 * CompileSocketManager handles the Socket.IO communication for code compilation
 */
export class CompileSocketManager {
  /**
   * Create a new CompileSocketManager
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
      if (socketManager.getSessionType() !== "compilation") return;
      domUtils.showOutputPanel();
      domUtils.showLoadingInOutput("Compiling");
    });

    socketManager.on(SocketEvents.COMPILE_SUCCESS, () => {
      // Reset any existing terminal first
      const terminalService = getTerminalService();
      terminalService.dispose();
      domUtils.showOutputPanel();

      // Set up the terminal with the correct DOM elements
      terminalService.setDomElements({
        output: document.getElementById("output"),
        outputPanel: document.getElementById("outputPanel"),
      });

      // Initialize terminal
      terminalService.setupTerminal();
    });

    socketManager.on(SocketEvents.COMPILE_ERROR, (data) => {
      domUtils.showOutputPanel();
      domUtils.setOutput(
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
   * Compile code using Socket.IO communication
   * @param options Compilation options including code, language, compiler, etc.
   */
  async compile(options: CompileOptions): Promise<void> {
    if (options.code.trim() === "") {
      domUtils.setOutput(
        '<div class="error-output">Error: Code cannot be empty</div>'
      );
      return;
    }

    try {
      domUtils.showOutputPanel();
      domUtils.showLoadingInOutput("Connecting...");

      await socketManager.connect();

      // Set session type to compilation
      socketManager.setSessionType("compilation");

      domUtils.showLoadingInOutput("Sending code for compilation...");

      await socketManager.emit(SocketEvents.COMPILE, {
        code: options.code,
        lang: options.lang,
        compiler: options.compiler,
        optimization: options.optimization,
      });
    } catch (error) {
      console.error("Socket operation failed:", error);
      domUtils.setOutput(
        '<div class="error-output">Error: Socket connection failed. Please try again.</div>'
      );

      try {
        socketManager.disconnect();
      } catch (e) {
        console.error("Error disconnecting after failure:", e);
      }
    }
  }
}

export default CompileSocketManager;
