/**
 * TerminalManager.ts
 * Manages terminal functionality
 */
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { TerminalDomElements, TerminalOptions } from "../types";
import { socketManager, SocketEvents } from "./WebSocketManager";

// Import the CSS
import "@xterm/xterm/css/xterm.css";

/**
 * TerminalManager - Manages terminal functionality
 */
class TerminalManager {
  // Component state
  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private domElements: TerminalDomElements = {};
  private resizeTimeout: ReturnType<typeof setTimeout> | null = null;
  private resizeDebounceTime = 100; // ms

  /**
   * Initialize the terminal manager with DOM elements
   * @param elements - DOM elements required for terminal operation
   */
  constructor(elements: TerminalDomElements = {}) {
    this.domElements = elements;
  }

  /**
   * Set DOM elements
   * @param elements - DOM elements to set
   */
  setDomElements = (elements: TerminalDomElements): void => {
    this.domElements = { ...this.domElements, ...elements };
  };

  /**
   * Sync with an existing terminal instance from useTerminal hook
   * This ensures that TerminalManager can work with a terminal instance
   * created by React components
   */
  syncWithTerminal = (terminal: Terminal): void => {
    // If we already have a terminal instance, dispose it first
    if (this.terminal && this.terminal !== terminal) {
      try {
        this.terminal.dispose();
      } catch (e) {
        console.error("Error disposing existing terminal:", e);
      }
    }

    // Set the new terminal instance
    this.terminal = terminal;
  };

  /**
   * Create and set up the terminal
   */
  setupTerminal = (): Terminal => {
    // Clear previous content
    if (this.domElements.output) {
      this.domElements.output.innerHTML =
        '<div id="terminal-container" class="terminal-container"></div>';
    }

    // Get terminal theme
    const currentTheme = (window as any).getTerminalTheme
      ? (window as any).getTerminalTheme()
      : {};

    // Create terminal config
    const terminalOptions: TerminalOptions = {
      cursorBlink: true,
      cursorStyle: "block",
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      theme: currentTheme,
      allowTransparency: true,
      rendererType: "dom",
      convertEol: true, // Ensure line ending conversion
    };

    // Create terminal instance with options
    this.terminal = new Terminal(terminalOptions);
    (window as any).terminal = this.terminal;

    // Create and load fit addon
    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);

    // Open terminal in container
    const terminalContainer = document.getElementById("terminal-container");
    if (!terminalContainer) {
      console.error("Terminal container not found");
      throw new Error("Terminal container not found");
    }

    this.terminal.open(terminalContainer);

    // Add custom key event handler after opening
    this.terminal.attachCustomKeyEventHandler(this.handleTerminalKeyEvents);

    // Fit terminal to container
    this.fitTerminal();

    // Setup effects after render - without setTimeout
    this.setupAfterRender();

    // Set up event handlers
    this.setupEventListeners();

