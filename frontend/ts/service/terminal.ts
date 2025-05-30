import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { TerminalDomElements, TerminalOptions } from "../types";
import { socketManager, SocketEvents } from "../ws/webSocketManager";
import "@xterm/xterm/css/xterm.css";

export class TerminalService {
  private static instance: TerminalService;

  // Component state
  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private domElements: TerminalDomElements = {};

  private constructor() {}

  static getInstance(): TerminalService {
    return (TerminalService.instance ??= new TerminalService());
  }

  readonly setDomElements = (elements: TerminalDomElements): void => {
    this.domElements = { ...this.domElements, ...elements };
  };

  readonly setupTerminal = (): Terminal => {
    // Clear previous content
    this.domElements.output?.replaceChildren(
      Object.assign(document.createElement("div"), {
        id: "terminal-container",
        className: "terminal-container",
      })
    );

    // Get terminal theme
    const currentTheme = (window as any).getTerminalTheme?.() ?? {};

    // Create terminal config
    const terminalOptions: TerminalOptions = {
      cursorBlink: true,
      cursorStyle: "block",
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      theme: currentTheme,
      allowTransparency: true,
      rendererType: "dom",
      convertEol: true,
    } as const;

    // Create terminal instance
    this.terminal = new Terminal(terminalOptions);
    (window as any).terminal = this.terminal;

    // Create and load fit addon
    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);

    // Open terminal in container
    const terminalContainer = document.getElementById("terminal-container");
    if (!terminalContainer) {
      const error = new Error("Terminal container not found");
      console.error(error.message);
      throw error;
    }

    this.terminal.open(terminalContainer);

    // Setup terminal
    this.terminal.attachCustomKeyEventHandler(this.handleTerminalKeyEvents);

    // Initialize terminal
    this.fitTerminal();
    this.setupAfterRender();
    this.setupEventListeners();

    return this.terminal;
  };

  // Fit terminal to container
  readonly fitTerminal = (): void => {
    if (!this.terminal || !this.fitAddon) return;

    try {
      this.fitAddon.fit();
    } catch (error) {
      console.error("Error fitting terminal:", error);
    }
  };

  // Handle terminal keyboard events
  private readonly handleTerminalKeyEvents = (
    event: KeyboardEvent
  ): boolean => {
    if (event.key !== "Escape") return true;

    // Don't let terminal handle Escape key on keydown
    return !(event.type === "keydown" && event.key === "Escape");
  };

  // Set up effects after terminal is rendered
  private readonly setupAfterRender = (): void => {
    Promise.resolve().then(() => {
      setTimeout(() => {
        try {
          this.terminal?.refresh(0, this.terminal.rows - 1);
          this.applyCursorStyling();
        } catch (error) {
          console.error("Error refreshing terminal:", error);
        }
      }, 50);
    });

    setTimeout(() => this.terminal?.focus(), 100);
  };

  // Apply custom cursor styling
  private readonly applyCursorStyling = (): void => {
    requestAnimationFrame(() => {
      const cursorElement = document
        .getElementById("terminal-container")
        ?.querySelector<HTMLElement>(".xterm-cursor");

      if (!cursorElement) return;

      const accentColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim();

      if (accentColor) {
        cursorElement.style.backgroundColor = accentColor;
      }
    });
  };

  // Set up event listeners
  private readonly setupEventListeners = (): void => {
    this.setupTerminalInput();
  };

  // Set up terminal input handling
  private readonly setupTerminalInput = (): void => {
    if (!this.terminal) return;

    this.terminal.onData(this.handleTerminalInput);
  };

  // Handle terminal input
  private readonly handleTerminalInput = async (
    data: string
  ): Promise<void> => {
    try {
      await socketManager.emit(SocketEvents.INPUT, { input: data });
    } catch (error) {
      console.error("Error sending input to server:", error);
    }
  };

  // Write data to the terminal
  readonly write = (data: string): void => {
    this.terminal?.write(data);
  };

  // Write error message to the terminal with
  readonly writeError = (message: string): void => {
    this.terminal?.write(`\x1b[31m${message}\x1b[0m`);
  };

  // Write exit message with modern approach and constants
  readonly writeExitMessage = (code: number): void => {
    if (!this.terminal) return;

    const COLORS = {
      SUCCESS: "\x1b[38;2;85;219;190m",
      ERROR: "\x1b[31m",
      WARNING: "\x1b[38;2;230;205;105m",
      RESET: "\x1b[0m",
    } as const;

    const getExitMessage = (exitCode: number): string => {
      const baseMessage = `[Program exited with code: ${exitCode}`;

      if (exitCode === 0) {
        return `${COLORS.SUCCESS}${baseMessage.replace(
          "exited",
          "successfully exited"
        )}]${COLORS.RESET}`;
      }

      if (exitCode > 128) {
        return `${COLORS.ERROR}${baseMessage}, may have crashed (signal ${
          exitCode - 128
        })]${COLORS.RESET}`;
      }

      return `${COLORS.WARNING}${baseMessage}, may have errors]${COLORS.RESET}`;
    };

    const exitMessage = `\r\n${getExitMessage(code)}\r\n`;
    this.terminal.write(exitMessage);
  };

  // Clean up terminal resources
  readonly dispose = (): void => {
    // Clean up in reverse order of creation
    this.fitAddon?.dispose();
    this.terminal?.dispose();

    // Reset references
    this.fitAddon = null;
    this.terminal = null;
    (window as any).terminal = null;
  };

  readonly getTerminal = (): Terminal | null => this.terminal;
}

export const getTerminalService = (): TerminalService =>
  TerminalService.getInstance();

// Export the Terminal type for use in other modules
export type { Terminal };
