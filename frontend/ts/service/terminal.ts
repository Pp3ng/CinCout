import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { TerminalDomElements, TerminalOptions } from "../types";
import { socketManager, SocketEvents } from "../ws/webSocketManager";

// Import the CSS with the correct path for the new @xterm package
import "@xterm/xterm/css/xterm.css";

export class TerminalService {
  private static instance: TerminalService;

  // Component state
  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private domElements: TerminalDomElements = {};

  private constructor() {}

  public static getInstance(): TerminalService {
    if (!TerminalService.instance) {
      TerminalService.instance = new TerminalService();
    }
    return TerminalService.instance;
  }

  setDomElements = (elements: TerminalDomElements): void => {
    this.domElements = { ...this.domElements, ...elements };
  };

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

    // Setup effects after render
    this.setupAfterRender();

    // Set up event listeners
    this.setupEventListeners();

    return this.terminal;
  };

  // Fit terminal to container and notify server of new dimensions
  fitTerminal = (): void => {
    if (!this.terminal || !this.fitAddon) return;

    try {
      // Fit terminal to container
      this.fitAddon.fit();
    } catch (e) {
      console.error("Error fitting terminal:", e);
    }
  };

  // Handle terminal keyboard events
  private handleTerminalKeyEvents = (event: KeyboardEvent): boolean => {
    // Pass through all non-Escape key events to terminal
    if (event.key !== "Escape") {
      return true;
    }

    // Don't let terminal handle Escape key
    if (event.type === "keydown" && event.key === "Escape") {
      return false;
    }

    return true;
  };

  // Set up effects after terminal is rendered
  private setupAfterRender = (): void => {
    setTimeout(() => {
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

  // Apply custom cursor styling
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

  // Set up event listeners
  private setupEventListeners = (): void => {
    this.setupTerminalInput();
  };

  // Set up terminal input handling
  private setupTerminalInput = (): void => {
    if (!this.terminal) return;

    // Simplified terminal input handling
    this.terminal.onData(this.handleTerminalInput);
  };

  // Handle terminal input
  private handleTerminalInput = (data: string): void => {
    // Send all input characters to the server for PTY to handle
    socketManager
      .emit(SocketEvents.INPUT, {
        input: data,
      })
      .catch((error) => {
        console.error("Error sending input to server:", error);
      });
  };

  // Write data to the terminal
  write = (data: string): void => {
    if (this.terminal) {
      this.terminal.write(data);
    }
  };

  // Write error message to the terminal with red color
  writeError = (message: string): void => {
    if (this.terminal) {
      this.terminal.write(`\x1b[31m${message}\x1b[0m`);
    }
  };

  // Write exit message to the terminal with appropriate color based on exit code
  writeExitMessage = (code: number): void => {
    if (!this.terminal) return;

    let exitMessage = "\r\n";
    if (code === 0) {
      exitMessage += `\x1b[38;2;85;219;190m[Program successfully exited with code: ${code}]\x1b[0m`;
    } else if (code > 128) {
      exitMessage += `\x1b[31m[Program exited with code: ${code}, may have crashed (signal ${
        code - 128
      })]\x1b[0m`;
    } else {
      exitMessage += `\x1b[38;2;230;205;105m[Program exited with code: ${code}, may have errors]\x1b[0m`;
    }
    exitMessage += "\r\n";
    this.terminal.write(exitMessage);
  };

  // Clean up terminal resources
  dispose = (): void => {
    this.fitAddon?.dispose();
    this.fitAddon = null;
    this.terminal?.dispose();
    this.terminal = null;
    (window as any).terminal = null;
  };

  getTerminal = (): Terminal | null => {
    return this.terminal;
  };
}

export const getTerminalService = (): TerminalService => {
  return TerminalService.getInstance();
};

// Export the Terminal type for use in other modules
export type { Terminal };
