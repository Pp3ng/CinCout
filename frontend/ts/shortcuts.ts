// Constants and Types
export enum DomElementId {
  COMPILE = "compile",
  CLOSE_OUTPUT = "closeOutput",
  VIEW_ASSEMBLY = "viewAssembly",
  FORMAT = "format",
  STYLE_CHECK = "styleCheck",
  MEMORY_CHECK = "memcheck",
  OUTPUT_PANEL = "outputPanel",
  LANGUAGE = "language",
  SHORTCUTS_CONTENT = "shortcuts-content",
  CODESNAP = "codeSnap",
}

export type PlatformType = "MacOS" | "Other";

export interface ShortcutDefinition {
  action: () => void;
  description: string;
  displayKeys: string[];
}

export type ShortcutMap = Record<string, ShortcutDefinition>;

export interface ShortcutCategories {
  common: ShortcutMap;
  mac: ShortcutMap;
  other: ShortcutMap;
  special: ShortcutMap;
}

export interface ShortcutState {
  currentOS: PlatformType;
  isMac: boolean;
  shortcuts: ShortcutCategories;
}

export type KeyHandler = (e: KeyboardEvent) => boolean;

// Pure utility functions
export const ShortcutUtils = {
  detectOS(): PlatformType {
    return /Mac/.test(window.navigator.userAgent) ? "MacOS" : "Other";
  },

  triggerButton(id: DomElementId): void {
    const element = document.getElementById(id);
    if (element) element.click();
  },

  normalizeKeyCombo(event: KeyboardEvent): string {
    const key = event.key.toLowerCase();
    if (key === "enter") return "Enter";
    if (key === "escape") return "Escape";

    const modifiers = [];
    if (event.ctrlKey) modifiers.push("ctrl");
    if (event.altKey) modifiers.push("alt");
    if (event.metaKey) modifiers.push("meta");
    if (event.shiftKey) modifiers.push("shift");

    const prefix = modifiers.length > 0 ? modifiers.join("+") + "+" : "";
    if (prefix && (key.length === 1 || /^[0-9]$/.test(key)))
      return prefix + key;
    return event.key;
  },
};

// Action functions (will be used in React components)
export const Actions = {
  async saveCodeToFile(): Promise<void> {
    const editor = (window as any).editor;
    if (!editor) return;

    const code = editor.getValue();
    const languageElement = document.getElementById(
      DomElementId.LANGUAGE
    ) as HTMLSelectElement;
    const fileType = languageElement?.value === "cpp" ? "cpp" : "c";

    try {
      const blob = new Blob([code], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      // Create and trigger the download
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = `code.${fileType}`;
      downloadLink.click();

      // Clean up the URL object after download starts
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error("Failed to save file:", error);
    }
  },

  async openCodeFromFile(): Promise<void> {
    try {
      // Create a file input and trigger click
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".c,.cpp";
      fileInput.click();

      // Wait for file selection using a promise
      const file = await new Promise<File | null>((resolve) => {
        fileInput.onchange = (e: Event) => {
          const input = e.target as HTMLInputElement;
          resolve(input.files?.[0] || null);
        };
        // Handle cancellation
        fileInput.oncancel = () => resolve(null);
      });

      if (!file) return;

      // Read file contents
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("Failed to read file as text"));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });

      // Update editor content
      const editor = (window as any).editor;
      if (editor) {
        editor.setValue(content);
      }
    } catch (error) {
      console.error("Failed to open file:", error);
    }
  },

  toggleCodeFolding(): void {
    const editor = (window as any).editor;
    if (editor) {
      editor.foldCode(editor.getCursor());
    }
  },

  closeOutputPanel(): void {
    const outputPanel = document.getElementById(DomElementId.OUTPUT_PANEL);
    if (outputPanel && outputPanel.style.display !== "none") {
      ShortcutUtils.triggerButton(DomElementId.CLOSE_OUTPUT);

      Promise.resolve().then(() => {
        const editor = (window as any).editor;
        if (editor) editor.focus();
      });
    }
  },
};

