// Import utility functions
import { debounce, takeCodeSnap, showNotification } from "./utils";
import { themeStoreInstance } from "./themes";
import CompileSocketManager, {
  CompileOptions,
  CompileStateUpdater,
} from "./compileSocket";

// ------------------------------------------------------------
// Types - Move to separate types.ts file for React migration
// ------------------------------------------------------------

// Define WebSocket-related interfaces
export interface CinCoutSocket {
  init: (messageHandler: (event: MessageEvent) => void) => void;
  sendData: (data: any) => Promise<void>;
  isConnected: () => boolean;
  getSessionId: () => string | null;
  setSessionId: (id: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  setProcessRunning: (running: boolean) => void;
  isProcessRunning: () => boolean;
  updateStateFromMessage: (type: string) => void;
  getCompilationState: () => string;
}

// Interfaces for typed state management - React style
export interface UIState {
  isOutputVisible: boolean;
  activeTab: "output" | "assembly";
  isLoading: boolean;
  loadingMessage: string;
  isProcessRunning: boolean;
  compilationState: "idle" | "compiling" | "running";
  theme: string;
  vimMode: boolean;
}

// DOM Elements interface for better type safety
interface DOMElements {
  template: HTMLElement | null;
  vimMode: HTMLInputElement | null;
  language: HTMLSelectElement | null;
  outputTab: HTMLElement | null;
  assemblyTab: HTMLElement | null;
  output: HTMLElement | null;
  assembly: HTMLElement | null;
  compile: HTMLElement | null;
  memcheck: HTMLElement | null;
  format: HTMLElement | null;
  viewAssembly: HTMLElement | null;
  styleCheck: HTMLElement | null;
  themeSelect: HTMLSelectElement | null;
  outputPanel: HTMLElement | null;
  closeOutput: HTMLElement | null;
  codesnap: HTMLElement | null;
  compiler: HTMLSelectElement | null;
  optimization: HTMLSelectElement | null;
}

// ------------------------------------------------------------
// Services - These will become React hooks/services
// ------------------------------------------------------------

/**
 * API Service - handles all API calls
 * In React, this would become a custom hook (useApiService)
 */
export class ApiService {
  static async fetchAssembly(options: CompileOptions): Promise<string> {
    const response = await fetch("/api/assembly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error(`Assembly API error: ${response.statusText}`);
    }

    return await response.text();
  }

  static async runMemCheck(options: CompileOptions): Promise<string> {
    const response = await fetch("/api/memcheck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error(`Memcheck API error: ${response.statusText}`);
    }

    return await response.text();
  }

  static async formatCode(code: string, lang: string): Promise<string> {
    const response = await fetch("/api/format", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, lang }),
    });

    if (!response.ok) {
      throw new Error(`Format API error: ${response.statusText}`);
    }

    return await response.text();
  }

  static async runStyleCheck(code: string, lang: string): Promise<string> {
    const response = await fetch("/api/styleCheck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, lang }),
    });

    if (!response.ok) {
      throw new Error(`Style check API error: ${response.statusText}`);
    }

    return await response.text();
  }
}

/**
 * Editor Service - handles editor-specific functionality
 * In React, this would become a custom hook (useEditor)
 */
export class EditorService {
  static getValue(): string {
    return (window as any).editor?.getValue() || "";
  }

  static setValue(value: string): void {
    if ((window as any).editor) {
      (window as any).editor.setValue(value);
    }
  }

  static getCursor(): any {
    return (window as any).editor?.getCursor();
  }

  static setCursor(cursor: any): void {
    if ((window as any).editor) {
      (window as any).editor.setCursor(cursor);
    }
  }

  static getScrollInfo(): any {
    return (window as any).editor?.getScrollInfo();
  }

  static scrollTo(left: number, top: number): void {
    if ((window as any).editor) {
      (window as any).editor.scrollTo(left, top);
    }
  }

  static refresh(): void {
    if ((window as any).editor) {
      (window as any).editor.refresh();
    }
  }

  static setOption(key: string, value: any): void {
    if ((window as any).editor) {
      (window as any).editor.setOption(key, value);
    }
  }

