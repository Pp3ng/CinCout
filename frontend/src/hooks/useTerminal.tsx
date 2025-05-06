import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { socketManager, SocketEvents } from "../services/WebSocketManager";
import { terminalManager } from "../services/TerminalManager";
import { TerminalOptions } from "../types";
import { useTheme } from "./useTheme";
import "@xterm/xterm/css/xterm.css";

interface UseTerminalOptions {
  autoFocus?: boolean;
  throttleResize?: number;
}

export const useTerminal = (options: UseTerminalOptions = {}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { theme, getTerminalTheme } = useTheme();

  useEffect(() => {
    // Only initialize if container exists and terminal doesn't
    if (containerRef.current && !terminalRef.current) {
      initializeTerminal();
    }

    // Cleanup on unmount
    return () => {
      disposeTerminal();
    };
  }, []);

  // Initialize terminal
  const initializeTerminal = () => {
    if (!containerRef.current) return;

    // Create a container for the terminal
    const terminalContainer = document.createElement("div");
    terminalContainer.id = "terminal-container";
    terminalContainer.className = "terminal-container";
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(terminalContainer);

    // Get terminal theme
    const currentTheme = getTerminalTheme ? getTerminalTheme() : {};

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

    // Create terminal instance
    const terminal = new Terminal(terminalOptions);
    terminalRef.current = terminal;

    // Make it available on window for compatibility
    (window as any).terminal = terminal;

    // Create and load fit addon
    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    terminal.loadAddon(fitAddon);

    // Open terminal in container
    terminal.open(terminalContainer);

    // Add custom key handler
    terminal.attachCustomKeyEventHandler(handleTerminalKeyEvents);

    // Fit terminal to container
    fitTerminal();

    // Setup input handling
    terminal.onData(handleTerminalInput);

    // Set up resize event listener
    window.addEventListener("resize", handleResize);

    // Focus if autoFocus is true
    if (options.autoFocus) {
      setTimeout(() => terminal.focus(), 100);
    }

    // Sync with TerminalManager for socket communication
    terminalManager.syncWithTerminal(terminal);
  };

  // Handle terminal keyboard events
  const handleTerminalKeyEvents = (event: KeyboardEvent): boolean => {
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

  // Handle terminal input data
  const handleTerminalInput = (data: string): void => {
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

  // Fit terminal to container and notify server of new dimensions
  const fitTerminal = (): void => {
    if (!terminalRef.current || !fitAddonRef.current) return;

    try {
      // Fit terminal to container
      fitAddonRef.current.fit();

      // Get new dimensions
      const cols = terminalRef.current.cols;
      const rows = terminalRef.current.rows;

      // Send resize event to server if connected and running
      if (socketManager.isConnected() && socketManager.isProcessRunning()) {
        // Add a small delay to avoid resize events during connection transitions
        setTimeout(() => {
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
        }, 50);
      }
    } catch (e) {
      console.error("Error fitting terminal:", e);
    }
  };

  // Handle window resize
  const handleResize = () => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    resizeTimeoutRef.current = setTimeout(() => {
      fitTerminal();
    }, options.throttleResize ?? 100);
  };

  // Write data to terminal
  const writeToTerminal = (data: string) => {
    terminalRef.current?.write(data);
  };

  // Clear terminal
  const clearTerminal = () => {
    terminalRef.current?.clear();
  };

  // Focus terminal
  const focusTerminal = () => {
    terminalRef.current?.focus();
  };

  // Dispose terminal and clean up
  const disposeTerminal = () => {
    // Remove event listeners
    window.removeEventListener("resize", handleResize);

    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = null;
    }

    if (fitAddonRef.current) {
      try {
        fitAddonRef.current.dispose();
        fitAddonRef.current = null;
      } catch (e) {
        console.error("Error disposing fit addon:", e);
      }
    }

    if (terminalRef.current) {
      try {
        terminalRef.current.dispose();
        terminalRef.current = null;
        (window as any).terminal = null;
      } catch (e) {
        console.error("Error disposing terminal:", e);
      }
    }
  };

  // Reset terminal (dispose and reinitialize)
  const resetTerminal = () => {
    disposeTerminal();
    if (containerRef.current) {
      initializeTerminal();
    }
  };

  return {
    containerRef,
    terminalRef,
    fitTerminal,
    writeToTerminal,
    clearTerminal,
    focusTerminal,
    resetTerminal,
  };
};

export default useTerminal;
