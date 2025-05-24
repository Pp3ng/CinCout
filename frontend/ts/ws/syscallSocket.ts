/**
 * SyscallSocket - Module handling strace system call tracing Socket.IO communication
 */
import { getTerminalService } from "../service/terminal";
import { getEditorService } from "../service/editor";
import { CompileOptions } from "../types";
import { socketManager, SocketEvents } from "./webSocketManager";
import { domUtils } from "../app";

/**
 * SyscallSocketManager handles the Socket.IO communication for strace system call tracing
 */
export class SyscallSocketManager {
  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Handle compilation events
    socketManager.on(SocketEvents.COMPILING, () => {
      if (socketManager.getSessionType() !== "strace") return;
      domUtils.showOutputPanel();
      domUtils.showLoadingInOutput("Compiling for syscall tracing...");
    });

    // Handle strace events
    socketManager.on(SocketEvents.STRACE_START, (data) => {
      // Reset any existing terminal first
      const terminalService = getTerminalService();
      terminalService.dispose();

      domUtils.showOutputPanel();

      // Setup a terminal for strace output
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

    socketManager.on(SocketEvents.STRACE_RESPONSE, (data) => {
      // Only process strace responses for strace session
      if (socketManager.getSessionType() === "strace" && data && data.output) {
        // Send strace output directly to terminal
        const terminalService = getTerminalService();
        terminalService.write(data.output);
      }
    });

    socketManager.on(SocketEvents.STRACE_REPORT, (data) => {
      domUtils.showOutputPanel();

      // Clear existing terminal
      const terminalService = getTerminalService();
      terminalService.dispose();

      // Display strace report in a code editor view
      const output = document.getElementById("output");
      if (output) {
        output.innerHTML = '<div id="strace-view-container"></div>';
        const container = document.getElementById("strace-view-container");

        // Initialize code editor for strace output
        const editorService = getEditorService();
        const straceView = editorService.createReadOnlyEditor();

        if (straceView && container) {
          // Set strace output in the editor with C-like syntax highlighting
          editorService.setStraceValue(data.report || "No syscalls detected.");
          container.appendChild(straceView.getWrapperElement());
          setTimeout(() => straceView.refresh(), 10);
        }
      }

      socketManager.disconnect();
    });

    socketManager.on(SocketEvents.STRACE_ERROR, (data) => {
      // Only process strace errors for strace session
      if (socketManager.getSessionType() === "strace") {
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
      }

      socketManager.disconnect();
    });

    // Handle error and exit events
    socketManager.on(SocketEvents.COMPILE_ERROR, (data) => {
      domUtils.showOutputPanel();
      domUtils.setOutput(
        `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">${data.output}</div>`
      );
      socketManager.disconnect();
    });

    socketManager.on(SocketEvents.ERROR, (data) => {
      // Only process general errors for strace session
      if (socketManager.getSessionType() === "strace") {
        const terminalService = getTerminalService();
        terminalService.writeError(`\r\nError: ${data.message}\r\n`);
      }
    });
  }

  /**
   * Start a strace session using Socket.IO communication
   * @param options Compilation options including code, language, compiler, etc.
   */
  async startSyscallTracing(options: CompileOptions): Promise<void> {
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

      // Set session type to strace
      socketManager.setSessionType("strace");

      domUtils.showLoadingInOutput("Setting up syscall tracing...");

      // Emit strace start request to server
      socketManager
        .emit(SocketEvents.STRACE_START, {
          code: options.code,
          lang: options.lang,
          compiler: options.compiler,
          optimization: options.optimization,
        })
        .catch(() => {
          domUtils.setOutput(
            '<div class="error-output">Error: Failed to send strace request. Please try again.</div>'
          );
          socketManager.disconnect();
        });
    } catch (error) {
      domUtils.setOutput(
        '<div class="error-output">Error: Socket connection failed. Please try again.</div>'
      );

      socketManager.disconnect();
    }
  }
}

export default SyscallSocketManager;
