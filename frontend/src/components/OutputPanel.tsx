import React, { useEffect, useRef } from "react";
import useTerminal from "../hooks/useTerminal";
import { useSocket } from "../context/SocketContext";
import { socketManager, SocketEvents } from "../services/WebSocketManager";
import { terminalManager } from "../services/TerminalManager";

interface OutputPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

const OutputPanel: React.FC<OutputPanelProps> = ({ isVisible, onClose }) => {
  const { containerRef, terminalRef, resetTerminal } = useTerminal({
    autoFocus: true,
  });
  const { cleanup } = useSocket();
  const outputRef = useRef<HTMLDivElement>(null);

  // Effect to handle terminal initialization when panel becomes visible
  useEffect(() => {
    if (isVisible && containerRef.current) {
      // Set proper DOM elements for terminal manager
      terminalManager.setDomElements({
        output: document.getElementById("output"),
        outputPanel: document.getElementById("outputPanel"),
      });

      // When the panel becomes visible, focus the terminal
      const timer = setTimeout(() => {
        if (terminalRef.current) {
          terminalRef.current.focus();
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isVisible, containerRef, terminalRef]);

  // Effect to handle cleanup when panel becomes invisible
  useEffect(() => {
    if (!isVisible) {
      // Make sure we clean up when the panel is hidden
      handleCleanup();
    }
  }, [isVisible]);

  // Complete cleanup function that ensures all resources are released
  const handleCleanup = () => {
    try {
      // First cleanup socket connections
      cleanup();

      // Then dispose terminal completely
      terminalManager.dispose();

      // Reset socket state to ensure no lingering state
      socketManager.setProcessRunning(false);
    } catch (error) {
      console.error("Error cleaning up output panel resources:", error);
    }
  };

  // Handle close button click
  const handleClose = () => {
    // Run cleanup tasks
    handleCleanup();

    // Notify parent to hide the panel
    onClose();
  };

  return (
    <div
      id="outputPanel"
      className="panel output-panel"
      style={{ display: isVisible ? "flex" : "none" }}
    >
      <div className="panel-header">
        <div className="button-container">
          <button id="closeOutput" className="action-btn" onClick={handleClose}>
            <i className="fas fa-times"></i> Close
          </button>
        </div>
      </div>
      <div id="output" ref={outputRef}>
        <div ref={containerRef} className="terminal-container"></div>
      </div>
    </div>
  );
};

export default OutputPanel;
