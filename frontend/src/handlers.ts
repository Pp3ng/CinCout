// Import utility functions
import { takeCodeSnap, showNotification } from "./utils";
import { ThemeService } from "./services/frontend-services";
import { ApiService } from "./services/api-service";
import CompileSocketManager from "./compileSocket";
import DebugSocketManager from "./debugSocket";
import { debounce } from "lodash-es";
import {
  CompileOptions,
  CompileStateUpdater,
  DebugStateUpdater,
  UIState,
  DOMElements,
  CompilationState,
} from "./types";
import { EditorService } from "./editor";
import { layoutManager } from "./layout";

// ------------------------------------------------------------
// UI Services - Will become React components in future
// ------------------------------------------------------------

/**
 * DOM Service - handles DOM interactions
 * In React, these would be handled by component state and refs
 */
export class DOMService {
  static getElements(): DOMElements {
    return {
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

  static setOutput(html: string): void {
    layoutManager.setOutput(html);
  }

  static showLoadingInOutput(text: string): void {
    layoutManager.showLoadingInOutput(text);
  }

  static toggleOutputPanel(show: boolean): void {
    layoutManager.toggleOutputPanel(show);
  }

  static showOutputPanel(): void {
    layoutManager.showOutputPanel();
  }

  static hideOutputPanel(): void {
    layoutManager.hideOutputPanel();
  }

  static getCompileOptions(): CompileOptions {
    const elements = this.getElements();
    return {
      code: EditorService.getValue(),
      lang: elements.language?.value || "c",
      compiler: elements.compiler?.value || "gcc",
      optimization: elements.optimization?.value || "O0",
    };
  }
}

// ------------------------------------------------------------
// State Management - Will become React Context/Hooks
// ------------------------------------------------------------

/**
 * Store - React-like state management
 * In React, this would be replaced by useState, useReducer, or Context
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

/**
 * Base state adapter with common functionality
 * In React, this would be handled through Context or custom hooks
 */
class BaseStateAdapter {
  protected appState: AppState;

  constructor(appState: AppState) {
    this.appState = appState;
  }

  updateCompilationState(state: string): void {
    let compilationState: CompilationState;

    switch (state) {
      case "idle":
        compilationState = CompilationState.IDLE;
        break;
      case "compiling":
        compilationState = CompilationState.COMPILING;
        break;
      case "running":
        compilationState = CompilationState.RUNNING;
        break;
      default:
        compilationState = CompilationState.IDLE;
    }

    this.appState.setState({ compilationState });
  }

  showOutput(): void {
    DOMService.showOutputPanel();
    this.appState.setState({ isOutputVisible: true });
  }

  refreshEditor(): void {
    setTimeout(() => EditorService.refresh(), 10);
  }
}

// UI State adapter for CompileSocketManager
class CompileStateAdapter
  extends BaseStateAdapter
  implements CompileStateUpdater
{
  updateProcessRunning(running: boolean): void {
    this.appState.setState({ isProcessRunning: running });
  }
}

// UI State adapter for DebugSocketManager
class DebugStateAdapter extends BaseStateAdapter implements DebugStateUpdater {
  updateDebugState(state: string): void {
    this.updateCompilationState(state);
  }

  setDebuggingActive(active: boolean): void {
    this.appState.setState({ isDebuggingActive: active });
  }
}

// ------------------------------------------------------------
// Feature Services - Will become React custom hooks
// ------------------------------------------------------------

/**
 * CodeActionsService - Manages code-related actions
 * In React, this would become a custom hook (useCodeActions)
 */
export class CodeActionsService {
  private compileSocketManager: CompileSocketManager | null = null;

  // Remove dependency on appState as it's not used
  constructor() {}

  setCompileSocketManager(manager: CompileSocketManager): void {
    this.compileSocketManager = manager;
  }

  async compile(options: CompileOptions): Promise<void> {
    if (!this.compileSocketManager) return;
    await this.compileSocketManager.compile(options);
  }

  async viewAssembly(options: CompileOptions): Promise<void> {
    // Show output panel
    DOMService.showOutputPanel();
    DOMService.showLoadingInOutput("Generating assembly code...");

    try {
      const data = await ApiService.fetchAssembly(options);

      // Create a container for assembly display
      const output = document.getElementById("output");
      if (output) {
        output.innerHTML = '<div id="assembly-view-container"></div>';
        const container = document.getElementById("assembly-view-container");

        // Use the assemblyView to display the assembly code
        const assemblyView = (window as any).assemblyView;
        if (assemblyView && container) {
          assemblyView.setValue(data.trim());
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
      const data = await ApiService.runMemCheck(options);
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
    const cursor = EditorService.getCursor();

    try {
      const data = await ApiService.formatCode(code, lang);

      // Apply formatting changes while preserving editor state
      const formattedData = data.trim();
      const scrollInfo = EditorService.getScrollInfo();

      EditorService.setValue(formattedData);
      EditorService.setCursor(cursor);
      EditorService.scrollTo(scrollInfo.left, scrollInfo.top);
      EditorService.refresh();

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
      const data = await ApiService.runStyleCheck(code, lang);

      // Process and format the output using native JavaScript
      const formattedLines = data
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => !!line)
        .map(
          (line) =>
            `<div class="style-block" style="white-space: pre-wrap; overflow: visible;">${line}</div>`
        )
        .join("\n");

      DOMService.setOutput(
        `<div class="style-check-output" style="white-space: pre-wrap; overflow: visible;">${formattedLines}</div>`
      );
    } catch (error) {
      DOMService.setOutput(
        `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Error: ${error}</div>`
      );
    }
  }
}

/**
 * DebugService - Manages GDB debugging actions
 * In React, this would become a custom hook (useDebugActions)
 */
export class DebugService {
  private debugSocketManager: DebugSocketManager | null = null;

  constructor() {}

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
 * ThemeService - Manages editor theme settings
 * In React, this would be part of a custom hook (useEditorSettings)
 */
export class EditorSettingsService {
  constructor() {}

  setTheme(theme: string): void {
    localStorage.setItem("cincout-theme", theme);
    ThemeService.setTheme(theme);
  }
}

// ------------------------------------------------------------
// Main Application Class - Will become React App component
// ------------------------------------------------------------

/**
 * AppController - Main application controller
 * In React, this would be the App component
 */
export class AppController {
  private appState: AppState;
  private compileSocketManager: CompileSocketManager;
  private debugSocketManager: DebugSocketManager;
  private codeActions: CodeActionsService;
  private debugService: DebugService;

  constructor() {
    // Initialize state
    this.appState = new AppState();

    // Create state adapters
    const compileStateAdapter = new CompileStateAdapter(this.appState);
    const debugStateAdapter = new DebugStateAdapter(this.appState);

    // Initialize managers with adapters
    this.compileSocketManager = new CompileSocketManager(compileStateAdapter);
    this.debugSocketManager = new DebugSocketManager(debugStateAdapter);

    // Initialize services
    this.codeActions = new CodeActionsService();
    this.codeActions.setCompileSocketManager(this.compileSocketManager);

    this.debugService = new DebugService();
    this.debugService.setDebugSocketManager(this.debugSocketManager);
  }

  init(): void {
    document.addEventListener("DOMContentLoaded", () => {
      this.setupEventListeners();
    });
  }

  private setupEventListeners(): void {
    // Get all DOM elements once
    const elements = DOMService.getElements();

    // Setup event listeners for all elements
    this.setupEditorActionListeners(elements);
    this.setupCompilationListeners(elements);
  }

  /**
   * Add an event listener with debounce for a button
   * @param element - Button element
   * @param handler - Click handler
   * @param debounceTime - Debounce time in ms
   */
  private addButtonListener(
    element: HTMLElement | null,
    handler: () => void,
    debounceTime = 300
  ): void {
    if (element) {
      element.addEventListener("click", debounce(handler, debounceTime));
    }
  }

  private setupEditorActionListeners(elements: DOMElements): void {
    // Code snapshot button
    this.addButtonListener(elements.codesnap, takeCodeSnap);

    // Format button
    this.addButtonListener(elements.format, () => {
      const code = EditorService.getValue();
      const lang = elements.language?.value || "c";
      this.codeActions.formatCode(code, lang);
    });

    // Style check button
    this.addButtonListener(elements.styleCheck, () => {
      const code = EditorService.getValue();
      const lang = elements.language?.value || "c";
      this.codeActions.runStyleCheck(code, lang);
    });

    // Zen Mode button
    const zenModeButton = document.getElementById("zenMode");
    this.addButtonListener(zenModeButton, () => {
      const editor = (window as any).editor;
      if (!editor) return;

      const editorWrapper = editor.getWrapperElement();
      const elements = [
        { el: editorWrapper, cls: "zen-mode" },
        { el: document.body, cls: "zen-mode-active" },
        { el: document.querySelector(".container"), cls: "zen-container" },
        { el: document.querySelector(".header"), cls: "hidden-zen" },
        {
          el: document.querySelector(".main-container"),
          cls: "zen-mode-container",
        },
        {
          el: document.querySelector(".editor-panel"),
          cls: "zen-mode-panel",
        },
        {
          el: document.querySelector(".panel-header"),
          cls: "zen-mode-minimized",
        },
      ];

      // Toggle class for each element
      elements.forEach(({ el, cls }) => el?.classList.toggle(cls));

      // Toggle icon
      const icon = zenModeButton?.querySelector("i");
      if (icon) {
        icon.classList.toggle("fa-expand");
        icon.classList.toggle("fa-compress");
      }

      // Force editor refresh
      setTimeout(() => editor.refresh(), 100);
    });
  }

  private setupCompilationListeners(elements: DOMElements): void {
    // Compile button
    this.addButtonListener(elements.compile, () => {
      const options = DOMService.getCompileOptions();
      this.compileSocketManager.compile(options);
    });

    // Debug button
    this.addButtonListener(elements.debug, () => {
      const options = DOMService.getCompileOptions();
      this.debugService.startDebugSession(options);
    });

    // Close output panel
    this.addButtonListener(
      elements.closeOutput,
      () => {
        // Clean up both socket managers
        this.compileSocketManager.cleanup();
        this.debugService.cleanup();
        DOMService.hideOutputPanel();
        this.appState.setState({ isOutputVisible: false });
      },
      0 // No debounce for UI closing
    );

    // View Assembly button
    this.addButtonListener(elements.viewAssembly, () => {
      const options = DOMService.getCompileOptions();
      this.codeActions.viewAssembly(options);
    });

    // Memory check button
    this.addButtonListener(elements.memcheck, () => {
      const options = DOMService.getCompileOptions();
      this.codeActions.runMemCheck(options);
    });
  }
}

// Create and initialize application instance
const app = new AppController();
app.init();