  static setAssemblyValue(value: string): void {
    if ((window as any).assemblyView) {
      (window as any).assemblyView.setValue(value);
    }
  }
}

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
      outputTab: document.getElementById("outputTab"),
      assemblyTab: document.getElementById("assemblyTab"),
      output: document.getElementById("output"),
      assembly: document.getElementById("assembly"),
      compile: document.getElementById("compile"),
      memcheck: document.getElementById("memcheck"),
      format: document.getElementById("format"),
      viewAssembly: document.getElementById("viewAssembly"),
      styleCheck: document.getElementById("styleCheck"),
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
    if (outputPanel) {
      outputPanel.style.display = "flex";
      document.querySelector(".editor-panel")?.classList.add("with-output");
    }
  }

  static hideOutputPanel(): void {
    const outputPanel = document.getElementById("outputPanel");
    if (outputPanel) {
      outputPanel.style.display = "none";
      document.querySelector(".editor-panel")?.classList.remove("with-output");
    }
  }

  static activateTab(tabId: string): void {
    const tab = document.getElementById(tabId);
    if (tab) {
      tab.click();
    }
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
      activeTab: "output",
      isLoading: false,
      loadingMessage: "",
      isProcessRunning: false,
      compilationState: "idle",
      theme: localStorage.getItem("cincout-theme") || "default",
      vimMode: localStorage.getItem("cincout-vim-mode") === "true",
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
    this.appState.setState({
      compilationState: state as "idle" | "compiling" | "running",
    });
  }

  updateProcessRunning(running: boolean): void {
    this.appState.setState({ isProcessRunning: running });
  }

  showOutput(): void {
    DOMService.showOutputPanel();
    this.appState.setState({ isOutputVisible: true });
  }

  activateOutputTab(): void {
    DOMService.activateTab("outputTab");
    this.appState.setState({ activeTab: "output" });
  }

  refreshEditor(): void {
    setTimeout(() => EditorService.refresh(), 10);
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
    // Update UI state
    this.appState.setState({ activeTab: "assembly" });
    DOMService.activateTab("assemblyTab");

    // Get assembly div and prepare loading state
    const assemblyDiv = document.getElementById("assembly") as HTMLElement;
    const loadingDiv = DOMService.createLoadingElement(
      "Generating assembly code"
    );
    const cmContainer = assemblyDiv.querySelector(".CodeMirror");

    // Show loading state
    if (cmContainer) {
      assemblyDiv.insertBefore(loadingDiv, cmContainer);
    } else {
      assemblyDiv.appendChild(loadingDiv);
    }

    EditorService.setAssemblyValue("");

    try {
      const data = await ApiService.fetchAssembly(options);

      // Remove loading div and update view
      if (loadingDiv.parentNode) {
        loadingDiv.parentNode.removeChild(loadingDiv);
      }

      EditorService.setAssemblyValue(data.trim());
    } catch (error) {
      // Remove loading div and show error
      if (loadingDiv.parentNode) {
        loadingDiv.parentNode.removeChild(loadingDiv);
      }

      EditorService.setAssemblyValue("Error: " + error);
    }
  }

  async runMemCheck(options: CompileOptions): Promise<void> {
    // Update UI state
    this.appState.setState({ activeTab: "output" });
    DOMService.activateTab("outputTab");
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
      const formattedData = data.replace(/^\n+/, "").replace(/\n+$/, "");
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
    // Update UI state
    this.appState.setState({ activeTab: "output" });
    DOMService.activateTab("outputTab");
    DOMService.showLoadingInOutput("Running style check...");

    try {
      const data = await ApiService.runStyleCheck(code, lang);

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
    EditorService.setOption("keyMap", enabled ? "vim" : "default");
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
  private codeActions: CodeActionsController;
  private editorSettings: EditorSettingsController;

  constructor() {
    // Initialize state
    this.appState = new AppState();

    // Create state adapter for CompileSocketManager
    const stateAdapter = new CompileStateAdapter(this.appState);

    // Initialize controllers
    this.compileSocketManager = new CompileSocketManager(
      (window as any).CinCoutSocket,
      stateAdapter
    );

    this.codeActions = new CodeActionsController(this.appState);
    this.codeActions.setCompileSocketManager(this.compileSocketManager);
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
    this.setupTemplateListeners(elements);
    this.setupEditorActionListeners(elements);
    this.setupCompilationListeners(elements);
    this.setupSettingsListeners(elements);
  }

  private setupTemplateListeners(elements: DOMElements): void {
    // Template change handler
    if (elements.template) {
      elements.template.addEventListener("change", () => {
        if (typeof window.setTemplate === "function") {
          window.setTemplate();
        }
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
          const code = EditorService.getValue();
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
          const code = EditorService.getValue();
          const lang = elements.language?.value || "c";
          this.codeActions.runStyleCheck(code, lang);
        }, 300)
      );
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

    // Close output panel
    if (elements.closeOutput) {
      elements.closeOutput.addEventListener("click", () => {
        this.compileSocketManager.cleanup();
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
        this.editorSettings.setTheme(elements.themeSelect.value);
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
        this.editorSettings.setVimMode(elements.vimMode.checked);
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

// Declare global objects
declare global {
  interface Window {
    CinCoutSocket: CinCoutSocket;
    editor: any;
    assemblyView: any;
    fitAddon: any;
    terminal: any;
    templates: any;
    templateLists: Record<string, string[]>;
    loadedTemplates: Set<string>;
    updateTemplates: () => Promise<void>;
    setTemplate: () => Promise<void>;
    html2canvas: any;
    getTerminalTheme: () => any;
    resetCompilationState: () => void;
  }
}
