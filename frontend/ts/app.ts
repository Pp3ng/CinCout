// Import utility functions
import { takeCodeSnap } from "./service/snapshot";
import { debounce } from "lodash-es";
import { showNotification } from "./service/notification";
import CompileSocketManager from "./ws/compileSocket";
import DebugSocketManager from "./ws/debugSocket";
import LeakDetectSocketManager from "./ws/leakDetectSocket";
import SyscallSocketManager from "./ws/syscallSocket";
import apiService from "./service/api";
import { getEditorService, initEditors } from "./service/editor";
import { getTerminalService } from "./service/terminal";
import { CompileOptions } from "./types";
import {
  initializeShortcuts,
  renderShortcutsList,
  isMac,
} from "./service/shortcuts";
import themeManager from "./ui/themeManager";
import { initSelects, getSelectorState } from "./ui/selector";
import { socketManager } from "./ws/webSocketManager";

// Import CSS for CodeMirror themes
import "codemirror/theme/nord.css";
import "codemirror/theme/dracula.css";
import "codemirror/theme/monokai.css";
import "codemirror/theme/material.css";
import "codemirror/theme/ayu-dark.css";
import "codemirror/theme/gruvbox-dark.css";
import "codemirror/theme/seti.css";
import "codemirror/theme/the-matrix.css";

// DOM Utilities - Will become React hooks/state

export const domUtils = {
  getElements: () => {
    return {
      vimMode: document.getElementById("vimMode") as HTMLInputElement,
      output: document.getElementById("output"),
      compile: document.getElementById("compile"),
      memcheck: document.getElementById("memcheck"),
      format: document.getElementById("format"),
      viewAssembly: document.getElementById("viewAssembly"),
      lintCode: document.getElementById("lintCode"),
      debug: document.getElementById("debug"),
      syscall: document.getElementById("syscall"),
      outputPanel: document.getElementById("outputPanel"),
      closeOutput: document.getElementById("closeOutput"),
      codesnap: document.getElementById("codeSnap"),
    };
  },

  showLoadingInOutput: (text: string): void => {
    const output = document.getElementById("output");
    if (output) output.innerHTML = `<div class='loading'>${text}</div>`;
  },

  setOutput: (html: string): void => {
    const output = document.getElementById("output");
    if (output) output.innerHTML = html;
  },

  clearOutput: (): void => domUtils.setOutput(""),

  showOutputPanel: (): void => {
    const outputPanel = document.getElementById("outputPanel");
    if (!outputPanel) return;

    outputPanel.style.display = "flex";
    document.querySelector(".editor-panel")?.classList.add("with-output");

    document.body.classList.contains("zen-mode-active") &&
      getEditorService().refresh();
  },

  hideOutputPanel: (): void => {
    const outputPanel = document.getElementById("outputPanel");
    if (!outputPanel) return;

    outputPanel.style.display = "none";
    document.querySelector(".editor-panel")?.classList.remove("with-output");
    domUtils.clearOutput();

    document.body.classList.contains("zen-mode-active") &&
      getEditorService().refresh();
  },

  getCompileOptions: (): CompileOptions => {
    const selectorState = getSelectorState();
    const editorService = getEditorService();
    return {
      code: editorService.getValue(),
      lang: selectorState.language,
      compiler: selectorState.compiler,
      optimization: selectorState.optimization,
    };
  },

  // Error output formatter
  formatErrorOutput: (error: any): string => {
    const errorStr = String(error);
    const errorMessage = errorStr.includes("API error:")
      ? errorStr
      : `Error: ${errorStr}`;
    return `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">${errorMessage}</div>`;
  },
};

