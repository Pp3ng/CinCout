// Import utility functions
import { takeCodeSnap } from "./service/snapshot";
import { debounce } from "lodash-es";
import { themeStoreInstance } from "./ui/themes";
import { showNotification } from "./service/notification";
import CompileSocketManager from "./ws/compileSocket";
import DebugSocketManager from "./ws/debugSocket";
import apiService from "./service/api";
import { getEditorService, getEditorActions } from "./service/editor";
import {
  handleLanguageChange,
  loadSelectedTemplate,
  initializeTemplates,
} from "./service/templates";
import {
  CompileOptions,
  CompileStateUpdater,
  DebugStateUpdater,
  UIState,
  DOMElements,
  CompilationState,
} from "./types";

// ------------------------------------------------------------
// Services - These will become React hooks/services
// ------------------------------------------------------------

/**
 * DOM Service - handles DOM interactions
 * In React, these would be handled by component state and refs
 */
export class DOMService {
  static getElements(): DOMElements {
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
  }

  static createLoadingElement(text: string): HTMLDivElement {
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "loading";
    loadingDiv.textContent = text;
    return loadingDiv;
  }

  static showLoadingInOutput(text: string): void {
    const output = document.getElementById("output");
    if (output) {
      output.innerHTML = `<div class='loading'>${text}</div>`;
    }
  }

  static setOutput(html: string): void {
    const output = document.getElementById("output");
    if (output) {
      output.innerHTML = html;
    }
  }

  static showOutputPanel(): void {
    const outputPanel = document.getElementById("outputPanel");
    if (!outputPanel) return;

    const isZenMode = document.body.classList.contains("zen-mode-active");

    // Display the panel
    outputPanel.style.display = "flex";
    document.querySelector(".editor-panel")?.classList.add("with-output");

    // If in Zen Mode, we need special positioning
    if (isZenMode) {
      // Make sure editor refreshes to adjust for new layout
      getEditorService().refresh();
    }
  }

  static hideOutputPanel(): void {
    const outputPanel = document.getElementById("outputPanel");
    if (!outputPanel) return;

    outputPanel.style.display = "none";
    document.querySelector(".editor-panel")?.classList.remove("with-output");

    // Clear output content when hiding the panel
    const output = document.getElementById("output");
    if (output) {
      output.innerHTML = "";
    }

    // If in Zen Mode, make sure we reset any inline styles
    const isZenMode = document.body.classList.contains("zen-mode-active");
    if (isZenMode) {
      // Make sure editor refreshes to adjust for new layout
      getEditorService().refresh();
    }
  }

  static getCompileOptions(): CompileOptions {
    const elements = this.getElements();
    const editorService = getEditorService();
    return {
      code: editorService.getValue(),
      lang: elements.language?.value || "c",
      compiler: elements.compiler?.value || "gcc",
      optimization: elements.optimization?.value || "O0",
    };
  }
}

// ------------------------------------------------------------
// State Management - Will become React Context/Redux
// ------------------------------------------------------------

/**
 * Store - React-like state management
 * In React, this would be replaced by useState, useReducer, or Redux
 */
export class AppState {
  private state: UIState;
  private listeners: Array<(state: UIState) => void>;

  constructor() {
    this.state = {
      isOutputVisible: false,
      isLoading: false,
      loadingMessage: "",
      compilationState: CompilationState.IDLE,
      theme: localStorage.getItem("cincout-theme") || "default",
      vimMode: localStorage.getItem("cincout-vim-mode") === "true",
      isDebuggingActive: false,
    };
    this.listeners = [];
  }

  setState(partialState: Partial<UIState>): void {
    this.state = { ...this.state, ...partialState };
    this.notifyListeners();
  }

  getState(): UIState {
    return { ...this.state };
  }

  subscribe(listener: (state: UIState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }
}

// UI State adapter for CompileSocketManager
class CompileStateAdapter implements CompileStateUpdater {
  private appState: AppState;

  constructor(appState: AppState) {
    this.appState = appState;
  }

  updateCompilationState(state: string): void {
    switch (state) {
      case "idle":
        this.appState.setState({
          compilationState: CompilationState.IDLE,
        });
        break;
      case "compiling":
        this.appState.setState({
          compilationState: CompilationState.COMPILING,
        });
        break;
      case "running":
        this.appState.setState({
          compilationState: CompilationState.RUNNING,
        });
        break;
    }
  }

