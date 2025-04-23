// Import utility functions
import { debounce, takeCodeSnap, showNotification } from "./utils";
import { terminalManager } from "./terminal";
import { themeStoreInstance } from "./themes";
import CompileSocketManager, {
  CompileOptions,
  CompileStateUpdater,
} from "./compileSocket";

// Define WebSocket-related interfaces - These would typically be in a types.ts file
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

// Context/State Management (mimicking React's Context API)
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

  // React-like state update
  setState(partialState: Partial<UIState>): void {
    this.state = { ...this.state, ...partialState };
    this.notifyListeners();
  }

  getState(): UIState {
    return { ...this.state };
  }

  // React-like subscription mechanism
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
    const outputPanel = document.getElementById("outputPanel");
    if (outputPanel) {
      outputPanel.style.display = "flex";
      this.appState.setState({ isOutputVisible: true });
    }
    document.querySelector(".editor-panel")?.classList.add("with-output");
  }

  activateOutputTab(): void {
    const outputTab = document.getElementById("outputTab");
    if (outputTab) {
      outputTab.click();
      this.appState.setState({ activeTab: "output" });
    }
  }

  refreshEditor(): void {
    if ((window as any).editor) {
      setTimeout(() => (window as any).editor.refresh(), 10);
    }
  }
}

// Component-like module for code actions
export class CodeActions {
  private appState: AppState;
  private compileSocketManager: CompileSocketManager | null = null;

  constructor(appState: AppState) {
    this.appState = appState;
  }

  setCompileSocketManager(manager: CompileSocketManager): void {
    this.compileSocketManager = manager;
  }

  async viewAssembly(options: CompileOptions): Promise<void> {
    const assemblyTab = document.getElementById("assemblyTab");
    if (assemblyTab) {
      assemblyTab.click();
      this.appState.setState({ activeTab: "assembly" });
    }

    // Create a loading div
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "loading";
    loadingDiv.textContent = "Generating assembly code";

    // Get assembly div and its CodeMirror container
    const assemblyDiv = document.getElementById("assembly") as HTMLElement;
    const cmContainer = assemblyDiv.querySelector(".CodeMirror");

    // Insert loadingDiv before cmcontainer
    if (cmContainer) {
      assemblyDiv.insertBefore(loadingDiv, cmContainer);
    } else {
      assemblyDiv.appendChild(loadingDiv);
    }

    if (window.assemblyView) {
      window.assemblyView.setValue("");
    }

    try {
      const response = await fetch("/api/assembly", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: options.code,
          lang: options.lang,
          compiler: options.compiler,
          optimization: options.optimization,
        }),
      });

      const data = await response.text();

      // Remove loading div
      if (loadingDiv.parentNode) {
        loadingDiv.parentNode.removeChild(loadingDiv);
      }

      const trimmedData = data.trim();
      if (window.assemblyView) {
        window.assemblyView.setValue(trimmedData);
      }
    } catch (error) {
      // Remove loading div
      if (loadingDiv.parentNode) {
        loadingDiv.parentNode.removeChild(loadingDiv);
      }

      if (window.assemblyView) {
        window.assemblyView.setValue("Error: " + error);
      }
    }
  }

  async runMemCheck(options: CompileOptions): Promise<void> {
    const outputTab = document.getElementById("outputTab");
    if (outputTab) {
      outputTab.click();
      this.appState.setState({ activeTab: "output" });
    }

    const output = document.getElementById("output");
    if (output) {
      output.innerHTML = "<div class='loading'>Running memory check...</div>";
    }

    try {
      const response = await fetch("/api/memcheck", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: options.code,
          lang: options.lang,
          compiler: options.compiler,
          optimization: options.optimization,
        }),
      });

      const data = await response.text();

      if (output) {
        output.innerHTML = `<div class="memcheck-output" style="white-space: pre-wrap; overflow: visible;">${data}</div>`;
      }
    } catch (error) {
      console.error("Memcheck error:", error);
      if (output) {
        output.innerHTML = `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Error: ${error}</div>`;
      }
    }
  }

  async formatCode(code: string, lang: string): Promise<void> {
    const cursor = (window as any).editor.getCursor();

    try {
      const response = await fetch("/api/format", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code,
          lang: lang,
        }),
      });

      const data = await response.text();
      // Remove leading and trailing newlines
      const formattedData = data.replace(/^\n+/, "").replace(/\n+$/, "");
      const scrollInfo = (window as any).editor.getScrollInfo();
      (window as any).editor.setValue(formattedData);
      (window as any).editor.setCursor(cursor);
      (window as any).editor.scrollTo(scrollInfo.left, scrollInfo.top);
      (window as any).editor.refresh();

      // Show success notification in the center of the editor panel
      showNotification("success", "Code formatted successfully", 2000, {
        top: "50%",
        left: "50%",
      });
    } catch (error) {
      console.error("Format error:", error);
      // Show error notification in the center of the editor panel
      showNotification("error", "Failed to format code", 3000, {
        top: "50%",
        left: "50%",
      });
    }
  }

  async runStyleCheck(code: string, lang: string): Promise<void> {
    const outputTab = document.getElementById("outputTab");
    if (outputTab) {
      outputTab.click();
      this.appState.setState({ activeTab: "output" });
    }

    const output = document.getElementById("output");
    if (output) {
      output.innerHTML = "<div class='loading'>Running style check...</div>";
    }

    try {
      const response = await fetch("/api/styleCheck", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code,
          lang: lang,
        }),
      });

      const data = await response.text();
      const lines = data.split("\n");
      const formattedLines = lines
        .map((line) => {
          if (line.trim()) {
            // The line is already formatted by the backend
            return `<div class="style-block" style="white-space: pre-wrap; overflow: visible;">${line}</div>`;
          }
          return "";
        })
        .filter((line) => line);

      if (output) {
        output.innerHTML = `<div class="style-check-output" style="white-space: pre-wrap; overflow: visible;">${formattedLines.join(
          "\n"
        )}</div>`;
      }
    } catch (error) {
      if (output) {
        output.innerHTML = `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Error: ${error}</div>`;
      }
    }
  }
}