// Code Actions - Will become React hooks
export const codeActions = {
  viewAssembly: async (options: CompileOptions): Promise<void> => {
    const editorService = getEditorService();

    domUtils.showOutputPanel();
    domUtils.showLoadingInOutput("Generating assembly code...");

    try {
      const data = await apiService.fetchAssembly(options);

      const output = document.getElementById("output");
      if (output) {
        output.innerHTML = '<div id="assembly-view-container"></div>';
        const container = document.getElementById("assembly-view-container");
        const assemblyView = editorService.getAssemblyView();

        if (assemblyView && container) {
          editorService.setAssemblyValue(data.trim());
          container.appendChild(assemblyView.getWrapperElement());
          setTimeout(() => assemblyView.refresh(), 10);
        }
      }
    } catch (error) {
      console.error("Assembly view error:", error);
      domUtils.setOutput(domUtils.formatErrorOutput(error));
    }
  },

  formatCode: async (code: string, lang: string): Promise<void> => {
    const editorService = getEditorService();
    const cursor = editorService.getCursor();

    try {
      const data = await apiService.formatCode(code, lang);

      const formattedData = data.replace(/^\n+/, "").replace(/\n+$/, "");
      const scrollInfo = editorService.getScrollInfo();

      editorService.setValue(formattedData);
      if (cursor) {
        editorService.setCursor(cursor);
      }
      if (scrollInfo) {
        editorService.scrollTo(scrollInfo.left, scrollInfo.top);
      }
      editorService.refresh();

      showNotification("success", "Code formatted successfully", 2000, {
        top: "50%",
        left: "50%",
      });
    } catch (error) {
      console.error("Format error:", error);
      showNotification("error", "Failed to format code", 3000, {
        top: "50%",
        left: "50%",
      });
    }
  },

  runLintCode: async (code: string, lang: string): Promise<void> => {
    domUtils.showOutputPanel();
    domUtils.showLoadingInOutput("Running lint code check...");

    try {
      const data = await apiService.runLintCode(code, lang);

      const lines = data.split("\n");
      const formattedLines = lines
        .map((line: string) => {
          if (line.trim()) {
            return `<div class="style-block" style="white-space: pre-wrap; overflow: visible;">${line}</div>`;
          }
          return "";
        })
        .filter((line: string) => line);

      domUtils.setOutput(
        `<div class="bg-[var(--bg-secondary)] border-l-2 border-[var(--accent)] shadow-[var(--shadow-accent-sm)] rounded-[var(--radius-sm)] m-0 p-[6px] font-[var(--font-mono)] leading-[1.5] transition-all duration-300 hover:shadow-[var(--shadow-accent-md)] hover:bg-[rgba(var(--accent-rgb),0.05)] whitespace-pre-wrap overflow-visible">${formattedLines.join(
          "\n"
        )}</div>`
      );
    } catch (error) {
      domUtils.setOutput(domUtils.formatErrorOutput(error));
    }
  },
};

// Theme functions - Will be replaced by React context
export const themeUtils = {
  // Create and inject dynamic transition styles
  createThemeTransitionStyles: (): HTMLStyleElement => {
    // Remove existing style element if it exists
    document.getElementById("theme-transition-styles")?.remove();

    // Create new style element
    const style = document.createElement("style");
    style.id = "theme-transition-styles";
    style.textContent = `
      .theme-transition-active {
        transition: background-color 0.3s ease, color 0.3s ease;
      }
      
      .theme-transition-active * {
        transition: background-color 0.3s ease, color 0.3s ease,
          border-color 0.3s ease, box-shadow 0.3s ease;
      }
    `;

    // Append to document head
    document.head.appendChild(style);
    return style;
  },

  applyThemeToDOM: (): void => {
    const themeName = themeManager.getCurrentThemeName();

    // Ensure transition styles are injected
    themeUtils.createThemeTransitionStyles();

    // Apply transition class
    document.body.classList.add("theme-transition-active");

    requestAnimationFrame(() => {
      // Apply CSS variables
      Object.entries(themeManager.getCssVariables()).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
      });

      // Apply theme to all editors
      const editorService = getEditorService();
      editorService.applyThemeToAllEditors(themeName);

      // Apply theme to terminal
      const terminal = getTerminalService().getTerminal();
      if (terminal && terminal.options) {
        terminal.options.theme = themeManager.getTerminalTheme();
        terminal.refresh(0, terminal.rows - 1);
      }

      // Remove transition class after animation completes
      setTimeout(() => {
        document.body.classList.remove("theme-transition-active");
      }, 400);
    });
  },

  initializeThemeUI: (): void => {
    // Subscribe to theme changes and apply initial theme
    themeManager.subscribe(themeUtils.applyThemeToDOM);
    themeUtils.applyThemeToDOM();

    // Expose terminal theme getter for external use
    (window as any).getTerminalTheme =
      themeManager.getTerminalTheme.bind(themeManager);
  },

  applyUserTheme: (): void => {
    const savedTheme = localStorage.getItem("cincout-theme");
    if (savedTheme) themeManager.setTheme(savedTheme);
  },
};

// Settings Manager - Will become React context/state
export const editorSettings = {
  setTheme: (theme: string): void => {
    localStorage.setItem("cincout-theme", theme);
    themeManager.setTheme(theme);
  },

  setVimMode: (enabled: boolean): void => {
    localStorage.setItem("cincout-vim-mode", enabled.toString());
    getEditorService().setOption("keyMap", enabled ? "vim" : "default");

    // Update vim status visibility
    const vimStatusElement = document.getElementById("vim-status");
    if (vimStatusElement) {
      if (enabled) {
        vimStatusElement.style.display = "block";
        vimStatusElement.textContent = "-- NORMAL --"; // Default initial mode

        // Set up jk mapping for Escape in insert mode
        const editor = getEditorService().getEditor();
        if (editor) {
          const CodeMirror = (editor as any).constructor;
          if (CodeMirror && CodeMirror.Vim) {
            // Map jk to Escape in insert mode
            CodeMirror.Vim.map("jk", "<Esc>", "insert");
          }
        }
      } else {
        vimStatusElement.style.display = "none";
      }
    }
  },

  loadSavedSettings: (): void => {
    const elements = domUtils.getElements();

    if (elements.vimMode) {
      const savedVimMode = localStorage.getItem("cincout-vim-mode") === "true";
      elements.vimMode.checked = savedVimMode;
      editorSettings.setVimMode(savedVimMode);
    }
  },
};