  updateProcessRunning(running: boolean): void {
    this.appState.setState({ isProcessRunning: running });
  }

  showOutput(): void {
    DOMService.showOutputPanel();
    this.appState.setState({ isOutputVisible: true });
  }

  refreshEditor(): void {
    setTimeout(() => getEditorService().refresh(), 10);
  }
}

// UI State adapter for DebugSocketManager
class DebugStateAdapter implements DebugStateUpdater {
  private appState: AppState;

  constructor(appState: AppState) {
    this.appState = appState;
  }

  updateDebugState(state: string): void {
    switch (state) {
      case "idle":
        this.appState.setState({
          compilationState: CompilationState.IDLE,
        });
        break;
      case "compiling":
        this.appState.setState({
          compilationState: CompilationState.COMPILING,
        });
        break;
      case "running":
        this.appState.setState({
          compilationState: CompilationState.RUNNING,
        });
        break;
    }
  }

  setDebuggingActive(active: boolean): void {
    this.appState.setState({ isDebuggingActive: active });
  }

  showOutput(): void {
    DOMService.showOutputPanel();
    this.appState.setState({ isOutputVisible: true });
  }

  refreshEditor(): void {
    setTimeout(() => getEditorService().refresh(), 10);
  }
}

// ------------------------------------------------------------
// Feature Controllers - Will become React components/custom hooks
// ------------------------------------------------------------

/**
 * CodeActionsController - Manages code-related actions
 * In React, this would become custom hooks (useCodeActions)
 */
export class CodeActionsController {
  private appState: AppState;
  private compileSocketManager: CompileSocketManager | null = null;

  constructor(appState: AppState) {
    this.appState = appState;
  }

  setCompileSocketManager(manager: CompileSocketManager): void {
    this.compileSocketManager = manager;
  }

  async viewAssembly(options: CompileOptions): Promise<void> {
    const editorService = getEditorService();

    // Show output panel
    DOMService.showOutputPanel();
    DOMService.showLoadingInOutput("Generating assembly code...");

    try {
      const data = await apiService.fetchAssembly(options);

      // Create a container for assembly display
      const output = document.getElementById("output");
      if (output) {
        output.innerHTML = '<div id="assembly-view-container"></div>';
        const container = document.getElementById("assembly-view-container");

        // Use the assemblyView to display the assembly code
        const assemblyView = editorService.getAssemblyView();
        if (assemblyView && container) {
          editorService.setAssemblyValue(data.trim());
          // Append the CodeMirror instance to our container
          container.appendChild(assemblyView.getWrapperElement());
          setTimeout(() => assemblyView.refresh(), 10);
        } else {
          // Fallback if the CodeMirror instance is not available
          output.innerHTML = `<pre class="assembly-output">${data.trim()}</pre>`;
        }
      }
    } catch (error) {
      console.error("Assembly view error:", error);
      DOMService.setOutput(
        `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Error: ${error}</div>`
      );
    }
  }

  async runMemCheck(options: CompileOptions): Promise<void> {
    // Show output panel
    DOMService.showOutputPanel();
    DOMService.showLoadingInOutput("Running memory check...");

    try {
      const data = await apiService.runMemCheck(options);
      DOMService.setOutput(
        `<div class="memcheck-output" style="white-space: pre-wrap; overflow: visible;">${data}</div>`
      );
    } catch (error) {
      console.error("Memcheck error:", error);
      DOMService.setOutput(
        `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Error: ${error}</div>`
      );
    }
  }

  async formatCode(code: string, lang: string): Promise<void> {
    const editorService = getEditorService();
    const cursor = editorService.getCursor();

    try {
      const data = await apiService.formatCode(code, lang);

      // Apply formatting changes while preserving editor state
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

      // Show success notification
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
  }

  async runStyleCheck(code: string, lang: string): Promise<void> {
    // Show output panel
    DOMService.showOutputPanel();
    DOMService.showLoadingInOutput("Running style check...");

    try {
      const data = await apiService.runStyleCheck(code, lang);

      // Process and format the output
      const lines = data.split("\n");
      const formattedLines = lines
        .map((line) => {
          if (line.trim()) {
            return `<div class="style-block" style="white-space: pre-wrap; overflow: visible;">${line}</div>`;
          }
          return "";
        })
        .filter((line) => line);

      DOMService.setOutput(
        `<div class="style-check-output" style="white-space: pre-wrap; overflow: visible;">${formattedLines.join(
          "\n"
        )}</div>`
      );
    } catch (error) {
      DOMService.setOutput(
        `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Error: ${error}</div>`
      );
    }
  }
}

/**
 * DebugController - Manages GDB debugging actions
 * In React, this would become custom hooks (useDebugActions)
 */
export class DebugController {
  private appState: AppState;
  private debugSocketManager: DebugSocketManager | null = null;