// Shortcut configuration factory (pure function)
export function createShortcutConfig(isMac: boolean): ShortcutCategories {
  const cmdKey = isMac ? "meta" : "ctrl";

  return {
    common: {
      [`${cmdKey}+Enter`]: {
        action: () => ShortcutUtils.triggerButton(DomElementId.COMPILE),
        description: "Compile and run",
        displayKeys: isMac ? ["⌘", "return"] : ["Ctrl", "Enter"],
      },
      [`${cmdKey}+s`]: {
        action: Actions.saveCodeToFile,
        description: "Save code to file",
        displayKeys: isMac ? ["⌘", "S"] : ["Ctrl", "S"],
      },
      [`${cmdKey}+o`]: {
        action: Actions.openCodeFromFile,
        description: "Open code from file",
        displayKeys: isMac ? ["⌘", "O"] : ["Ctrl", "O"],
      },
      [`${cmdKey}+k`]: {
        action: Actions.toggleCodeFolding,
        description: "Toggle code folding",
        displayKeys: isMac ? ["⌘", "K"] : ["Ctrl", "K"],
      },
      [`${cmdKey}+p`]: {
        action: () => ShortcutUtils.triggerButton(DomElementId.CODESNAP),
        description: "Take code snapshot",
        displayKeys: isMac ? ["⌘", "P"] : ["Ctrl", "P"],
      },
    },

    mac: {
      "ctrl+1": {
        action: () => ShortcutUtils.triggerButton(DomElementId.VIEW_ASSEMBLY),
        description: "View assembly code",
        displayKeys: ["^", "1"],
      },
      "ctrl+2": {
        action: () => ShortcutUtils.triggerButton(DomElementId.FORMAT),
        description: "Format code",
        displayKeys: ["^", "2"],
      },
      "ctrl+3": {
        action: () => ShortcutUtils.triggerButton(DomElementId.STYLE_CHECK),
        description: "Style check",
        displayKeys: ["^", "3"],
      },
      "ctrl+4": {
        action: () => ShortcutUtils.triggerButton(DomElementId.MEMORY_CHECK),
        description: "Memory check",
        displayKeys: ["^", "4"],
      },
    },

    other: {
      "alt+1": {
        action: () => ShortcutUtils.triggerButton(DomElementId.VIEW_ASSEMBLY),
        description: "View assembly code",
        displayKeys: ["Alt", "1"],
      },
      "alt+2": {
        action: () => ShortcutUtils.triggerButton(DomElementId.FORMAT),
        description: "Format code",
        displayKeys: ["Alt", "2"],
      },
      "alt+3": {
        action: () => ShortcutUtils.triggerButton(DomElementId.STYLE_CHECK),
        description: "Style check",
        displayKeys: ["Alt", "3"],
      },
      "alt+4": {
        action: () => ShortcutUtils.triggerButton(DomElementId.MEMORY_CHECK),
        description: "Memory check",
        displayKeys: ["Alt", "4"],
      },
    },

    special: {
      Escape: {
        action: Actions.closeOutputPanel,
        description: "Close output panel",
        displayKeys: ["Esc"],
      },
    },
  };
}

// Special key handlers (pure function)
export function getSpecialKeyHandlers(): Record<string, KeyHandler> {
  return {
    Escape: (e) => {
      const outputPanel = document.getElementById(DomElementId.OUTPUT_PANEL);
      if (outputPanel && outputPanel.style.display !== "none") {
        e.preventDefault();
        Actions.closeOutputPanel();
        return true;
      }
      return false;
    },

    Enter: (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        ShortcutUtils.triggerButton(DomElementId.COMPILE);
        return true;
      }
      return false;
    },
  };
}

// React-like hooks for state management
export function createShortcutStore() {
  // Initialize state
  const currentOS = ShortcutUtils.detectOS();
  const isMac = currentOS === "MacOS";
  const initialState: ShortcutState = {
    currentOS,
    isMac,
    shortcuts: createShortcutConfig(isMac),
  };

  // State and listeners
  let state = initialState;
  const listeners: Array<() => void> = [];

  // Store API
  return {
    getState: () => ({ ...state }),

    subscribe: (listener: () => void) => {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      };
    },

    // Event handler
    handleKeyboardEvent: (event: KeyboardEvent): void => {
      // Check special keys
      const specialHandlers = getSpecialKeyHandlers();
      const specialHandler = specialHandlers[event.key];
      if (specialHandler && specialHandler(event)) return;

      // Normalize and check other shortcuts
      const normalizedKey = ShortcutUtils.normalizeKeyCombo(event);
      const { common, mac, other } = state.shortcuts;
      const platformMap = state.isMac ? mac : other;

      const shortcut = common[normalizedKey] || platformMap[normalizedKey];
      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    },
  };
}

// UI Renderer - this will become a React component
export function renderShortcutsList(state: ShortcutState): void {
  const shortcutsContainer = document.getElementById(
    DomElementId.SHORTCUTS_CONTENT
  );
  if (!shortcutsContainer) return;

  // Create shortcut list item HTML
  const createShortcutListItem = (shortcut: ShortcutDefinition): string => {
    const keyHtml = shortcut.displayKeys
      .map((key) => `<kbd>${key}</kbd>`)
      .join(" + ");
    return `${keyHtml} - ${shortcut.description}`;
  };

  // Clear and create new list
  shortcutsContainer.innerHTML = "";
  const ul = document.createElement("ul");

  // Add all shortcuts
  const { common, special } = state.shortcuts;
  const platformShortcuts = state.isMac
    ? state.shortcuts.mac
    : state.shortcuts.other;

  [
    ...Object.values(common),
    ...Object.values(platformShortcuts),
    ...Object.values(special),
  ].forEach((shortcut) => {
    const li = document.createElement("li");
    li.innerHTML = createShortcutListItem(shortcut);
    ul.appendChild(li);
  });

  shortcutsContainer.appendChild(ul);
}

// Initialize shortcuts
const store = createShortcutStore();

export function initializeShortcuts(): () => void {
  // Render initial shortcuts list
  renderShortcutsList(store.getState());

  // Set up event listeners
  const keydownHandler = store.handleKeyboardEvent;
  document.addEventListener("keydown", keydownHandler);

  // Special Escape handler for terminal
  const escapeHandler = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      const handled = getSpecialKeyHandlers().Escape(event);
      if (handled) return;
    }
  };
  document.addEventListener("keydown", escapeHandler, true);

  // Return cleanup function
  return () => {
    document.removeEventListener("keydown", keydownHandler);
    document.removeEventListener("keydown", escapeHandler, true);
  };
}

// React-style hook interface
export function useShortcuts() {
  return {
    getState: store.getState,
    subscribe: store.subscribe,
  };
}

// Initialize on DOM ready (only in browser environment)
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    initializeShortcuts();
  });
}
