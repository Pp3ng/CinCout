// Import utility functions
import { takeCodeSnap, showNotification } from "./utils";
import { ThemeService } from "./services/frontend-services";
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

// ------------------------------------------------------------
// Services - These will become React hooks/services
// ------------------------------------------------------------

/**
 * API Service - handles all API calls
 * In React, this would become a custom hook (useApiService)
 */
export class ApiService {
  /**
   * Make a generic API POST request
   * @param endpoint - API endpoint
   * @param data - Request data
   * @returns Promise with response data
   */
  private static async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API error (${endpoint}): ${response.statusText}`);
    }

    return (await response.text()) as unknown as T;
  }

  static async fetchAssembly(options: CompileOptions): Promise<string> {
    return this.post<string>("assembly", options);
  }

  static async runMemCheck(options: CompileOptions): Promise<string> {
    return this.post<string>("memcheck", options);
  }

  static async formatCode(code: string, lang: string): Promise<string> {
    return this.post<string>("format", { code, lang });
  }

  static async runStyleCheck(code: string, lang: string): Promise<string> {
    return this.post<string>("styleCheck", { code, lang });
  }
}

/**
 * Editor Service - handles editor-specific functionality
 * In React, this would become a custom hook (useEditor)
 */
export class EditorService {
  private static getEditor() {
    return (window as any).editor;
  }

  static getValue(): string {
    return this.getEditor()?.getValue() || "";
  }

  static setValue(value: string): void {
    const editor = this.getEditor();
    if (editor) {
      editor.setValue(value);
    }
  }

  static getCursor(): any {
    return this.getEditor()?.getCursor();
  }

  static setCursor(cursor: any): void {
    const editor = this.getEditor();
    if (editor) {
      editor.setCursor(cursor);
    }
  }

  static getScrollInfo(): any {
    return this.getEditor()?.getScrollInfo();
  }

  static scrollTo(left: number, top: number): void {
    const editor = this.getEditor();
    if (editor) {
      editor.scrollTo(left, top);
    }
  }

  static refresh(): void {
    const editor = this.getEditor();
    if (editor) {
      editor.refresh();
    }
  }

  static setOption(key: string, value: any): void {
    const editor = this.getEditor();
    if (editor) {
      editor.setOption(key, value);
    }
  }

  static setAssemblyValue(value: string): void {
    if ((window as any).assemblyView) {
      (window as any).assemblyView.setValue(value);
    }
  }

  // Methods for React integration - set select values with change event triggering
  static setSelectValue(selectId: string, value: string): void {
    const select = document.getElementById(selectId) as HTMLSelectElement;
    if (select && select.value !== value) {
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  static setLanguage(language: string): void {
    this.setSelectValue("language", language);
  }

  static setCompiler(compiler: string): void {
    this.setSelectValue("compiler", compiler);
  }

  static setOptimization(optimization: string): void {
    this.setSelectValue("optimization", optimization);
  }
}

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
    const output = document.getElementById("output");
    if (output) {
      output.innerHTML = html;
    }
  }

  static showLoadingInOutput(text: string): void {
    this.setOutput(`<div class='loading'>${text}</div>`);
  }

  static toggleOutputPanel(show: boolean): void {
    const outputPanel = document.getElementById("outputPanel");
    if (!outputPanel) return;

    // Toggle display
    outputPanel.style.display = show ? "flex" : "none";
    document
      .querySelector(".editor-panel")
      ?.classList.toggle("with-output", show);

    // Handle zen mode
    const isZenMode = document.body.classList.contains("zen-mode-active");
    if (isZenMode) {
      EditorService.refresh();
    }

    // Clear output content when hiding
    if (!show) {
      const output = document.getElementById("output");
      if (output) output.innerHTML = "";
    }
  }

  static showOutputPanel(): void {
    this.toggleOutputPanel(true);
  }

  static hideOutputPanel(): void {
    this.toggleOutputPanel(false);
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
    ThemeService.setTheme(theme);
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
      if (typeof Actions !== "undefined" && Actions.toggleZenMode) {
        Actions.toggleZenMode();
      } else {
        // Fallback implementation if Actions is not available
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
      }
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
      this.debugController.startDebugSession(options);
    });

    // Close output panel
    this.addButtonListener(
      elements.closeOutput,
      () => {
        // Clean up both socket managers
        this.compileSocketManager.cleanup();
        this.debugController.cleanup();
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

const app = new CinCoutApp();
app.init();
