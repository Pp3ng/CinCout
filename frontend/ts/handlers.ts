// Import utility functions
import { debounce, takeCodeSnap, showNotification } from "./utils";
import { terminalManager } from "./terminal";
import { themeStoreInstance } from "./themes";

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

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

// Interfaces for typed state management - React style
export interface CompileOptions {
  lang: string;
  compiler: string;
  optimization: string;
  code: string;
}

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

// Component-like modules
export class WebSocketManager {
  private socket: CinCoutSocket;
  private appState: AppState;

  constructor(socket: CinCoutSocket, appState: AppState) {
    this.socket = socket;
    this.appState = appState;
    this.socket.init(this.handleWebSocketMessage.bind(this));
  }

  // Simulates React useEffect cleanup
  cleanup(): void {
    try {
      const sessionId = this.socket.getSessionId();
      if (sessionId && this.socket.isConnected()) {
        console.log(
          `Sending cleanup request for session ${sessionId} and disconnecting...`
        );
        this.socket
          .sendData({
            type: "cleanup",
            sessionId: sessionId,
          })
          .catch((e) => console.error("Error sending cleanup message:", e));

        this.socket.disconnect();
      }
    } catch (error) {
      console.error("Failed to handle cleanup:", error);
    }
  }

  async compile(options: CompileOptions): Promise<void> {
    if (this.socket.isProcessRunning()) {
      console.log("A process is already running, ignoring compile request");
      return;
    }

    if (options.code.trim() === "") {
      this.showOutputMessage(
        '<div class="error-output">Error: Code cannot be empty</div>'
      );
      return;
    }

    try {
      this.showOutput();
      this.showOutputMessage('<div class="loading">Connecting...</div>');

      await this.socket.connect();
      this.showOutputMessage(
        '<div class="loading">Sending code for compilation...</div>'
      );

      await this.socket.sendData({
        type: "compile",
        code: options.code,
        lang: options.lang,
        compiler: options.compiler,
        optimization: options.optimization,
      });
    } catch (error) {
      console.error("WebSocket operation failed:", error);
      this.showOutputMessage(
        '<div class="error-output">Error: WebSocket connection failed. Please try again.</div>'
      );

      try {
        this.socket.disconnect();
      } catch (e) {
        console.error("Error disconnecting after failure:", e);
      }
    }
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    const data = JSON.parse(event.data) as WebSocketMessage;
    this.socket.updateStateFromMessage(data.type);

    // Update app state based on socket state
    this.appState.setState({
      compilationState: this.socket.getCompilationState() as
        | "idle"
        | "compiling"
        | "running",
      isProcessRunning: this.socket.isProcessRunning(),
    });

    switch (data.type) {
      case "connected":
        this.socket.setSessionId(data.sessionId);
        break;

      case "compiling":
        this.showOutput();
        this.activateOutputTab();
        this.showOutputMessage('<div class="loading">Compiling</div>');
        this.refreshEditor();
        break;

      case "compile-error":
        this.showOutputMessage(
          `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">${data.output}</div>`
        );
        this.socket.disconnect();
        break;

      case "compile-success":
        terminalManager.dispose();
        this.showOutput();
        this.activateOutputTab();

        terminalManager.setDomElements({
          output: document.getElementById("output"),
          outputPanel: document.getElementById("outputPanel"),
          outputTab: document.getElementById("outputTab"),
        });

        terminalManager.setupTerminal();
        this.refreshEditor();
        break;

      case "output":
        terminalManager.write(data.output);
        break;

      case "error":
        console.error(
          "Received error from server:",
          data.output || data.message
        );
        terminalManager.writeError(data.output || data.message);
        break;

      case "memcheck-report":
        // Display memcheck report using the old approach - direct insertion into output
        if (data.output && document.getElementById("output")) {
          document.getElementById(
            "output"
          ).innerHTML = `<div class="memcheck-output" style="white-space: pre-wrap; overflow: visible;">${data.output}</div>`;

          // After receiving the memcheck report, disconnect the WebSocket
          setTimeout(() => {
            this.socket.disconnect();
          }, 100);
        }
        break;

      case "exit":
        // First display the exit message
        terminalManager.writeExitMessage(data.code);

        // If we're running a memcheck session, immediately show the "waiting for report" message
        if (data.isMemcheck === true) {
          const output = document.getElementById("output");
          if (output) {
            output.innerHTML = `<div class="loading">Processing memory check results...</div>`;
          }
          // Don't disconnect - wait for the memcheck-report message
        } else {
          // Regular run - disconnect immediately
          this.socket.disconnect();
        }
        break;

      default:
        console.log(`Unknown message type: ${data.type}`);
    }
  }

