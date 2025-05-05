import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DomElementId,
  ShortcutDefinition,
  ShortcutCategories,
  ShortcutState,
  ShortcutMap,
} from "../types";

/**
 * Core utilities for shortcut handling
 */
const DOM = {
  editor: () => (window as any).editor,
  get: (id: DomElementId) => document.getElementById(id),
};

/**
 * Platform and key handling utilities
 */
const ShortcutUtils = {
  isMac: /Mac/.test(window.navigator.userAgent),

  triggerElement: (id: DomElementId): void => {
    DOM.get(id)?.click();
  },

  normalizeKey: (event: KeyboardEvent): string => {
    const key = event.key.toLowerCase();
    // Normalize special keys
    if (key === "enter" || key === "escape")
      return key.charAt(0).toUpperCase() + key.slice(1);

    // Build modifier string
    const modifiers = [
      event.ctrlKey && "ctrl",
      event.altKey && "alt",
      event.metaKey && "meta",
      event.shiftKey && "shift",
    ].filter(Boolean);

    if (!modifiers.length) return event.key;

    const prefix = modifiers.join("+") + "+";
    // Only apply prefix to single character keys or numbers
    return key.length === 1 || /^[0-9]$/.test(key) ? prefix + key : event.key;
  },
};

/**
 * Shortcut actions - functions triggered by shortcuts
 */
