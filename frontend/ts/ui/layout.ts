// Import types from centralized type definition
import { WebSocketManager } from "../ws/webSocketManager";

// Define the panel state interface
interface PanelState {
  isOutputVisible: boolean;
}

// Layout utilities - will convert to React hooks and components
export const useLayout = () => {
  // State (will be converted to React's useState)
  const state: PanelState = {
    isOutputVisible: false,
  };

  // Action buttons that affect layout
  const actionButtons = [
    "#compile",
    "#viewAssembly",
    "#lintCode",
    "#memcheck",
    "#debug",
  ];

  let websocketManager: WebSocketManager | null = null;

  // Update state (will be converted to React's setState)
  const setState = (newState: Partial<PanelState>): void => {
    Object.assign(state, newState);
  };

  // Handle websocket connections
  const handleRunningProcess = (): void => {
    if (websocketManager && websocketManager.isConnected()) {
      websocketManager.disconnect();
    }
  };

  // Set up event listeners for layout-specific elements
  const setupLayoutEventListeners = (): void => {
    // Close output button
    const closeOutputBtn = document.getElementById("closeOutput");
    closeOutputBtn?.addEventListener("click", () => {
      setState({ isOutputVisible: false });
    });

    // Action buttons that affect the layout
    actionButtons.forEach((selector) => {
      const button = document.querySelector(selector);
      button?.addEventListener(
        "click",
        () => {
          handleRunningProcess();
          setState({ isOutputVisible: true });
        },
        true
      );
    });
  };

  // Initialize layout manager
  const initialize = (): void => {
    setupLayoutEventListeners();
    websocketManager = new WebSocketManager();
  };

  return {
    initialize,
    setState,
    handleRunningProcess,
  };
};
