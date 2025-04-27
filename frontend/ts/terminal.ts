// Import required modules
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

// Import the CSS with the correct path for the new @xterm package
import "@xterm/xterm/css/xterm.css";

// === Types ===

// Interface for DOM elements (would be React refs)
interface DomElements {
  output?: HTMLElement | null;
  outputPanel?: HTMLElement | null;
  outputTab?: HTMLElement | null;
}

// Terminal configuration interface (would be React props)
interface TerminalOptions {
  cursorBlink?: boolean;
  cursorStyle?: "block" | "underline" | "bar";
  fontSize?: number;
  fontFamily?: string;
  theme?: any;
  allowTransparency?: boolean;
  rendererType?: string;
  convertEol?: boolean;
}

// === Utilities ===

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

// === Main Component ===

/**
 * TerminalManager - Manages terminal functionality
 * In React, this would become a custom hook (useTerminal) or a React component
 */
class TerminalManager {
  // Component state (would be React useState)
  private terminal: Terminal | null = null;
  private fitAddon: SafeFitAddon | null = null;
  private domElements: DomElements = {};

  /**
   * Initialize the terminal manager with DOM elements
   * @param elements - DOM elements required for terminal operation (would be React refs)
   */
  constructor(elements: DomElements = {}) {
    this.domElements = elements;
  }

  /**
   * Set DOM elements (would be handled by React refs in useEffect)
   * @param elements - DOM elements to set
   */
  setDomElements = (elements: DomElements): void => {
    this.domElements = { ...this.domElements, ...elements };
  };

  /**
   * Create and set up the terminal (would be part of React's useEffect)
   */
  setupTerminal = (): Terminal => {
    // Clear previous content (would be handled by React's clean rendering)
    if (this.domElements.output) {
      this.domElements.output.innerHTML =
        '<div id="terminal-container" class="terminal-container"></div>';
    }

    // Get terminal theme from context (would be React Context in React)
    const currentTheme = (window as any).getTerminalTheme
      ? (window as any).getTerminalTheme()
      : {};

    // Create terminal config (would be React props or state)
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

    // Create terminal instance
    this.terminal = new Terminal({
      ...terminalOptions,
      // Add custom key handling to prevent terminal from capturing Escape key
      customKeyEventHandler: this.handleTerminalKeyEvents,
    });

    // Create our safer fit addon that enforces integer dimensions
    this.fitAddon = new SafeFitAddon();
    window.fitAddon = this.fitAddon;
    this.terminal.loadAddon(this.fitAddon);
    window.terminal = this.terminal;

    // Open terminal in container (would be React ref.current in React)
    const terminalContainer = document.getElementById("terminal-container");
    if (!terminalContainer) {
      console.error("Terminal container not found");
      throw new Error("Terminal container not found");
    }

    this.terminal.open(terminalContainer);

    // Setup effects after render (would be React useEffect)
    this.setupAfterRender();

    // Set up event handlers (would be handled by React useEffect)
    this.setupEventListeners();

    return this.terminal;
  };

  /**
   * Handle terminal keyboard events (pure function)
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
   * Set up effects after terminal is rendered (would be React useEffect)
   */
  private setupAfterRender = (): void => {
    setTimeout(() => {
      this.handleTerminalResize();

      // Force terminal redraw to apply new theme
      try {
        if (this.terminal) {
          this.terminal.refresh(0, this.terminal.rows - 1);

          // Apply custom cursor styling
          this.applyCursorStyling();
        }
      } catch (e) {
        console.error("Error refreshing terminal:", e);
      }
    }, 50);

    // Focus terminal
    setTimeout(() => this.terminal?.focus(), 100);
  };

  /**
   * Apply custom cursor styling (would be CSS-in-JS in React)
   */
  private applyCursorStyling = (): void => {
    setTimeout(() => {
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
    }, 100);
  };

  /**
   * Set up event listeners (would be React useEffect)
   */
  private setupEventListeners = (): void => {
    // Setup terminal input handling
    this.setupTerminalInput();

    // Listen for window resize events (would be handled with useEffect cleanup)
    window.addEventListener("resize", this.handleTerminalResize);

    // After terminal is opened, send size information to the server
    if (this.terminal) {
      this.terminal.onResize(this.handleTerminalResize);
    }
  };

  /**
   * Set up terminal input handling (would be React event handler)
   */
  private setupTerminalInput = (): void => {
    if (!this.terminal) return;

    // Simplified terminal input handling
    this.terminal.onData(this.handleTerminalInput);
  };

  /**
   * Handle terminal input (pure function, would be React event handler)
   */
  private handleTerminalInput = (data: string): void => {
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
  };

  /**
   * Handle terminal resize events (pure function, would be React event handler)
   */
  handleTerminalResize = (): void => {
    if (!this.fitAddon || !this.terminal) return;

    try {
      this.fitAddon.fit();

      // Send the adjusted size to the server
      if (
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
  };

  /**
   * Write data to the terminal (would be React state update)
   * @param data - The data to write to the terminal
   */
  write = (data: string): void => {
    if (this.terminal) {
      this.terminal.write(data);
    }
  };

  /**
   * Write error message to the terminal in red (would be styled component in React)
   * @param message - Error message to write
   */
  writeError = (message: string): void => {
    if (this.terminal) {
      this.terminal.write(`\x1b[31m${message}\x1b[0m`);
    }
  };

  /**
   * Write exit message to the terminal (would be styled component in React)
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
   * Clean up the terminal (would be React useEffect cleanup)
   */
  dispose = (): void => {
    // Remove event listeners (for clean unmount like in React useEffect cleanup)
    window.removeEventListener("resize", this.handleTerminalResize);

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
   * Get the terminal instance (would be React ref/state getter)
   */
  getTerminal = (): Terminal | null => {
    return this.terminal;
  };
}

// Create singleton instance (would be React Context in React)
export const terminalManager = new TerminalManager();

// Export the Terminal type for use in other modules
export type { Terminal };

// Extend Window interface (would be eliminated in React with proper TypeScript)
declare global {
  interface Window {
    fitAddon: SafeFitAddon | null;
    terminal: Terminal | null;
    CinCoutSocket: any;
    getTerminalTheme: () => any;
  }
}
