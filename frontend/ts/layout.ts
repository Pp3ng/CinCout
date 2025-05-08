// Import types from centralized type definition
import { PanelState } from "./types";
import { getEditorService } from "./editor";
import { WebSocketManager } from "./websocket";

// Component structure designed from React perspective
class LayoutManager {
  // State (will be converted to React's useState)
  state: PanelState = {
    isOutputVisible: false,
  };

  // DOM element references (will be converted to React's useRef)
  elements = {
    outputPanel: null as HTMLElement | null,
    editorPanel: null as HTMLElement | null,
    closeOutputBtn: null as HTMLElement | null,
    outputContent: null as HTMLElement | null,
    actionButtons: [] as HTMLElement[],
  };

  private websocketManager: WebSocketManager | null = null;

  // Initialization method (will be converted to React's useEffect)
  initialize(): void {
    this.getUIElements();
    this.setupEventListeners();
    this.websocketManager = new WebSocketManager();
    this.render();
  }

  // Get DOM elements (will be converted to React's useRef initialization)
  getUIElements(): void {
    this.elements = {
      outputPanel: document.getElementById("outputPanel"),
      editorPanel: document.querySelector(".editor-panel"),
      closeOutputBtn: document.getElementById("closeOutput"),
      outputContent: document.getElementById("output"),
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
      // Clear output content when closing the panel
      this.clearOutputContent();
    });

    // Action buttons
    this.elements.actionButtons.forEach((button) => {
      button?.addEventListener(
        "click",
        () => {
          this.handleRunningProcess();
          this.setState({ isOutputVisible: true });
        },
        true
      );
    });
  }

  // Update state (will be converted to React's setState)
  setState(newState: Partial<PanelState>): void {
    this.state = { ...this.state, ...newState };
    this.render(); // Re-render UI after state update
  }

  // Render UI (will be converted to React's render method)
  render(): void {
    const { isOutputVisible } = this.state;
    const elements = this.elements;

    // Output panel visibility
    if (elements.outputPanel && elements.editorPanel) {
      elements.outputPanel.style.display = isOutputVisible ? "flex" : "none";
      elements.editorPanel.classList.toggle("with-output", isOutputVisible);

      // Clear output content when panel is hidden
      if (!isOutputVisible) {
        this.clearOutputContent();
      }
    }

    // Refresh editors after UI changes
    this.refreshEditors();
  }

  // Clear output content
  clearOutputContent(): void {
    if (this.elements.outputContent) {
      this.elements.outputContent.innerHTML = "";
    }
  }

  // Refresh editors
  refreshEditors = (): void => {
    const editorService = getEditorService();
    editorService.refresh();
  };

  handleRunningProcess(): void {
    if (this.websocketManager && this.websocketManager.isConnected()) {
      this.websocketManager.disconnect();
    }
  }
}

// Create and initialize layout manager instance
document.addEventListener("DOMContentLoaded", () => {
  const layoutManager = new LayoutManager();
  layoutManager.initialize();
});
