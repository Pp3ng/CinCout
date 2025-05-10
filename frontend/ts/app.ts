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
import { initializeShortcuts, renderShortcutsList } from "./service/shortcuts";
import themeManager from "./ui/themeManager";

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
      styleCheck: document.getElementById("styleCheck"),
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

  refreshEditor: (): void => {
    setTimeout(() => {
      const editorService = getEditorService();
      editorService.refreshAll();
    }, 10);
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

  runStyleCheck: async (code: string, lang: string): Promise<void> => {
    domUtils.showOutputPanel();
    domUtils.showLoadingInOutput("Running style check...");

    try {
      const data = await apiService.runStyleCheck(code, lang);

      const lines = data.split("\n");
      const formattedLines = lines
        .map((line) => {
          if (line.trim()) {
            return `<div class="style-block" style="white-space: pre-wrap; overflow: visible;">${line}</div>`;
          }
          return "";
        })
        .filter((line) => line);

      domUtils.setOutput(
        `<div class="style-check-output" style="white-space: pre-wrap; overflow: visible;">${formattedLines.join(
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

  const editorWrapper = editor.getWrapperElement();
  const isZenMode = editorWrapper.classList.contains("zen-mode");
  const outputPanel = document.getElementById("outputPanel");

  // Toggle zen mode classes
  const elements = {
    editor: editorWrapper,
    body: document.body,
    container: document.querySelector(".container"),
    header: document.querySelector(".header"),
    mainContainer: document.querySelector(".main-container"),
    editorPanel: document.querySelector(".editor-panel"),
    panelHeader: document.querySelector(".panel-header"),
  };

  elements.editor.classList.toggle("zen-mode");
  elements.body.classList.toggle("zen-mode-active");
  elements.container?.classList.toggle("zen-container");
  elements.header?.classList.toggle("hidden-zen");
  elements.mainContainer?.classList.toggle("zen-mode-container");
  elements.editorPanel?.classList.toggle("zen-mode-panel");
  elements.panelHeader?.classList.toggle("zen-mode-minimized");

  // Manage output panel in zen mode
  if (outputPanel && outputPanel.style.display !== "none") {
    if (isZenMode) {
      // Reset output panel styles
      outputPanel.style.position = "";
      outputPanel.style.top = "";
      outputPanel.style.right = "";
      outputPanel.style.bottom = "";
      outputPanel.style.width = "";
      outputPanel.style.zIndex = "";
    }
  }

  // Update button icon
  const zenButton = document.getElementById("zenMode")?.querySelector("i");
  if (zenButton) {
    zenButton.classList.toggle("fa-expand");
    zenButton.classList.toggle("fa-compress");
  }

  // Force editor refresh
  setTimeout(() => editorService.refresh(), 100);
};

// Application Initialization - Will become React components
export const initApp = () => {
  // Initialize socket managers with shared configuration
  const socketConfig = {
    showOutput: domUtils.showOutputPanel.bind(domUtils),
    refreshEditor: domUtils.refreshEditor.bind(domUtils),
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

    // Initialize shortcuts system
    initializeShortcuts();
    domUtils.renderShortcutsList();

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

    elements.styleCheck?.addEventListener(
      "click",
      debounce(() => {
        const editorService = getEditorService();
        const code = editorService.getValue();
        const lang = elements.language?.value || "c";
        codeActions.runStyleCheck(code, lang);
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

    // Load saved settings
    editorSettings.loadSavedSettings();
  };

  // Initialize the application when DOM is loaded
  document.addEventListener("DOMContentLoaded", () => {
    initializeTemplates();
    setupEventListeners();
  });
};

// Start the application
initApp();
