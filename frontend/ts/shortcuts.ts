// Import types from centralized types file
import {
  DomElementId,
  ShortcutDefinition,
  ShortcutCategories,
  ShortcutState,
} from "./types";

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
export const ShortcutUtils = {
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
export const Actions = {
  ui: {
    compile: () => ShortcutUtils.triggerElement(DomElementId.COMPILE),
    viewAssembly: () =>
      ShortcutUtils.triggerElement(DomElementId.VIEW_ASSEMBLY),
    formatCode: () => ShortcutUtils.triggerElement(DomElementId.FORMAT),
    styleCheck: () => ShortcutUtils.triggerElement(DomElementId.STYLE_CHECK),
    memoryCheck: () => ShortcutUtils.triggerElement(DomElementId.MEMORY_CHECK),
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
};

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
  closeOutput: "Close output panel",
};

/**
 * Create shortcut configuration based on platform
 */
function createShortcuts(): ShortcutCategories {
  const cmdKey = ShortcutUtils.isMac ? "meta" : "ctrl";
  const isMac = ShortcutUtils.isMac;

  // Common shortcuts that use cmd/ctrl key combinations
  const common = {
    [`${cmdKey}+Enter`]: {
      action: Actions.ui.compile,
      description: ActionDescriptions.compile,
      displayKeys: isMac ? ["⌘", "return"] : ["Ctrl", "Enter"],
    },
    [`${cmdKey}+s`]: {
      action: Actions.editor.saveCodeToFile,
      description: ActionDescriptions.saveCode,
      displayKeys: isMac ? ["⌘", "S"] : ["Ctrl", "S"],
    },
    [`${cmdKey}+o`]: {
      action: Actions.editor.openCodeFromFile,
      description: ActionDescriptions.openCode,
      displayKeys: isMac ? ["⌘", "O"] : ["Ctrl", "O"],
    },
    [`${cmdKey}+k`]: {
      action: Actions.editor.toggleCodeFolding,
      description: ActionDescriptions.toggleFolding,
      displayKeys: isMac ? ["⌘", "K"] : ["Ctrl", "K"],
    },
    [`${cmdKey}+p`]: {
      action: Actions.ui.takeCodeSnapshot,
      description: ActionDescriptions.takeSnapshot,
      displayKeys: isMac ? ["⌘", "P"] : ["Ctrl", "P"],
    },
    [`${cmdKey}+shift+z`]: {
      action: Actions.view.toggleZenMode,
      description: ActionDescriptions.zenMode,
      displayKeys: isMac ? ["⌘", "⇧", "Z"] : ["Ctrl", "Shift", "Z"],
    },
  };

  // Define number action mappings only once
  const numberActions = [
    {
      action: Actions.ui.viewAssembly,
      description: ActionDescriptions.viewAssembly,
    },
    {
      action: Actions.ui.formatCode,
      description: ActionDescriptions.formatCode,
    },
    {
      action: Actions.ui.styleCheck,
      description: ActionDescriptions.styleCheck,
    },
    {
      action: Actions.ui.memoryCheck,
      description: ActionDescriptions.memoryCheck,
    },
  ];

  // Platform-specific mappings for number shortcuts
  const mac: { [key: string]: ShortcutDefinition } = {};
  const other: { [key: string]: ShortcutDefinition } = {};

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
  const special = {
    Escape: {
      action: () => Actions.ui.closeOutputPanel(),
      description: ActionDescriptions.closeOutput,
      displayKeys: ["Esc"],
    },
  };

  return { common, mac, other, special };
}

/**
 * Shortcut manager singleton
 */
export const ShortcutManager = (() => {
  // State
  const state: ShortcutState = {
    currentOS: ShortcutUtils.isMac ? "MacOS" : "Other",
    isMac: ShortcutUtils.isMac,
    shortcuts: createShortcuts(),
  };

  const listeners: Array<() => void> = [];

  // Core functionality
  function handleKeyboardEvent(event: KeyboardEvent): void {
    // Handle Escape key with priority
    if (event.key === "Escape" && Actions.ui.closeOutputPanel()) {
      event.preventDefault();
      return;
    }

    // Handle Enter with modifiers
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      Actions.ui.compile();
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
  }

  // UI rendering
  function renderShortcutsList(): void {
    const container = DOM.get(DomElementId.SHORTCUTS_CONTENT);
    if (!container) return;

    const createListItem = ({
      displayKeys,
      description,
    }: ShortcutDefinition): string =>
      `${displayKeys
        .map((key) => `<kbd>${key}</kbd>`)
        .join(" + ")} - ${description}`;

    const ul = document.createElement("ul");
    const { common, special } = state.shortcuts;
    const platformShortcuts = state.isMac
      ? state.shortcuts.mac
      : state.shortcuts.other;

    // Render all shortcut definitions
    [
      ...Object.values(common),
      ...Object.values(platformShortcuts),
      ...Object.values(special),
    ].forEach((shortcut) => {
      const li = document.createElement("li");
      li.innerHTML = createListItem(shortcut);
      ul.appendChild(li);
    });

    container.innerHTML = "";
    container.appendChild(ul);
  }

  // Public API
  function initialize(): () => void {
    renderShortcutsList();

    document.addEventListener("keydown", handleKeyboardEvent);

    return () => {
      document.removeEventListener("keydown", handleKeyboardEvent);
    };
  }

  return {
    initialize,
    getState: () => ({ ...state }),
    subscribe: (listener: () => void) => {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      };
    },
  };
})();

// Auto-initialize
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", ShortcutManager.initialize);
}