// UI Actions - Will become React components
const toggleZenMode = (): void => {
  const editorService = getEditorService();
  const editor = editorService.getEditor();
  if (!editor) return;

  const isEnteringZenMode =
    !document.body.classList.contains("zen-mode-active");
  document.body.classList.toggle("zen-mode-active");

  setTimeout(() => editorService.refresh(), 100);

  // Show notification with shortcut hint when entering zen mode
  if (isEnteringZenMode) {
    const shortcutText = isMac ? "⌘+⇧+Z" : "Ctrl+Shift+Z";
    showNotification(
      "info",
      `Zen mode activated. Press ${shortcutText} to exit.`,
      4000,
      { top: "50%", left: "50%" }
    );
  }
};

// Application Initialization - Will become React components
export const initApp = () => {
  const compileSocketManager = new CompileSocketManager();
  const debugSocketManager = new DebugSocketManager();
  const leakDetectSocketManager = new LeakDetectSocketManager();
  const syscallSocketManager = new SyscallSocketManager();

  // Set up all event listeners
  const setupEventListeners = () => {
    const elements = domUtils.getElements();

    // Helper function to add debounced click handler
    const addDebouncedHandler = (
      element: HTMLElement | null,
      handler: () => void,
      delay = 300
    ) => {
      element?.addEventListener("click", debounce(handler, delay));
    };

    // Code action buttons
    addDebouncedHandler(elements.codesnap, takeCodeSnap);

    addDebouncedHandler(elements.format, () => {
      const { code, lang } = domUtils.getCompileOptions();
      codeActions.formatCode(code, lang);
    });

    addDebouncedHandler(elements.lintCode, () => {
      const { code, lang } = domUtils.getCompileOptions();
      codeActions.runLintCode(code, lang);
    });

    // Zen Mode
    document
      .getElementById("zenMode")
      ?.addEventListener("click", toggleZenMode);

    // Compilation buttons
    addDebouncedHandler(elements.compile, () => {
      compileSocketManager.compile(domUtils.getCompileOptions());
    });

    addDebouncedHandler(elements.debug, () => {
      debugSocketManager.startDebugSession(domUtils.getCompileOptions());
    });

    elements.closeOutput?.addEventListener("click", () => {
      socketManager.cleanupSession();
      domUtils.hideOutputPanel();
    });

    addDebouncedHandler(elements.viewAssembly, () => {
      codeActions.viewAssembly(domUtils.getCompileOptions());
    });

    addDebouncedHandler(elements.memcheck, () => {
      leakDetectSocketManager.startLeakDetection(domUtils.getCompileOptions());
    });
    addDebouncedHandler(elements.syscall, () => {
      syscallSocketManager.startSyscallTracing(domUtils.getCompileOptions());
    });

    // Settings
    elements.vimMode?.addEventListener("change", () => {
      editorSettings.setVimMode(!!elements.vimMode?.checked);
    });
  };

  // Handle the title Easter egg
  const setupEasterEgg = () => {
    const el = document.getElementById("title-easter-egg");
    if (!el) return;

    let clicks = 0;
    let lastClick = 0;
    let timer: number | undefined;

    const TIMEOUT_MS = 1500;
    const REQUIRED_CLICKS = 3;
    const MESSAGE_DURATION_MS = 4000;

    el.addEventListener("click", () => {
      const now = Date.now();

      // Reset clicks if too much time has passed
      if (now - lastClick > TIMEOUT_MS) {
        clicks = 0;
      }

      // Clear previous timer if exists
      timer && clearTimeout(timer);

      clicks++;
      lastClick = now;

      if (clicks === REQUIRED_CLICKS) {
        showNotification(
          "info",
          "🌌 The Answer to the Ultimate Question of Life, the Universe, and Everything is 42 🤓",
          MESSAGE_DURATION_MS,
          { top: "50%", left: "50%" }
        );
        timer = window.setTimeout(() => (clicks = 0), MESSAGE_DURATION_MS);
      }
    });
  };

  // Main initialization sequence when DOM is loaded
  document.addEventListener("DOMContentLoaded", () => {
    // Step 1: Initialize theme system first
    themeUtils.applyUserTheme();
    themeUtils.initializeThemeUI();

    // Step 2: Initialize UI components
    initSelects();
    initEditors();

    // Step 3: Hide output panel initially
    const outputPanel = document.getElementById("outputPanel");
    if (outputPanel) outputPanel.style.display = "none";

    // Step 4: Initialize shortcuts system
    initializeShortcuts();
    renderShortcutsList();

    // Step 5: Load saved settings (affects editor behavior)
    editorSettings.loadSavedSettings();

    // Step 6: Set up event listeners
    setupEventListeners();

    // Step 7: Set up Easter egg
    setupEasterEgg();
  });
};

// Start the application
initApp();
