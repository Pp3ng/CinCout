// Layout manager module - React-ready architecture
(() => {
  // === Types ===

  // Component state interface (would be React component state)
  interface PanelState {
    isOutputVisible: boolean;
    activeTab: "output" | "assembly";
  }

  // DOM elements references (would be React refs)
  interface UIElements {
    outputPanel: HTMLElement | null;
    editorPanel: HTMLElement | null;
    closeOutputBtn: HTMLElement | null;
    outputTab: HTMLElement | null;
    assemblyTab: HTMLElement | null;
    outputContent: HTMLElement | null;
    assemblyContent: HTMLElement | null;
    actionButtons: HTMLElement[];
  }

  // Window interface extension for global access (would be eliminated in React)
  declare global {
    interface Window {
      editor: any;
      assemblyView: any;
      fitAddon: any;
      terminal: any;
      CinCoutSocket: {
        isProcessRunning: () => boolean;
        isConnected: () => boolean;
        disconnect: () => void;
      };
    }
  }

  // === State ===

  // Initial state (would be React's useState initial value)
  const initialState: PanelState = {
    isOutputVisible: false,
    activeTab: "output",
  };

  // Current state (would be React state)
  let panelState: PanelState = { ...initialState };

  // === Component Implementation ===

  // Main initialization function (would be React's useEffect)
  const initialize = (): void => {
    const elements = getUIElements();
    setupEventListeners(elements);
    renderUI(elements);
  };

  // Get all required DOM elements (would be React refs)
  const getUIElements = (): UIElements => {
    // Get action buttons with one query instead of multiple getElementById calls
    const actionButtons = Array.from(
      document.querySelectorAll(
        "#compile, #viewAssembly, #styleCheck, #memcheck"
      )
    ) as HTMLElement[];

    return {
      outputPanel: document.getElementById("outputPanel"),
      editorPanel: document.querySelector(".editor-panel"),
      closeOutputBtn: document.getElementById("closeOutput"),
      outputTab: document.getElementById("outputTab"),
      assemblyTab: document.getElementById("assemblyTab"),
      outputContent: document.getElementById("output"),
      assemblyContent: document.getElementById("assembly"),
      actionButtons,
    };
  };

  // Setup all event listeners (would be React useEffect hooks)
  const setupEventListeners = (elements: UIElements): void => {
    // Close button
    elements.closeOutputBtn?.addEventListener("click", () => {
      setState({ isOutputVisible: false });
      renderUI(elements);
    });

    // Action buttons
    elements.actionButtons.forEach((button) => {
      button?.addEventListener(
        "click",
        () => {
          handleRunningProcess();

          setState({
            isOutputVisible: true,
            activeTab: button.id === "viewAssembly" ? "assembly" : "output",
          });

          renderUI(elements);
        },
        true
      );
    });

    // Tab switching
    elements.outputTab?.addEventListener("click", () => {
      if (panelState.activeTab === "assembly") handleRunningProcess();
      setState({ activeTab: "output" });
      renderUI(elements);
    });

    elements.assemblyTab?.addEventListener("click", () => {
      if (panelState.activeTab === "output") handleRunningProcess();
      setState({ activeTab: "assembly" });
      renderUI(elements);
    });

    // Window resize handler (using debounce for performance)
    window.addEventListener("resize", refreshEditors);
  };

  // Update state (would be React's setState)
  const setState = (newState: Partial<PanelState>): void => {
    panelState = { ...panelState, ...newState };
  };

  // Render UI based on state (would be React's render method)
  const renderUI = (elements: UIElements): void => {
    const { isOutputVisible, activeTab } = panelState;

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

      // Clear output when switching to output tab
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
    refreshEditors();
  };

  // Handle editors refresh
  const refreshEditors = (): void => {
    // Main editor refresh
    if (window.editor) {
      window.editor.refresh();
    }

    // Assembly view refresh (only if visible)
    if (panelState.activeTab === "assembly" && window.assemblyView) {
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

  // Handle running process (disconnect WebSocket if needed)
  const handleRunningProcess = (): void => {
    if (
      window.CinCoutSocket?.isConnected?.() &&
      typeof window.CinCoutSocket.disconnect === "function"
    ) {
      window.CinCoutSocket.disconnect();
    }
  };

  // Initialize on DOM content loaded
  document.addEventListener("DOMContentLoaded", initialize);
})();