  constructor(appState: AppState) {
    this.appState = appState;
  }

  setDebugSocketManager(manager: DebugSocketManager): void {
    this.debugSocketManager = manager;
  }

  async startDebugSession(options: CompileOptions): Promise<void> {
    if (!this.debugSocketManager) return;

    await this.debugSocketManager.startDebugSession(options);
  }

  async sendDebugCommand(command: string): Promise<void> {
    if (!this.debugSocketManager) return;

    await this.debugSocketManager.sendDebugCommand(command);
  }

  cleanup(): void {
    if (!this.debugSocketManager) return;

    this.debugSocketManager.cleanup();
  }
}

/**
 * EditorSettingsController - Manages editor settings
 * In React, this would become a custom hook (useEditorSettings)
 */
export class EditorSettingsController {
  private appState: AppState;

  constructor(appState: AppState) {
    this.appState = appState;
  }

  setTheme(theme: string): void {
    this.appState.setState({ theme });
    localStorage.setItem("cincout-theme", theme);
    themeStoreInstance.setTheme(theme);
  }

  setVimMode(enabled: boolean): void {
    this.appState.setState({ vimMode: enabled });
    localStorage.setItem("cincout-vim-mode", enabled.toString());
    getEditorService().setOption("keyMap", enabled ? "vim" : "default");
  }
}

// ------------------------------------------------------------
// Main Application Class
// ------------------------------------------------------------

/**
 * Main App Controller
 * In React, this would be App component
 */
export class CinCoutApp {
  private appState: AppState;
  private compileSocketManager: CompileSocketManager;
  private debugSocketManager: DebugSocketManager;
  private codeActions: CodeActionsController;
  private debugController: DebugController;
  private editorSettings: EditorSettingsController;

  constructor() {
    // Initialize state
    this.appState = new AppState();

    // Create state adapters
    const compileStateAdapter = new CompileStateAdapter(this.appState);
    const debugStateAdapter = new DebugStateAdapter(this.appState);

    // Initialize managers with adapters
    this.compileSocketManager = new CompileSocketManager(compileStateAdapter);
    this.debugSocketManager = new DebugSocketManager(debugStateAdapter);

    // Initialize controllers with managers
    this.codeActions = new CodeActionsController(this.appState);
    this.codeActions.setCompileSocketManager(this.compileSocketManager);

    this.debugController = new DebugController(this.appState);
    this.debugController.setDebugSocketManager(this.debugSocketManager);

    this.editorSettings = new EditorSettingsController(this.appState);
  }

  init(): void {
    document.addEventListener("DOMContentLoaded", () => {
      initializeTemplates();
      this.setupEventListeners();
    });
  }

  private setupEventListeners(): void {
    // Get all DOM elements once
    const elements = DOMService.getElements();

    // Setup event listeners for all elements
    this.setupTemplateListeners(elements);
    this.setupEditorActionListeners(elements);
    this.setupCompilationListeners(elements);
    this.setupSettingsListeners(elements);
  }

  private setupTemplateListeners(elements: DOMElements): void {
    // Template change handler
    if (elements.template) {
      elements.template.addEventListener("change", () => {
        loadSelectedTemplate();
      });
    }

    // Language change handler
    if (elements.language) {
      elements.language.addEventListener("change", () => {
        handleLanguageChange();
      });
    }
  }

