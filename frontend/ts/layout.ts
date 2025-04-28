// Import types from centralized type definition
import { PanelState } from "./types";

// Component structure designed from React perspective
class LayoutManager {
  // State (will be converted to React's useState)
  state: PanelState = {
    isOutputVisible: false,
    activeTab: "output",
  };

  // DOM element references (will be converted to React's useRef)
  elements = {
    outputPanel: null as HTMLElement | null,
    editorPanel: null as HTMLElement | null,
    closeOutputBtn: null as HTMLElement | null,
    outputTab: null as HTMLElement | null,
    assemblyTab: null as HTMLElement | null,
    outputContent: null as HTMLElement | null,
    assemblyContent: null as HTMLElement | null,
    actionButtons: [] as HTMLElement[],
  };

  // Initialization method (will be converted to React's useEffect)
  initialize(): void {
    this.getUIElements();
    this.setupEventListeners();
    this.render();
  }

  // Get DOM elements (will be converted to React's useRef initialization)
  getUIElements(): void {
    this.elements = {
      outputPanel: document.getElementById("outputPanel"),
      editorPanel: document.querySelector(".editor-panel"),
      closeOutputBtn: document.getElementById("closeOutput"),
      outputTab: document.getElementById("outputTab"),
      assemblyTab: document.getElementById("assemblyTab"),
      outputContent: document.getElementById("output"),
      assemblyContent: document.getElementById("assembly"),
      actionButtons: Array.from(
        document.querySelectorAll(
          "#compile, #viewAssembly, #styleCheck, #memcheck"
        )
      ) as HTMLElement[],
    };
  }

  // Set up event listeners (will be converted to React's event handlers)
  setupEventListeners(): void {
    // Close button
    this.elements.closeOutputBtn?.addEventListener("click", () => {
      this.setState({ isOutputVisible: false });
    });

    // Action buttons
    this.elements.actionButtons.forEach((button) => {
      button?.addEventListener(
        "click",
        () => {
          this.handleRunningProcess();
          this.setState({
            isOutputVisible: true,
            activeTab: button.id === "viewAssembly" ? "assembly" : "output",
          });
        },
        true
      );
    });

    // Tab switching
    this.elements.outputTab?.addEventListener("click", () => {
      if (this.state.activeTab === "assembly") this.handleRunningProcess();
      this.setState({ activeTab: "output" });
    });

    this.elements.assemblyTab?.addEventListener("click", () => {
      if (this.state.activeTab === "output") this.handleRunningProcess();
      this.setState({ activeTab: "assembly" });
    });

    // Window resize handler
    window.addEventListener("resize", this.refreshEditors);
  }

  // Update state (will be converted to React's setState)
  setState(newState: Partial<PanelState>): void {
    this.state = { ...this.state, ...newState };
    this.render(); // Re-render UI after state update
  }

  // Render UI (will be converted to React's render method)
  render(): void {
    const { isOutputVisible, activeTab } = this.state;
    const elements = this.elements;

    // Output panel visibility
    if (elements.outputPanel && elements.editorPanel) {
      elements.outputPanel.style.display = isOutputVisible ? "flex" : "none";
      elements.editorPanel.classList.toggle("with-output", isOutputVisible);
    }

    // Active tab
    if (elements.outputTab && elements.assemblyTab) {
      const isOutputActive = activeTab === "output";
      elements.outputTab.classList.toggle("active", isOutputActive);
      elements.assemblyTab.classList.toggle("active", !isOutputActive);

      // Clear output content when switching to output tab
      if (isOutputActive && elements.outputContent) {
        elements.outputContent.innerHTML = "";
      }
    }

    // Content visibility
    if (elements.outputContent && elements.assemblyContent) {
      elements.outputContent.style.display =
        activeTab === "output" ? "block" : "none";
      elements.assemblyContent.style.display =
        activeTab === "assembly" ? "block" : "none";
    }

    // Refresh editors after UI changes
    this.refreshEditors();
  }

  // Refresh editors
  refreshEditors = (): void => {
    // Main editor refresh
    if (window.editor) {
      window.editor.refresh();
    }

    // Assembly view refresh (only when visible)
    if (this.state.activeTab === "assembly" && window.assemblyView) {
      window.assemblyView.refresh();
    }

    // Terminal resize
    if (window.fitAddon && window.terminal) {
      try {
        window.fitAddon.fit();
      } catch (error) {
        console.error("Error fitting terminal:", error);
      }
    }
  };

  handleRunningProcess(): void {
    if (window.CinCoutSocket?.isConnected?.()) {
      if (typeof window.CinCoutSocket.disconnect === "function") {
        window.CinCoutSocket.disconnect();
      }
    }
  }
}

// Create and initialize layout manager instance
document.addEventListener("DOMContentLoaded", () => {
  const layoutManager = new LayoutManager();
  layoutManager.initialize();
});
