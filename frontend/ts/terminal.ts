// Import required modules
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

// Interface for DOM elements
interface DomElements {
  output?: HTMLElement | null;
  outputPanel?: HTMLElement | null;
  outputTab?: HTMLElement | null;
}

// Terminal manager class
class TerminalManager {
  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
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
  setDomElements(elements: DomElements): void {
    this.domElements = { ...this.domElements, ...elements };
  }

  /**
   * Create and set up the terminal
   */
  setupTerminal(): Terminal {
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

    // Create fit addon to make terminal adapt to container size
    this.fitAddon = new FitAddon();
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
        (window as any).CinCoutSocket.isConnected() &&
        (window as any).CinCoutSocket.getCompilationState() === "running"
      ) {
        (window as any).CinCoutSocket.sendData({
          type: "resize",
          cols: cols,
          rows: rows,
        });
      }
    });

    return this.terminal;
  }

  /**
   * Set up terminal input handling
   */
  private setupTerminalInput(): void {
    if (!this.terminal) return;

    // Simplified terminal input handling
    this.terminal.onData((data: string) => {
      if (
        !(window as any).CinCoutSocket.getCompilationState() === "running" ||
        !(window as any).CinCoutSocket.isConnected()
      ) {
        console.log(
          "Not sending terminal input: program not running or socket closed"
        );
        return;
      }

      // Send all input characters to the server for PTY to handle
      (window as any).CinCoutSocket.sendData({
        type: "input",
        input: data,
      });
    });
  }

  /**
   * Handle terminal resize events
   */
  handleTerminalResize(): void {
    if (this.fitAddon) {
      try {
        this.fitAddon.fit();
        // Send the adjusted size to the server
        if (
          this.terminal &&
          (window as any).CinCoutSocket.isConnected() &&
          (window as any).CinCoutSocket.getCompilationState() === "running"
        ) {
          (window as any).CinCoutSocket.sendData({
            type: "resize",
            cols: this.terminal.cols,
            rows: this.terminal.rows,
          });
        }
      } catch (e) {
        console.error("Error fitting terminal:", e);

        // Manual fallback resize if fit addon fails
        if (this.terminal) {
          const containerElement = this.terminal.element.parentElement;
          if (containerElement) {
            // Get container dimensions
            const containerWidth = containerElement.clientWidth;
            const containerHeight = containerElement.clientHeight;

            // Calculate dimensions based on character size
            const charWidth =
              this.terminal._core._renderService.dimensions.actualCellWidth ||
              9;
            const charHeight =
              this.terminal._core._renderService.dimensions.actualCellHeight ||
              17;

            const cols = Math.max(2, Math.floor(containerWidth / charWidth));
            const rows = Math.max(1, Math.floor(containerHeight / charHeight));

            // Manually resize with integer values
            this.terminal.resize(cols, rows);
          }
        }
      }
    }
  }

  /**
   * Write data to the terminal
   * @param data - The data to write to the terminal
   */
  write(data: string): void {
    if (this.terminal) {
      this.terminal.write(data);
    }
  }

  /**
   * Write error message to the terminal in red
   * @param message - Error message to write
   */
  writeError(message: string): void {
    if (this.terminal) {
      this.terminal.write(`\x1b[31m${message}\x1b[0m`);
    }
  }

  /**
   * Write exit message to the terminal
   * @param code - Exit code
   */
  writeExitMessage(code: number): void {
    if (this.terminal) {
      this.terminal.write(
        `\r\n\x1b[90m[Program exited with code: ${code}]\x1b[0m\r\n`
      );
    }
  }

  /**
   * Clean up the terminal
   */
  dispose(): void {
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
  }

  /**
   * Get the terminal instance
   */
  getTerminal(): Terminal | null {
    return this.terminal;
  }
}

// Create and export the terminal manager instance
export const terminalManager = new TerminalManager();

// Export the Terminal type for use in other modules
export type { Terminal };
