import React, { useEffect, useCallback, useLayoutEffect } from "react";
import { debounce } from "lodash-es";
import useEditor from "../hooks/useEditor";
import { useTemplates } from "../context/TemplateContext";
import { useUIState, useCodeConfig } from "../context/UIStateContext";
import { useApiService } from "../context/ApiServiceContext";
import { useSocket } from "../context/SocketContext";
import { codeSnapService } from "../services/CodeSnapService";
import { EditorService } from "../services/EditorService";

interface EditorPanelProps {
  isOutputVisible: boolean;
}

const EditorPanel: React.FC<EditorPanelProps> = ({ isOutputVisible }) => {
  const { state, toggleZenMode } = useUIState();
  const { config } = useCodeConfig();
  const { textareaRef, getValue, refresh } = useEditor();
  const { formatCode, runStyleCheck, viewAssembly, runMemCheck } =
    useApiService();
  const { compileCode, startDebugSession } = useSocket();

  // Use templates hook to have access to template state
  const { isLoading: templatesLoading } = useTemplates();

  // Refresh editor when output visibility changes or templates load
  useEffect(() => {
    refresh();
  }, [isOutputVisible, refresh]);

  // Button event handlers with debounce
  const handleCompile = useCallback(
    debounce(() => {
      compileCode();
    }, 300),
    [compileCode]
  );

  const handleDebug = useCallback(
    debounce(() => {
      startDebugSession();
    }, 300),
    [startDebugSession]
  );

  const handleFormat = useCallback(
    debounce(() => {
      const code = getValue();
      formatCode(code, config.language);
    }, 300),
    [formatCode, getValue, config.language]
  );

  const handleStyleCheck = useCallback(
    debounce(() => {
      const code = getValue();
      runStyleCheck(code, config.language);
    }, 300),
    [runStyleCheck, getValue, config.language]
  );

  const handleViewAssembly = useCallback(
    debounce(() => {
      viewAssembly();
    }, 300),
    [viewAssembly]
  );

  const handleMemCheck = useCallback(
    debounce(() => {
      runMemCheck();
    }, 300),
    [runMemCheck]
  );

  // Enhanced Zen Mode handler using the centralized state
  const handleZenMode = useCallback(() => {
    // Toggle zen mode in the context
    toggleZenMode();

    // Get the current state after toggle (inverted from previous)
    const newZenMode = !state.isZenMode;

    // Get editor instance
    const editor = EditorService.getEditor();
    if (!editor) return;

    const editorWrapper = editor.getWrapperElement();

    // Apply CSS classes based on the new zen mode state
    const elements = [
      { el: editorWrapper, cls: "zen-mode" },
      { el: document.body, cls: "zen-mode-active" },
      { el: document.querySelector(".container"), cls: "zen-container" },
      {
        el: document.querySelector(".main-container"),
        cls: "zen-mode-container",
      },
      { el: document.querySelector(".editor-panel"), cls: "zen-mode-panel" },
      {
        el: document.querySelector(".panel-header"),
        cls: "zen-mode-minimized",
      },
    ];

    // Apply or remove classes based on zen mode state
    elements.forEach(({ el, cls }) => {
      if (el) {
        if (newZenMode) {
          el.classList.add(cls);
        } else {
          el.classList.remove(cls);
        }
      }
    });
  }, [state.isZenMode, toggleZenMode]);

  useLayoutEffect(() => {
    const editor = EditorService.getEditor();
    if (editor) {
      editor.refresh();
    }
  }, [state.isZenMode]);

  const handleCodeSnap = useCallback(
    debounce(() => {
      codeSnapService.takeSnapshot();
    }, 300),
    []
  );

  // Listen for shortcut events
  useEffect(() => {
    // Define event handlers for shortcuts
    const eventHandlers = {
      "cincout:shortcut:compile": handleCompile,
      "cincout:shortcut:debug": handleDebug,
      "cincout:shortcut:formatCode": handleFormat,
      "cincout:shortcut:styleCheck": handleStyleCheck,
      "cincout:shortcut:viewAssembly": handleViewAssembly,
      "cincout:shortcut:memCheck": handleMemCheck,
      "cincout:shortcut:zenMode": handleZenMode,
      "cincout:shortcut:codeSnap": handleCodeSnap,
    };

    // Register event listeners
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      document.addEventListener(event, handler);
    });

    // Clean up event listeners on unmount
    return () => {
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        document.removeEventListener(event, handler);
      });
    };
  }, [
    handleCompile,
    handleDebug,
    handleFormat,
    handleStyleCheck,
    handleViewAssembly,
    handleMemCheck,
    handleZenMode,
    handleCodeSnap,
  ]);

  return (
    <div
      className={`panel editor-panel ${isOutputVisible ? "with-output" : ""}`}
    >
      <div className="panel-header">
        <div className="button-container">
          <button
            id="styleCheck"
            className="action-btn"
            onClick={handleStyleCheck}
            disabled={templatesLoading}
          >
            <i className="fas fa-check"></i> Lint Code
          </button>
          <button
            id="format"
            className="action-btn"
            onClick={handleFormat}
            disabled={templatesLoading}
          >
            <i className="fas fa-align-left"></i> Format
          </button>
          <button
            id="compile"
            className="action-btn"
            onClick={handleCompile}
            disabled={templatesLoading}
          >
            <i className="fas fa-play"></i> Compile & Run
          </button>
          <button
            id="debug"
            className="action-btn"
            onClick={handleDebug}
            disabled={templatesLoading}
          >
            <i className="fas fa-bug"></i> Debug
          </button>
          <button
            id="viewAssembly"
            className="action-btn"
            onClick={handleViewAssembly}
            disabled={templatesLoading}
          >
            <i className="fas fa-cogs"></i> View Assembly
          </button>
          <button
            id="memcheck"
            className="action-btn"
            onClick={handleMemCheck}
            disabled={templatesLoading}
          >
            <i className="fas fa-memory"></i> Leak Detector
          </button>
        </div>
        <div className="button-container right-aligned">
          <button id="codeSnap" className="action-btn" onClick={handleCodeSnap}>
            <i className="fas fa-camera"></i> Code Snap
          </button>
          <button id="zenMode" className="action-btn" onClick={handleZenMode}>
            <i
              className={`fas ${state.isZenMode ? "fa-compress" : "fa-expand"}`}
            ></i>{" "}
            Zen Mode
          </button>
        </div>
      </div>
      <textarea id="code" ref={textareaRef}></textarea>
    </div>
  );
};

export default EditorPanel;
