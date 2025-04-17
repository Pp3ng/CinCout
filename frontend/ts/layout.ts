// Use Immediately Invoked Function Expression (IIFE) to create closure and avoid global namespace pollution
(function () {
  // Component state interface
  interface PanelState {
    isOutputVisible: boolean;
    activeTab: "output" | "assembly";
  }

  // Global state - would be React component state
  let panelState: PanelState = {
    isOutputVisible: false,
    activeTab: "output",
  };

  // Component references - would be React refs
  interface UIElements {
    outputPanel: HTMLElement | null;
    editorPanel: HTMLElement | null;
    closeOutputBtn: HTMLElement | null;
    outputTab: HTMLElement | null;
    assemblyTab: HTMLElement | null;
    outputContent: HTMLElement | null;
    assemblyContent: HTMLElement | null;
    actionButtons: (HTMLElement | null)[];
  }

  // Initialize on DOM ready - equivalent to React's useEffect with empty dependency array
  document.addEventListener("DOMContentLoaded", function () {
    const elements = getElements();

    // Initialize UI based on state - React's initial render
    renderUI(elements);

    // Set up event handlers - similar to React's useEffect for adding event listeners
    setupEventHandlers(elements);
  });

  // Get all DOM elements - similar to React's ref pattern
  function getElements(): UIElements {
    return {
      outputPanel: document.getElementById("outputPanel"),
      editorPanel: document.querySelector(".editor-panel"),
      closeOutputBtn: document.getElementById("closeOutput"),
      outputTab: document.getElementById("outputTab"),
      assemblyTab: document.getElementById("assemblyTab"),
      outputContent: document.getElementById("output"),
      assemblyContent: document.getElementById("assembly"),
      actionButtons: [
        document.getElementById("compile"),
        document.getElementById("viewAssembly"),
        document.getElementById("styleCheck"),
        document.getElementById("memcheck"),
      ],
    };
  }

  // Setup all event handlers - similar to React's useEffect hooks
  function setupEventHandlers(elements: UIElements): void {
    setupCloseButton(elements);
    setupActionButtons(elements);
    setupTabSwitching(elements);
    setupResizeHandler();
  }

  // Setup close button handler
  function setupCloseButton(elements: UIElements): void {
    if (elements.closeOutputBtn) {
      elements.closeOutputBtn.addEventListener("click", function () {
        // Update state - like React's setState
        panelState.isOutputVisible = false;

        // Render UI with new state - like React's re-render
        renderUI(elements);
      });
    }
  }

  // Setup action buttons
  function setupActionButtons(elements: UIElements): void {
    elements.actionButtons.forEach((button) => {
      if (button) {
        button.addEventListener(
          "click",
          function (e) {
            // Check if there's a running process
            handleRunningProcess();

            // Update state - like React's setState
            panelState.isOutputVisible = true;

            // Set active tab based on button
            if (button?.id === "viewAssembly") {
              panelState.activeTab = "assembly";
            } else {
              panelState.activeTab = "output";
            }

            // Render UI with new state - like React's re-render
            renderUI(elements);
          },
          true
        ); // capture phase
      }
    });
  }

  // Setup tab switching
  function setupTabSwitching(elements: UIElements): void {
    if (elements.outputTab) {
      elements.outputTab.addEventListener("click", function () {
        // Check if there's a running process when switching from assembly
        if (panelState.activeTab === "assembly") {
          handleRunningProcess();
        }

        // Update state - like React's setState
        panelState.activeTab = "output";

        // Render UI with new state - like React's re-render
        renderUI(elements);
      });
    }

    if (elements.assemblyTab) {
      elements.assemblyTab.addEventListener("click", function () {
        // Check if there's a running process when switching from output
        if (panelState.activeTab === "output") {
          handleRunningProcess();
        }

        // Update state - like React's setState
        panelState.activeTab = "assembly";

        // Render UI with new state - like React's re-render
        renderUI(elements);
      });
    }
  }

  // Setup window resize handler
  function setupResizeHandler(): void {
    window.addEventListener("resize", function () {
      refreshEditors();
    });
  }

  // Render UI based on state - similar to React's render method
  function renderUI(elements: UIElements): void {
    // Update visibility based on state
    if (elements.outputPanel && elements.editorPanel) {
      elements.outputPanel.style.display = panelState.isOutputVisible
        ? "flex"
        : "none";

      if (panelState.isOutputVisible) {
        elements.editorPanel.classList.add("with-output");
      } else {
        elements.editorPanel.classList.remove("with-output");
      }
    }

    // Update active tab based on state
    if (elements.outputTab && elements.assemblyTab) {
      if (panelState.activeTab === "output") {
        elements.outputTab.classList.add("active");
        elements.assemblyTab.classList.remove("active");
        if (elements.outputContent) {
          elements.outputContent.innerHTML = "";
        }
      } else {
        elements.assemblyTab.classList.add("active");
        elements.outputTab.classList.remove("active");
      }
    }

    // Update content visibility based on state
    if (elements.outputContent && elements.assemblyContent) {
      elements.outputContent.style.display =
        panelState.activeTab === "output" ? "block" : "none";
      elements.assemblyContent.style.display =
        panelState.activeTab === "assembly" ? "block" : "none";
    }

    // Refresh editors after UI changes
    refreshEditors();
  }

  // Helper to refresh editors - would be useEffect in React
  function refreshEditors(): void {
    // Use setTimeout to ensure rendering is complete
    setTimeout(() => {
      // Refresh CodeMirror editor if it exists
      if ((window as any).editor) {
        (window as any).editor.refresh();
      }

      // Refresh assembly view if it exists and is visible
      if (panelState.activeTab === "assembly" && (window as any).assemblyView) {
        (window as any).assemblyView.refresh();
      }

      // Handle terminal resize if it exists
      if ((window as any).fitAddon && (window as any).terminal) {
        try {
          // Try to fit the terminal
          (window as any).fitAddon.fit();
        } catch (error) {
          // If fit fails, manually resize with integer dimensions
          const terminal = (window as any).terminal;
          const containerElement = terminal.element.parentElement;

          if (containerElement) {
            // Get container dimensions
            const containerWidth = containerElement.clientWidth;
            const containerHeight = containerElement.clientHeight;

            // Calculate dimensions based on character size
            // Ensure integers by using Math.floor
            const charWidth =
              terminal._core._renderService.dimensions.actualCellWidth || 9;
            const charHeight =
              terminal._core._renderService.dimensions.actualCellHeight || 17;

            const cols = Math.max(2, Math.floor(containerWidth / charWidth));
            const rows = Math.max(1, Math.floor(containerHeight / charHeight));

            // Manually resize with integer values
            terminal.resize(cols, rows);
          }
        }
      }
    }, 10);
  }

  // Helper to handle running process - would be a custom hook in React
  function handleRunningProcess(): void {
    if (
      (window as any).CinCoutSocket &&
      (window as any).CinCoutSocket.isProcessRunning &&
      (window as any).CinCoutSocket.isConnected()
    ) {
      (window as any).CinCoutSocket.disconnect();
    }
  }
})();