    return this.terminal;
  };

  /**
   * Fit terminal to container and notify server of new dimensions
   */
  fitTerminal = (): void => {
    if (!this.terminal || !this.fitAddon) return;

    try {
      // Fit terminal to container
      this.fitAddon.fit();

      // Get new dimensions
      const cols = this.terminal.cols;
      const rows = this.terminal.rows;

      // Send resize event to server if connected and running
      if (socketManager.isConnected() && socketManager.isProcessRunning()) {
        requestAnimationFrame(() => {
          // Double-check connection is still active before sending
          if (socketManager.isConnected() && socketManager.isProcessRunning()) {
            socketManager
              .emit(SocketEvents.RESIZE, { cols, rows })
              .catch((error) => {
                // Only log serious errors, not disconnection-related ones
                if (error.message && !error.message.includes("disconnect")) {
                  console.error("Error sending resize event:", error);
                }
              });
          }
        });
      }
    } catch (e) {
      console.error("Error fitting terminal:", e);
    }
  };

  /**
   * Handle terminal keyboard events
   */
  private handleTerminalKeyEvents = (event: KeyboardEvent): boolean => {
    // Pass through all non-Escape key events to terminal
    if (event.key !== "Escape") {
      return true;
    }

    // Don't let terminal handle Escape key
    // Our global document listener will handle it
    if (event.type === "keydown" && event.key === "Escape") {
      return false;
    }

    return true;
  };

  /**
   * Set up effects after terminal is rendered
   */
  private setupAfterRender = (): void => {
    requestAnimationFrame(() => {
      // Force terminal redraw to apply new theme
      try {
        if (this.terminal) {
          this.terminal.refresh(0, this.terminal.rows - 1);
          // Apply custom cursor styling
          this.applyCursorStyling();
          // Focus terminal
          this.terminal.focus();
        }
      } catch (e) {
        console.error("Error refreshing terminal:", e);
      }
    });
  };

  /**
   * Apply custom cursor styling
   */
  private applyCursorStyling = (): void => {
    requestAnimationFrame(() => {
      const terminalContainer = document.getElementById("terminal-container");
      const cursorElement = terminalContainer?.querySelector(".xterm-cursor");
      if (cursorElement) {
        (cursorElement as HTMLElement).style.animation =
          "cursor-blink 1s step-end infinite";
        (cursorElement as HTMLElement).style.backgroundColor = getComputedStyle(
          document.documentElement
        )
          .getPropertyValue("--accent")
          .trim();
      }
    });
  };

  /**
   * Set up event listeners
   */
  private setupEventListeners = (): void => {
    // Setup terminal input handling
    this.setupTerminalInput();

    // Add resize event listener
    window.addEventListener("resize", this.handleResize);
  };

  /**
   * Handle window resize event with debouncing
   */
  private handleResize = (): void => {
    // Debounce resize events to avoid too many calls
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    this.resizeTimeout = setTimeout(() => {
      this.fitTerminal();
    }, this.resizeDebounceTime);
  };

  /**
   * Set up terminal input handling
   */
  private setupTerminalInput = (): void => {
    if (!this.terminal) return;

    // Simplified terminal input handling
    this.terminal.onData(this.handleTerminalInput);
  };

  /**
   * Handle terminal input
   */
  private handleTerminalInput = (data: string): void => {
    if (!socketManager.isProcessRunning() || !socketManager.isConnected()) {
      console.log(
        "Not sending terminal input: program not running or socket closed"
      );
      return;
    }

    // Send all input characters to the server for PTY to handle
    socketManager
      .emit(SocketEvents.INPUT, {
        input: data,
      })
      .catch((error) => {
        console.error("Error sending input to server:", error);
      });
  };

  /**
   * Write data to the terminal
   * @param data - The data to write to the terminal
   */
  write = (data: string): void => {
    if (this.terminal) {
      this.terminal.write(data);
    }
  };

  /**
   * Write error message to the terminal in red
   * @param message - Error message to write
   */
  writeError = (message: string): void => {
    if (this.terminal) {
      this.terminal.write(`\x1b[31m${message}\x1b[0m`);
    }
  };

  /**
   * Write exit message to the terminal with theme-aware styling
   * @param code - Exit code
   */
  writeExitMessage = (code: number): void => {
    if (!this.terminal) return;

    // Create styled exit message based on exit code
    let exitMessage = "";
    const isSuccess = code === 0;

    // Add newlines
    exitMessage += "\r\n";

    // Add styled message based on exit code
    if (isSuccess) {
      // Success message with exact green color
      exitMessage += `\x1b[38;2;85;219;190m[Program successfully exited with code: ${code}]\x1b[0m`;
    } else {
      if (code > 128) {
        // For signals/crashes (codes > 128), use red
        exitMessage += `\x1b[31m[Program exited with code: ${code}`;
        exitMessage += `, may have crashed (signal ${code - 128})]\x1b[0m`;
      } else {
        // For other non-zero exit codes, use exact yellow color #e6cd69
        exitMessage += `\x1b[38;2;230;205;105m[Program exited with code: ${code}`;
        exitMessage += `, may have errors]\x1b[0m`;
      }
    }

    // Add final newline
    exitMessage += "\r\n";

    // Write to terminal
    this.terminal.write(exitMessage);
  };

  /**
   * Clean up the terminal
   */
  dispose = (): void => {
    // Remove event listeners
    window.removeEventListener("resize", this.handleResize);

    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
    }

    if (this.fitAddon) {
      try {
        this.fitAddon.dispose();
        this.fitAddon = null;
      } catch (e) {
        console.error("Error disposing fit addon:", e);
      }
    }

    if (this.terminal) {
      try {
        this.terminal.dispose();
        this.terminal = null;
        (window as any).terminal = null;
      } catch (e) {
        console.error("Error disposing terminal:", e);
      }
    }
  };

  /**
   * Get the terminal instance
   */
  getTerminal = (): Terminal | null => {
    return this.terminal;
  };
}

// Create singleton instance
export const terminalManager = new TerminalManager();

// Export the Terminal type for use in other modules
export type { Terminal };
