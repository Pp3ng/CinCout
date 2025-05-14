// Import utility functions
import { takeCodeSnap } from "./service/snapshot";
import { debounce } from "lodash-es";
import { showNotification } from "./service/notification";
import CompileSocketManager from "./ws/compileSocket";
import DebugSocketManager from "./ws/debugSocket";
import LeakDetectSocketManager from "./ws/leakDetectSocket";
import apiService from "./service/api";
import { getEditorService } from "./service/editor";
import { getTerminalService } from "./service/terminal";
import {
  handleLanguageChange,
  loadSelectedTemplate,
  initializeTemplates,
} from "./service/templates";
import { CompileOptions, DOMElements, DomElementId } from "./types";
import {
  initializeShortcuts,
  renderShortcutsList,
  isMac,
} from "./service/shortcuts";
import themeManager from "./ui/themeManager";
import { initCustomSelects } from "./ui/selector";
import { useLayout } from "./ui/layout";

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
  getElements: (): DOMElements => {
    return {
      template: document.getElementById("template"),
      vimMode: document.getElementById("vimMode") as HTMLInputElement,
      language: document.getElementById("language") as HTMLSelectElement,
      output: document.getElementById("output"),
      compile: document.getElementById("compile"),
      memcheck: document.getElementById("memcheck"),
      format: document.getElementById("format"),
      viewAssembly: document.getElementById("viewAssembly"),
      lintCode: document.getElementById("lintCode"),
      debug: document.getElementById("debug"),
      themeSelect: document.getElementById("theme-select") as HTMLSelectElement,
      outputPanel: document.getElementById("outputPanel"),
      closeOutput: document.getElementById("closeOutput"),
      codesnap: document.getElementById("codeSnap"),
      compiler: document.getElementById("compiler") as HTMLSelectElement,
      optimization: document.getElementById(
        "optimization"
      ) as HTMLSelectElement,
    };
  },

  showLoadingInOutput: (text: string): void => {
    const output = document.getElementById("output");
    if (output) {
      output.innerHTML = `<div class='loading'>${text}</div>`;
    }
  },

  setOutput: (html: string): void => {
    const output = document.getElementById("output");
    if (output) {
      output.innerHTML = html;
    }
  },

  clearOutput: (): void => {
    domUtils.setOutput("");
  },

  showOutputPanel: (): void => {
    const outputPanel = document.getElementById("outputPanel");
    if (!outputPanel) return;

    const isZenMode = document.body.classList.contains("zen-mode-active");
    outputPanel.style.display = "flex";
    document.querySelector(".editor-panel")?.classList.add("with-output");

    if (isZenMode) {
      getEditorService().refresh();
    }
  },

  hideOutputPanel: (): void => {
    const outputPanel = document.getElementById("outputPanel");
    if (!outputPanel) return;

    outputPanel.style.display = "none";
    document.querySelector(".editor-panel")?.classList.remove("with-output");

    // Clear output content when hiding
    domUtils.clearOutput();

    const isZenMode = document.body.classList.contains("zen-mode-active");
    if (isZenMode) {
      getEditorService().refresh();
    }
  },

  getCompileOptions: (): CompileOptions => {
    const elements = domUtils.getElements();
    const editorService = getEditorService();
    return {
      code: editorService.getValue(),
      lang: elements.language?.value || "c",
      compiler: elements.compiler?.value || "gcc",
      optimization: elements.optimization?.value || "O0",
    };
  },

  // Error output formatter
  formatErrorOutput: (error: any): string => {
    return `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Error: ${error}</div>`;
  },

  // Render shortcuts list in the DOM
  renderShortcutsList: (): void => {
    renderShortcutsList(DomElementId.SHORTCUTS_CONTENT);
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
        `<div class="lint-code-output" style="white-space: pre-wrap; overflow: visible;">${formattedLines.join(
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
  applyThemeToDOM: (): void => {
    const themeName = themeManager.getCurrentThemeName();

    document.body.classList.add("theme-transitioning");

    requestAnimationFrame(() => {
      Object.entries(themeManager.getCssVariables()).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
      });

      const editorService = getEditorService();
      const editor = editorService.getEditor();
      if (editor) {
        editor.setOption(
          "theme",
          themeName === "default" ? "default" : themeName
        );
      }
      const assemblyView = editorService.getAssemblyView();
      if (assemblyView) {
        assemblyView.setOption(
          "theme",
          themeName === "default" ? "default" : themeName
        );
      }

      const terminal = getTerminalService().getTerminal();
      if (terminal && terminal.options) {
        terminal.options.theme = themeManager.getTerminalTheme();
        terminal.refresh(0, terminal.rows - 1);
      }
      setTimeout(() => {
        document.body.classList.remove("theme-transitioning");
      }, 400);
    });
  },

  initializeThemeUI: (): void => {
    const themeSelect = document.getElementById(
      "theme-select"
    ) as HTMLSelectElement;
    if (!themeSelect || themeSelect.options.length > 0) return;

    Object.entries(themeManager.getThemes()).forEach(([key, theme]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = theme.name;
      themeSelect.appendChild(option);
    });

    themeSelect.value = themeManager.getCurrentThemeName();

    themeSelect.addEventListener("change", (e) => {
      themeManager.setTheme((e.target as HTMLSelectElement).value);
    });

    themeManager.subscribe(() => themeUtils.applyThemeToDOM());

    themeUtils.applyThemeToDOM();

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
  // Initialize socket managers with shared configuration
  const socketConfig = {
    showOutput: domUtils.showOutputPanel.bind(domUtils),
  };

  // Create socket managers
  const compileSocketManager = new CompileSocketManager(socketConfig);
  const debugSocketManager = new DebugSocketManager(socketConfig);
  const leakDetectSocketManager = new LeakDetectSocketManager(socketConfig);

  // Debug actions
  const debugActions = {
    startDebugSession: async (options: CompileOptions): Promise<void> => {
      await debugSocketManager.startDebugSession(options);
    },

    cleanup: (): void => {
      debugSocketManager.cleanup();
    },
  };

  // Leak detect actions
  const leakDetectActions = {
    startLeakDetection: async (options: CompileOptions): Promise<void> => {
      await leakDetectSocketManager.startLeakDetection(options);
    },

    cleanup: (): void => {
      leakDetectSocketManager.cleanup();
    },
  };

  // Set up all event listeners
  const setupEventListeners = () => {
    const elements = domUtils.getElements();

    // Template and language handlers
    elements.template?.addEventListener("change", loadSelectedTemplate);
    elements.language?.addEventListener("change", handleLanguageChange);

    // Code action buttons
    elements.codesnap?.addEventListener("click", debounce(takeCodeSnap, 300));

    elements.format?.addEventListener(
      "click",
      debounce(() => {
        const editorService = getEditorService();
        const code = editorService.getValue();
        const lang = elements.language?.value || "c";
        codeActions.formatCode(code, lang);
      }, 300)
    );

    elements.lintCode?.addEventListener(
      "click",
      debounce(() => {
        const editorService = getEditorService();
        const code = editorService.getValue();
        const lang = elements.language?.value || "c";
        codeActions.runLintCode(code, lang);
      }, 300)
    );

    // Zen Mode
    const zenModeButton = document.getElementById("zenMode");
    zenModeButton?.addEventListener("click", toggleZenMode);

    // Compilation buttons
    elements.compile?.addEventListener(
      "click",
      debounce(() => {
        const options = domUtils.getCompileOptions();
        compileSocketManager.compile(options);
      }, 300)
    );

    elements.debug?.addEventListener(
      "click",
      debounce(() => {
        const options = domUtils.getCompileOptions();
        debugActions.startDebugSession(options);
      }, 300)
    );

    elements.closeOutput?.addEventListener("click", () => {
      compileSocketManager.cleanup();
      debugActions.cleanup();
      leakDetectActions.cleanup();
      domUtils.hideOutputPanel();
    });

    elements.viewAssembly?.addEventListener(
      "click",
      debounce(() => {
        const options = domUtils.getCompileOptions();
        codeActions.viewAssembly(options);
      }, 300)
    );

    elements.memcheck?.addEventListener(
      "click",
      debounce(() => {
        const options = domUtils.getCompileOptions();
        leakDetectActions.startLeakDetection(options);
      }, 300)
    );

    // Settings
    elements.vimMode?.addEventListener("change", () => {
      editorSettings.setVimMode(!!elements.vimMode?.checked);
    });
  };

  // Handle the title Easter egg
  const setupEasterEgg = () => {
    const el = document.getElementById("title-easter-egg");
    if (!el) return;

    let clicks = 0,
      lastClick = 0,
      timer: number | null = null;

    el.addEventListener("click", () => {
      const now = Date.now();

      if (now - lastClick > 1500) clicks = 0;
      if (timer) clearTimeout(timer);

      clicks++;
      lastClick = now;

      if (clicks === 3) {
        showNotification(
          "info",
          "🌌 The Answer to the Ultimate Question of Life, the Universe, and Everything is 42 🤓",
          4000,
          { top: "50%", left: "50%" }
        );
        timer = window.setTimeout(() => (clicks = 0), 4000);
      }
    });
  };

  // Main initialization sequence when DOM is loaded
  document.addEventListener("DOMContentLoaded", () => {
    // Step 1: Initialize theme system first
    themeUtils.applyUserTheme();
    themeUtils.initializeThemeUI();

    // Step 2: Initialize UI components
    initializeTemplates();
    initCustomSelects();

    // Step 3: Initialize layout system
    const layout = useLayout();
    layout.initialize();

    // Step 4: Initialize shortcuts system
    initializeShortcuts();
    domUtils.renderShortcutsList();

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