// React-like hooks for editor settings
export class EditorSettings {
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
    if ((window as any).editor) {
      (window as any).editor.setOption("keyMap", enabled ? "vim" : "default");
    }
  }
}

// Main App Component - pulls everything together
export class CinCoutApp {
  private appState: AppState;
  private compileSocketManager: CompileSocketManager;
  private codeActions: CodeActions;
  private editorSettings: EditorSettings;

  constructor() {
    // Initialize state
    this.appState = new AppState();

    // Create state adapter for CompileSocketManager
    const stateAdapter = new CompileStateAdapter(this.appState);

    // Initialize components (like React's useXXX hooks)
    this.compileSocketManager = new CompileSocketManager(
      (window as any).CinCoutSocket,
      stateAdapter
    );

    this.codeActions = new CodeActions(this.appState);
    this.codeActions.setCompileSocketManager(this.compileSocketManager);
    this.editorSettings = new EditorSettings(this.appState);

    // Event handlers will be attached in init()
  }

  init(): void {
    document.addEventListener("DOMContentLoaded", () => {
      this.setupEventListeners();
      // No need to initialize templates here, it's handled in templates.ts
    });
  }

  private setupEventListeners(): void {
    // Collect DOM elements
    const elements = {
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
    };

    // Template change handler
    if (elements.template) {
      elements.template.addEventListener("change", () => {
        if (typeof window.setTemplate === "function") {
          window.setTemplate();
        }
      });
    }

    // Code snapshot button
    if (elements.codesnap) {
      elements.codesnap.addEventListener("click", debounce(takeCodeSnap, 300));
    }

    // Compile button
    if (elements.compile) {
      elements.compile.addEventListener(
        "click",
        debounce(() => {
          const options = this.getCompileOptions();
          this.compileSocketManager.compile(options);
        }, 300)
      );
    }

    // Close output panel
    if (elements.closeOutput) {
      elements.closeOutput.addEventListener("click", () => {
        this.compileSocketManager.cleanup();
      });
    }

    // View Assembly button
    if (elements.viewAssembly) {
      elements.viewAssembly.addEventListener(
        "click",
        debounce(() => {
          const options = this.getCompileOptions();
          this.codeActions.viewAssembly(options);
        }, 300)
      );
    }

    // Memory check button
    if (elements.memcheck) {
      elements.memcheck.addEventListener(
        "click",
        debounce(() => {
          const options = this.getCompileOptions();
          this.codeActions.runMemCheck(options);
        }, 300)
      );
    }

    // Format button
    if (elements.format) {
      elements.format.addEventListener(
        "click",
        debounce(() => {
          const code = (window as any).editor.getValue();
          const lang = (elements.language as HTMLSelectElement).value;
          this.codeActions.formatCode(code, lang);
        }, 300)
      );
    }

    // Style check button
    if (elements.styleCheck) {
      elements.styleCheck.addEventListener(
        "click",
        debounce(() => {
          const code = (window as any).editor.getValue();
          const lang = (elements.language as HTMLSelectElement).value;
          this.codeActions.runStyleCheck(code, lang);
        }, 300)
      );
    }

    // Theme selection
    if (elements.themeSelect) {
      elements.themeSelect.addEventListener("change", () => {
        this.editorSettings.setTheme(elements.themeSelect.value);
      });

      // Initialize with saved theme
      elements.themeSelect.value = this.appState.getState().theme;
      this.editorSettings.setTheme(elements.themeSelect.value);
    }

    // Vim mode toggle
    if (elements.vimMode) {
      elements.vimMode.addEventListener("change", () => {
        this.editorSettings.setVimMode(elements.vimMode.checked);
      });

      // Initialize with saved vim mode
      elements.vimMode.checked = this.appState.getState().vimMode;
      this.editorSettings.setVimMode(elements.vimMode.checked);
    }
  }

  private getCompileOptions(): CompileOptions {
    return {
      code: (window as any).editor.getValue(),
      lang: (document.getElementById("language") as HTMLSelectElement).value,
      compiler: (document.getElementById("compiler") as HTMLSelectElement)
        .value,
      optimization: (
        document.getElementById("optimization") as HTMLSelectElement
      ).value,
    };
  }
}

// Initialize app on load (equivalent to ReactDOM.render)
const app = new CinCoutApp();
app.init();

// Declare global objects (unchanged from original code)
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