const getActions = () => ({
  ui: {
    compile: () => ShortcutUtils.triggerElement(DomElementId.COMPILE),
    viewAssembly: () =>
      ShortcutUtils.triggerElement(DomElementId.VIEW_ASSEMBLY),
    formatCode: () => ShortcutUtils.triggerElement(DomElementId.FORMAT),
    styleCheck: () => ShortcutUtils.triggerElement(DomElementId.STYLE_CHECK),
    memoryCheck: () => ShortcutUtils.triggerElement(DomElementId.MEMORY_CHECK),
    debug: () => ShortcutUtils.triggerElement(DomElementId.DEBUG),
    takeCodeSnapshot: () => ShortcutUtils.triggerElement(DomElementId.CODESNAP),
    closeOutputPanel: (): boolean => {
      const outputPanel = DOM.get(DomElementId.OUTPUT_PANEL);
      if (outputPanel && outputPanel.style.display !== "none") {
        ShortcutUtils.triggerElement(DomElementId.CLOSE_OUTPUT);
        Promise.resolve().then(() => DOM.editor()?.focus());
        return true;
      }
      return false;
    },
  },

  editor: {
    toggleCodeFolding: (): void => {
      const editor = DOM.editor();
      if (editor) editor.foldCode(editor.getCursor());
    },

    saveCodeToFile: async (): Promise<void> => {
      const editor = DOM.editor();
      if (!editor) return;

      try {
        const code = editor.getValue();
        const fileType =
          (DOM.get(DomElementId.LANGUAGE) as HTMLSelectElement)?.value === "cpp"
            ? "cpp"
            : "c";
        const blob = new Blob([code], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        // Create and click download link
        Object.assign(document.createElement("a"), {
          href: url,
          download: `code.${fileType}`,
        }).click();

        setTimeout(() => URL.revokeObjectURL(url), 100);
      } catch (error) {
        console.error("Failed to save file:", error);
      }
    },

    openCodeFromFile: async (): Promise<void> => {
      try {
        const fileInput = Object.assign(document.createElement("input"), {
          type: "file",
          accept: ".c,.cpp",
        });
        fileInput.click();

        const file = await new Promise<File | null>((resolve) => {
          fileInput.onchange = (e) =>
            resolve((e.target as HTMLInputElement).files?.[0] || null);
          fileInput.oncancel = () => resolve(null);
        });

        if (!file) return;

        const content = await file.text();
        DOM.editor()?.setValue(content);
      } catch (error) {
        console.error("Failed to open file:", error);
      }
    },
  },

  view: {
    toggleZenMode: (): void => {
      const editor = DOM.editor();
      if (!editor) return;

      const editorWrapper = editor.getWrapperElement();
      const isZenMode = editorWrapper.classList.contains("zen-mode");
      const outputPanel = DOM.get(DomElementId.OUTPUT_PANEL);

      // Toggle zen mode classes
      const elements = {
        editor: editorWrapper,
        body: document.body,
        container: document.querySelector(".container"),
        header: document.querySelector(".header"),
        mainContainer: document.querySelector(".main-container"),
        editorPanel: document.querySelector(".editor-panel"),
        panelHeader: document.querySelector(".panel-header"),
      };

      elements.editor.classList.toggle("zen-mode");
      elements.body.classList.toggle("zen-mode-active");
      elements.container?.classList.toggle("zen-container");
      elements.header?.classList.toggle("hidden-zen");
      elements.mainContainer?.classList.toggle("zen-mode-container");
      elements.editorPanel?.classList.toggle("zen-mode-panel");
      elements.panelHeader?.classList.toggle("zen-mode-minimized");

      // Manage output panel in zen mode
      if (outputPanel && outputPanel.style.display !== "none") {
        if (isZenMode) {
          // Reset output panel styles
          ["position", "top", "right", "bottom", "width", "zIndex"].forEach(
            (prop) => (outputPanel.style[prop as any] = "")
          );
        }
      }

      // Update button icon
      const zenButton = DOM.get(DomElementId.ZEN_MODE)?.querySelector("i");
      if (zenButton) {
        zenButton.classList.toggle("fa-expand");
        zenButton.classList.toggle("fa-compress");
      }

      // Force editor refresh
      setTimeout(() => editor.refresh(), 100);
    },
  },
});

/**
 * Action descriptions - centralized descriptions for actions
 */
const ActionDescriptions = {
  compile: "Compile and run",
  saveCode: "Save code to file",
  openCode: "Open code from file",
  toggleFolding: "Toggle code folding",
  takeSnapshot: "Take code snapshot",
  zenMode: "Zen Mode",
  viewAssembly: "View assembly code",
  formatCode: "Format code",
  styleCheck: "Style check",
  memoryCheck: "Memory check",
  debug: "Debug with GDB",
  closeOutput: "Close output panel",
};

/**
 * Create shortcut configuration based on platform
 */
function createShortcuts(
  actions: ReturnType<typeof getActions>
): ShortcutCategories {
  const cmdKey = ShortcutUtils.isMac ? "meta" : "ctrl";
  const isMac = ShortcutUtils.isMac;

  // Common shortcuts that use cmd/ctrl key combinations
  const common: ShortcutMap = {
    [`${cmdKey}+Enter`]: {
      action: actions.ui.compile,
      description: ActionDescriptions.compile,
      displayKeys: isMac ? ["⌘", "return"] : ["Ctrl", "Enter"],
    },
    [`${cmdKey}+s`]: {
      action: actions.editor.saveCodeToFile,
      description: ActionDescriptions.saveCode,
      displayKeys: isMac ? ["⌘", "S"] : ["Ctrl", "S"],
    },
    [`${cmdKey}+o`]: {
      action: actions.editor.openCodeFromFile,
      description: ActionDescriptions.openCode,
      displayKeys: isMac ? ["⌘", "O"] : ["Ctrl", "O"],
    },
    [`${cmdKey}+k`]: {
      action: actions.editor.toggleCodeFolding,
      description: ActionDescriptions.toggleFolding,
      displayKeys: isMac ? ["⌘", "K"] : ["Ctrl", "K"],
    },
    [`${cmdKey}+p`]: {
      action: actions.ui.takeCodeSnapshot,
      description: ActionDescriptions.takeSnapshot,
      displayKeys: isMac ? ["⌘", "P"] : ["Ctrl", "P"],
    },
    [`${cmdKey}+shift+z`]: {
      action: actions.view.toggleZenMode,
      description: ActionDescriptions.zenMode,
      displayKeys: isMac ? ["⌘", "⇧", "Z"] : ["Ctrl", "Shift", "Z"],
    },
  };

  // Define number action mappings only once
  const numberActions = [
    {
      action: actions.ui.viewAssembly,
      description: ActionDescriptions.viewAssembly,
    },
    {
      action: actions.ui.formatCode,
      description: ActionDescriptions.formatCode,
    },
    {
      action: actions.ui.styleCheck,
      description: ActionDescriptions.styleCheck,
    },
    {
      action: actions.ui.memoryCheck,
      description: ActionDescriptions.memoryCheck,
    },
    {
      action: actions.ui.debug,
      description: ActionDescriptions.debug,
    },
  ];

  // Platform-specific mappings for number shortcuts
  const mac: ShortcutMap = {};
  const other: ShortcutMap = {};

  // Generate platform-specific shortcuts for numbers
  numberActions.forEach(({ action, description }, index) => {
    const num = index + 1;
    mac[`ctrl+${num}`] = {
      action,
      description,
      displayKeys: ["^", `${num}`],
    };
    other[`alt+${num}`] = {
      action,
      description,
      displayKeys: ["Alt", `${num}`],
    };
  });

  // Special keys that don't change between platforms
  const special: ShortcutMap = {
    Escape: {
      action: () => actions.ui.closeOutputPanel(),
      description: ActionDescriptions.closeOutput,
      displayKeys: ["Esc"],
    },
  };

  return { common, mac, other, special };
}

/**
 * React hook for keyboard shortcuts
 */
export function useShortcuts() {
  const [enabled, setEnabled] = useState(true);

  // Initialize state with platform detection
  const initialState: ShortcutState = useMemo(
    () => ({
      currentOS: ShortcutUtils.isMac ? "MacOS" : "Other",
      isMac: ShortcutUtils.isMac,
      shortcuts: createShortcuts(getActions()),
    }),
    []
  );

  const [state] = useState<ShortcutState>(initialState);

  // Event handler for keyboard shortcuts
  const handleKeyboardEvent = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Handle Escape key with priority
      if (event.key === "Escape" && getActions().ui.closeOutputPanel()) {
        event.preventDefault();
        return;
      }

      // Handle Enter with modifiers
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        getActions().ui.compile();
        return;
      }

      // Handle other shortcuts
      const normalizedKey = ShortcutUtils.normalizeKey(event);
      const { common, mac, other, special } = state.shortcuts;

      // Find matching shortcut from relevant maps
      const shortcut =
        special[normalizedKey] ||
        common[normalizedKey] ||
        (state.isMac ? mac : other)[normalizedKey];

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    },
    [state.shortcuts, state.isMac, enabled]
  );

  // Set up and clean up event listeners
  useEffect(() => {
    if (enabled) {
      document.addEventListener("keydown", handleKeyboardEvent);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyboardEvent);
    };
  }, [handleKeyboardEvent, enabled]);

  // Get all active shortcuts
  const getAllShortcuts = useCallback((): ShortcutDefinition[] => {
    const { common, mac, other, special } = state.shortcuts;

    // Combine all shortcuts into a single array
    const allShortcuts = [
      ...Object.values(common),
      ...Object.values(state.isMac ? mac : other),
      ...Object.values(special),
    ];

    return allShortcuts;
  }, [state.shortcuts, state.isMac]);

  // Enable/disable shortcuts
  const toggleShortcuts = useCallback((enable: boolean) => {
    setEnabled(enable);
  }, []);

  // Make the Utils and Actions accessible outside the hook
  const utils = useMemo(() => ShortcutUtils, []);

  // Return interface
  return {
    shortcuts: getAllShortcuts(),
    isMac: state.isMac,
    enabled,
    toggleShortcuts,
    utils,
  };
}

export default useShortcuts;
