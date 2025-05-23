/**
 * LeakDetectSocket - Module handling memory leak detection Socket.IO communication
 */
import { getTerminalService } from "../service/terminal";
import { CompileOptions } from "../types";
import { socketManager, SocketEvents } from "./webSocketManager";
import { domUtils } from "../app";

/**
 * LeakDetectSocketManager handles the Socket.IO communication for memory leak detection
 */
export class LeakDetectSocketManager {
  /**
   * Create a new LeakDetectSocketManager
   */
  constructor() {
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for Socket.IO events
   */
  private setupEventListeners(): void {
    // Handle compilation phase
    socketManager.on(SocketEvents.LEAK_CHECK_COMPILING, () => {
      if (socketManager.getSessionType() !== "leak_detection") return;
      domUtils.showOutputPanel();
      domUtils.setOutput(
        '<div class="loading">Compiling for leak detection...</div>'
      );
    });

    // Handle leak detection running phase
    socketManager.on(SocketEvents.LEAK_CHECK_RUNNING, () => {
      // Reset any existing terminal first
      const terminalService = getTerminalService();
      terminalService.dispose();
      domUtils.showOutputPanel();

      // Set up the terminal with the correct DOM elements
      terminalService.setDomElements({
        output: document.getElementById("output"),
        outputPanel: document.getElementById("outputPanel"),
      });

      // Initialize terminal for valgrind interaction
      terminalService.setupTerminal();
    });

    // Handle leak detection report
    socketManager.on(SocketEvents.LEAK_CHECK_REPORT, (data) => {
      domUtils.showOutputPanel();

      // Display the report using domUtils.setOutput
      domUtils.setOutput(
        `<div class="bg-[var(--bg-secondary)] p-[var(--spacing-md)] font-[var(--font-mono)] leading-[1.5] whitespace-pre-wrap rounded-[var(--radius-md)] border border-[var(--border)] shadow-[var(--shadow-sm)] mb-[var(--spacing-sm)]">${
          data.report || "No leaks detected."
        }</div>`
      );

      socketManager.disconnect();
    });

    // Handle leak detection errors
    socketManager.on(SocketEvents.LEAK_CHECK_ERROR, (data) => {
      domUtils.showOutputPanel();
      if (data.output) {
        domUtils.setOutput(
          `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Compilation Error:<br>${data.output}</div>`
        );
      } else if (data.message) {
        domUtils.setOutput(
          `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Error:<br>${data.message}</div>`
        );
      }
      socketManager.disconnect();
    });

    // Handle program output during leak detection
    socketManager.on(SocketEvents.OUTPUT, (data) => {
      // Only process output for leak detection session
      if (socketManager.getSessionType() === "leak_detection") {
        const terminalService = getTerminalService();
        terminalService.write(data.output);
      }
    });

    // Handle general errors
    socketManager.on(SocketEvents.ERROR, (data) => {
      // Only process errors for leak detection session
      if (socketManager.getSessionType() === "leak_detection") {
        console.error("Received error from server:", data.message);
        const terminalService = getTerminalService();
        terminalService.writeError(data.message);
      }
    });
  }

  /**
   * Start leak detection using Socket.IO communication
   * @param options Compilation options including code, language, compiler, etc.
   */
  async startLeakDetection(options: CompileOptions): Promise<void> {
    if (options.code.trim() === "") {
      domUtils.setOutput(
        '<div class="error-output">Error: Code cannot be empty</div>'
      );
      return;
    }

    try {
      domUtils.showOutputPanel();
      domUtils.setOutput('<div class="loading">Connecting...</div>');

      await socketManager.connect();

      // Set session type to leak_detection
      socketManager.setSessionType("leak_detection");

      domUtils.setOutput(
        '<div class="loading">Sending code for leak detection...</div>'
      );

      await socketManager.emit(SocketEvents.LEAK_CHECK, {
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

export default LeakDetectSocketManager;