  private setupEditorActionListeners(elements: DOMElements): void {
    // Code snapshot button
    if (elements.codesnap) {
      elements.codesnap.addEventListener("click", debounce(takeCodeSnap, 300));
    }

    // Format button
    if (elements.format) {
      elements.format.addEventListener(
        "click",
        debounce(() => {
          const editorService = getEditorService();
          const code = editorService.getValue();
          const lang = elements.language?.value || "c";
          this.codeActions.formatCode(code, lang);
        }, 300)
      );
    }

    // Style check button
    if (elements.styleCheck) {
      elements.styleCheck.addEventListener(
        "click",
        debounce(() => {
          const editorService = getEditorService();
          const code = editorService.getValue();
          const lang = elements.language?.value || "c";
          this.codeActions.runStyleCheck(code, lang);
        }, 300)
      );
    }

    // Zen Mode button
    const zenModeButton = document.getElementById("zenMode");
    if (zenModeButton) {
      zenModeButton.addEventListener("click", () => {
        const actions = getEditorActions();
        if (actions && actions.toggleZenMode) {
          actions.toggleZenMode();
        } else {
          // Fallback implementation if Actions is not available
          const editorService = getEditorService();
          const editor = editorService.getEditor();
          if (!editor) return;

          const editorWrapper = editor.getWrapperElement();
          editorWrapper.classList.toggle("zen-mode");
          document.body.classList.toggle("zen-mode-active");
          document
            .querySelector(".container")
            ?.classList.toggle("zen-container");
          document.querySelector(".header")?.classList.toggle("hidden-zen");
          document
            .querySelector(".main-container")
            ?.classList.toggle("zen-mode-container");
          document
            .querySelector(".editor-panel")
            ?.classList.toggle("zen-mode-panel");
          document
            .querySelector(".panel-header")
            ?.classList.toggle("zen-mode-minimized");

          // Toggle icon
          const icon = zenModeButton.querySelector("i");
          if (icon) {
            icon.classList.toggle("fa-expand");
            icon.classList.toggle("fa-compress");
          }

          // Force editor refresh
          setTimeout(() => editorService.refresh(), 100);
        }
      });
    }
  }

  private setupCompilationListeners(elements: DOMElements): void {
    // Compile button
    if (elements.compile) {
      elements.compile.addEventListener(
        "click",
        debounce(() => {
          const options = DOMService.getCompileOptions();
          this.compileSocketManager.compile(options);
        }, 300)
      );
    }

    // Debug button
    if (elements.debug) {
      elements.debug.addEventListener(
        "click",
        debounce(() => {
          const options = DOMService.getCompileOptions();
          this.debugController.startDebugSession(options);
        }, 300)
      );
    }

    // Close output panel
    if (elements.closeOutput) {
      elements.closeOutput.addEventListener("click", () => {
        // Clean up both socket managers
        this.compileSocketManager.cleanup();
        this.debugController.cleanup();
        DOMService.hideOutputPanel();
        this.appState.setState({ isOutputVisible: false });
      });
    }

    // View Assembly button
    if (elements.viewAssembly) {
      elements.viewAssembly.addEventListener(
        "click",
        debounce(() => {
          const options = DOMService.getCompileOptions();
          this.codeActions.viewAssembly(options);
        }, 300)
      );
    }

    // Memory check button
    if (elements.memcheck) {
      elements.memcheck.addEventListener(
        "click",
        debounce(() => {
          const options = DOMService.getCompileOptions();
          this.codeActions.runMemCheck(options);
        }, 300)
      );
    }
  }

  private setupSettingsListeners(elements: DOMElements): void {
    // Theme selection
    if (elements.themeSelect) {
      elements.themeSelect.addEventListener("change", () => {
        if (elements.themeSelect) {
          this.editorSettings.setTheme(elements.themeSelect.value);
        }
      });

      // Initialize with saved theme
      if (elements.themeSelect) {
        elements.themeSelect.value = this.appState.getState().theme;
        this.editorSettings.setTheme(elements.themeSelect.value);
      }
    }

    // Vim mode toggle
    if (elements.vimMode) {
      elements.vimMode.addEventListener("change", () => {
        if (elements.vimMode) {
          this.editorSettings.setVimMode(elements.vimMode.checked);
        }
      });

      // Initialize with saved vim mode
      if (elements.vimMode) {
        elements.vimMode.checked = this.appState.getState().vimMode;
        this.editorSettings.setVimMode(elements.vimMode.checked);
      }
    }
  }
}

// Initialize app on load
const app = new CinCoutApp();
app.init();