  private showOutput(): void {
    const outputPanel = document.getElementById("outputPanel");
    if (outputPanel) {
      outputPanel.style.display = "flex";
      this.appState.setState({ isOutputVisible: true });
    }
    document.querySelector(".editor-panel")?.classList.add("with-output");
  }

  private activateOutputTab(): void {
    const outputTab = document.getElementById("outputTab");
    if (outputTab) {
      outputTab.click();
      this.appState.setState({ activeTab: "output" });
    }
  }

  private showOutputMessage(html: string): void {
    const output = document.getElementById("output");
    if (output) {
      output.innerHTML = html;
    }
  }

  private refreshEditor(): void {
    if ((window as any).editor) {
      setTimeout(() => (window as any).editor.refresh(), 10);
    }
  }
}

// Component-like module for code actions
export class CodeActions {
  private appState: AppState;
  private webSocketManager: WebSocketManager | null = null;

  constructor(appState: AppState) {
    this.appState = appState;
  }

  setWebSocketManager(manager: WebSocketManager): void {
    this.webSocketManager = manager;
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
      const response = await fetch("/api/compile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: options.code,
          lang: options.lang,
          compiler: options.compiler,
          optimization: options.optimization,
          action: "assembly",
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
    // Use WebSocket for interactive memcheck if available
    if (this.webSocketManager) {
      try {
        const outputTab = document.getElementById("outputTab");
        if (outputTab) {
          outputTab.click();
          this.appState.setState({ activeTab: "output" });
        }
        await (window as any).CinCoutSocket.connect();

        // Send the memcheck request through WebSocket
        await (window as any).CinCoutSocket.sendData({
          type: "memcheck",
          code: options.code,
          lang: options.lang,
          compiler: options.compiler,
          optimization: options.optimization,
        });

        return;
      } catch (error) {
        console.error("WebSocket memcheck failed:", error);
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
  private webSocketManager: WebSocketManager;
  private codeActions: CodeActions;
  private editorSettings: EditorSettings;

  constructor() {
    // Initialize state
    this.appState = new AppState();

    // Initialize components (like React's useXXX hooks)
    this.webSocketManager = new WebSocketManager(
      (window as any).CinCoutSocket,
      this.appState
    );
    this.codeActions = new CodeActions(this.appState);
    this.codeActions.setWebSocketManager(this.webSocketManager);
    this.editorSettings = new EditorSettings(this.appState);

    // Event handlers will be attached in init()
  }

  init(): void {
    document.addEventListener("DOMContentLoaded", () => {
      this.setupEventListeners();

      // Initialize template system (existing functionality)
      if (typeof window.updateTemplates === "function") {
        window.updateTemplates();
      }
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

    // React-like effect for language change
    if (elements.language) {
      elements.language.addEventListener("change", async () => {
        const lang = elements.language.value;
        if (typeof window.updateTemplates === "function") {
          await window.updateTemplates();
        }
      });
    }

    // React-like effect for template change
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
          this.webSocketManager.compile(options);
        }, 300)
      );
    }

    // Close output panel
    if (elements.closeOutput) {
      elements.closeOutput.addEventListener("click", () => {
        this.webSocketManager.cleanup();
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
