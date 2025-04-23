// Import required modules
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

// Import the CSS with the correct path for the new @xterm package
import "@xterm/xterm/css/xterm.css";

// Interface for DOM elements
interface DomElements {
  output?: HTMLElement | null;
  outputPanel?: HTMLElement | null;
  outputTab?: HTMLElement | null;
}

// Extend FitAddon to ensure integer dimensions
class SafeFitAddon extends FitAddon {
  fit(): void {
    try {
      // Get terminal dimensions before fitting
      const terminal = (this as any)._terminal;
      if (!terminal || !terminal.element || !terminal.element.parentElement) {
        return;
      }

      // Calculate dimensions based on the container size
      const dims = this.proposeDimensions();

      if (!dims || !dims.cols || !dims.rows) {
        return;
      }

      // Ensure integer values
      const cols = Math.max(2, Math.floor(dims.cols));
      const rows = Math.max(1, Math.floor(dims.rows));

      // Directly resize with integer values instead of calling super.fit()
      // This avoids the potential floating point values that might be used internally
      terminal.resize(cols, rows);
    } catch (e) {
      console.error("Error in SafeFitAddon.fit():", e);
    }
  }
}

// Terminal manager class
class TerminalManager {
  private terminal: Terminal | null = null;
  private fitAddon: SafeFitAddon | null = null;
  private domElements: DomElements = {};

  /**
   * Initialize the terminal manager with DOM elements
   * @param elements - DOM elements required for terminal operation
   */
  constructor(elements: DomElements = {}) {
    this.domElements = elements;
  }

  /**
   * Set DOM elements
   * @param elements - DOM elements to set
   */
  setDomElements = (elements: DomElements): void => {
    this.domElements = { ...this.domElements, ...elements };
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

    // Make sure to get the correct theme first
    const currentTheme = (window as any).getTerminalTheme
      ? (window as any).getTerminalTheme()
      : {};

    // Create terminal instance
    this.terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      theme: currentTheme,
      allowTransparency: true,
      rendererType: "dom",
      convertEol: true, // Ensure line ending conversion
      // Add custom key handling to prevent terminal from capturing Escape key
      customKeyEventHandler: (event: KeyboardEvent) => {
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
      },
    });

    // Create our safer fit addon that enforces integer dimensions
    this.fitAddon = new SafeFitAddon();
    window.fitAddon = this.fitAddon;
    this.terminal.loadAddon(this.fitAddon);
    window.terminal = this.terminal;

    // Open terminal in container and resize
    const terminalContainer = document.getElementById("terminal-container");
    if (!terminalContainer) {
      console.error("Terminal container not found");
      throw new Error("Terminal container not found");
    }

    this.terminal.open(terminalContainer);

    // Ensure theme is applied and resize
    setTimeout(() => {
      this.handleTerminalResize();

      // Force terminal redraw to apply new theme
      try {
        if (this.terminal) {
          this.terminal.refresh(0, this.terminal.rows - 1);

          // Apply custom cursor styling
          setTimeout(() => {
            // Force the cursor to blink by ensuring our CSS is applied
            const cursorElement =
              terminalContainer?.querySelector(".xterm-cursor");
            if (cursorElement) {
              (cursorElement as HTMLElement).style.animation =
                "cursor-blink 1s step-end infinite";
              (cursorElement as HTMLElement).style.backgroundColor =
                getComputedStyle(document.documentElement)
                  .getPropertyValue("--accent")
                  .trim();
            }
          }, 100);
        }
      } catch (e) {
        console.error("Error refreshing terminal:", e);
      }
    }, 50);

    // Set up terminal input handling
    this.setupTerminalInput();

    // Focus terminal
    setTimeout(() => this.terminal?.focus(), 100);

    // Listen for window resize events
    window.addEventListener("resize", () => {
      this.handleTerminalResize();
    });

    // After terminal is opened, send size information to the server
    this.terminal.onResize(({ cols, rows }: { cols: number; rows: number }) => {
      if (
        window.CinCoutSocket.isConnected() &&
        window.CinCoutSocket.getCompilationState() === "running"
      ) {
        window.CinCoutSocket.sendData({
          type: "resize",
          cols: Math.floor(cols),
          rows: Math.floor(rows),
        });
      }
    });

    return this.terminal;
  };

  /**
   * Set up terminal input handling
   */
  private setupTerminalInput = (): void => {
    if (!this.terminal) return;

    // Simplified terminal input handling
    this.terminal.onData((data: string) => {
      if (
        window.CinCoutSocket.getCompilationState() !== "running" ||
        !window.CinCoutSocket.isConnected()
      ) {
        console.log(
          "Not sending terminal input: program not running or socket closed"
        );
        return;
      }

      // Send all input characters to the server for PTY to handle
      window.CinCoutSocket.sendData({
        type: "input",
        input: data,
      });
    });
  };

  /**
   * Handle terminal resize events
   */
  handleTerminalResize = (): void => {
    if (this.fitAddon) {
      try {
        this.fitAddon.fit();
        // Send the adjusted size to the server
        if (
          this.terminal &&
          window.CinCoutSocket.isConnected() &&
          window.CinCoutSocket.getCompilationState() === "running"
        ) {
          // Ensure we always send integer values to the server
          const cols = Math.floor(this.terminal.cols);
          const rows = Math.floor(this.terminal.rows);

          window.CinCoutSocket.sendData({
            type: "resize",
            cols: cols,
            rows: rows,
          }).catch((err) => {
            console.error("Failed to send resize data to server:", err);
          });
        }
      } catch (e) {
        console.error("Error fitting terminal:", e);

        // Log detailed error for debugging
        if (this.terminal) {
          console.debug("Terminal dimensions at time of error:", {
            cols: this.terminal.cols,
            rows: this.terminal.rows,
          });
        }
      }
    }
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
   * Write exit message to the terminal
   * @param code - Exit code
   */
  writeExitMessage = (code: number): void => {
    if (this.terminal) {
      this.terminal.write(
        `\r\n\x1b[90m[Program exited with code: ${code}]\x1b[0m\r\n`
      );
    }
  };

  /**
   * Clean up the terminal
   */
  dispose = (): void => {
    if (this.terminal) {
      try {
        this.terminal.dispose();
        this.terminal = null;
        this.fitAddon = null;
        window.terminal = null;
        window.fitAddon = null;
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

// Create and export the terminal manager instance
export const terminalManager = new TerminalManager();

// Export the Terminal type for use in other modules
export type { Terminal };
