// Define interfaces for shortcut handling
interface ShortcutDefinition {
  action: () => void;
  description: string;
  displayKeys: string[];
}

interface ShortcutMap {
  [key: string]: ShortcutDefinition;
}

interface ShortcutCategories {
  common: ShortcutMap;
  mac: ShortcutMap;
  other: ShortcutMap;
  special: ShortcutMap;
}

interface ShortcutState {
  currentOS: string;
  isMac: boolean;
  shortcuts: ShortcutCategories;
  listeners: Array<() => void>;
}

interface KeyHandler {
  (e: KeyboardEvent): boolean;
}

// DOM element IDs constants for easier reference
const DOM_IDS = {
  COMPILE: "compile",
  CLOSE_OUTPUT: "closeOutput",
  VIEW_ASSEMBLY: "viewAssembly",
  FORMAT: "format",
  STYLE_CHECK: "styleCheck",
  MEMORY_CHECK: "memcheck",
  OUTPUT_PANEL: "outputPanel",
  LANGUAGE: "language",
  SHORTCUTS_CONTENT: "shortcuts-content",
  CODESNAP: "codeSnap",
};

// Utility functions - exported for use in other modules
export const detectOS = (): string => {
  const userAgent = window.navigator.userAgent;
  return /Mac/.test(userAgent) ? "MacOS" : "Other";
};

export const triggerButton = (id: string): void => {
  const element = document.getElementById(id);
  if (element) element.click();
};

export const saveCodeToFile = (): void => {
  const editor = (window as any).editor;
  const code = editor.getValue();
  const fileType =
    (document.getElementById("language") as HTMLSelectElement).value === "cpp"
      ? "cpp"
      : "c";
  const blob = new Blob([code], { type: "text/plain" });
  const downloadLink = document.createElement("a");

  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = `code.${fileType}`;
  downloadLink.click();
};

export const openCodeFromFile = (): void => {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".c,.cpp";

  fileInput.onchange = function (this: HTMLInputElement) {
    const selectedFile = this.files?.[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = function () {
      if ((window as any).editor) {
        (window as any).editor.setValue(reader.result as string);
      }
    };
    reader.readAsText(selectedFile);
  };

  fileInput.click();
};

export const toggleCodeFolding = (): void => {
  if ((window as any).editor) {
    (window as any).editor.foldCode((window as any).editor.getCursor());
  }
};

export const normalizeKeyCombo = (event: KeyboardEvent): string => {
  const key = event.key.toLowerCase();

  // Handle special keys
  if (key === "enter") return "Enter";
  if (key === "escape") return "Escape";

  // Build key combination prefix
  let prefix = "";
  if (event.ctrlKey) prefix += "ctrl+";
  if (event.altKey) prefix += "alt+";
  if (event.metaKey) prefix += "meta+";
  if (event.shiftKey) prefix += "shift+";

  // Handle letter and number keys
  if (prefix) {
    // Use lowercase for letter keys
    if (key.length === 1) return prefix + key;

    // Single number keys
    if (/^[0-9]$/.test(key)) return prefix + key;
  }

  // For keys without modifiers, return as is
  return event.key;
};

/**
 * ShortcutStore - A React-like state manager for shortcuts
 * Follows patterns similar to Redux/React Context
 */
class ShortcutStore {
  private state: ShortcutState;

  constructor() {
    // Initialize state
    const currentOS = detectOS();
    const isMac = currentOS === "MacOS";
    const cmdKey = isMac ? "meta" : "ctrl";

    // Initialize state with shortcut definitions
    this.state = {
      currentOS,
      isMac,
      listeners: [],
      shortcuts: this.createShortcutDefinitions(cmdKey, isMac),
    };
  }

  // Create shortcuts configuration
  private createShortcutDefinitions(
    cmdKey: string,
    isMac: boolean
  ): ShortcutCategories {
    return {
      // Common shortcuts for all platforms
      common: {
        [`${cmdKey}+Enter`]: {
          action: () => triggerButton(DOM_IDS.COMPILE),
          description: "Compile and run",
          displayKeys: isMac ? ["⌘", "return"] : ["Ctrl", "Enter"],
        },
        [`${cmdKey}+s`]: {
          action: saveCodeToFile,
          description: "Save code to file",
          displayKeys: isMac ? ["⌘", "S"] : ["Ctrl", "S"],
        },
        [`${cmdKey}+o`]: {
          action: openCodeFromFile,
          description: "Open code from file",
          displayKeys: isMac ? ["⌘", "O"] : ["Ctrl", "O"],
        },
        [`${cmdKey}+k`]: {
          action: toggleCodeFolding,
          description: "Toggle code folding",
          displayKeys: isMac ? ["⌘", "K"] : ["Ctrl", "K"],
        },
        [`${cmdKey}+p`]: {
          action: () => triggerButton(DOM_IDS.CODESNAP),
          description: "Take code snapshot",
          displayKeys: isMac ? ["⌘", "P"] : ["Ctrl", "P"],
        },
      },

      // Mac-specific shortcuts
      mac: {
        "ctrl+1": {
          action: () => triggerButton(DOM_IDS.VIEW_ASSEMBLY),
          description: "View assembly code",
          displayKeys: ["^", "1"],
        },
        "ctrl+2": {
          action: () => triggerButton(DOM_IDS.FORMAT),
          description: "Format code",
          displayKeys: ["^", "2"],
        },
        "ctrl+3": {
          action: () => triggerButton(DOM_IDS.STYLE_CHECK),
          description: "Style check",
          displayKeys: ["^", "3"],
        },
        "ctrl+4": {
          action: () => triggerButton(DOM_IDS.MEMORY_CHECK),
          description: "Memory check",
          displayKeys: ["^", "4"],
        },
      },

      // Other platforms (Windows/Linux) shortcuts
      other: {
        "alt+1": {
          action: () => triggerButton(DOM_IDS.VIEW_ASSEMBLY),
          description: "View assembly code",
          displayKeys: ["Alt", "1"],
        },
        "alt+2": {
          action: () => triggerButton(DOM_IDS.FORMAT),
          description: "Format code",
          displayKeys: ["Alt", "2"],
        },
        "alt+3": {
          action: () => triggerButton(DOM_IDS.STYLE_CHECK),
          description: "Style check",
          displayKeys: ["Alt", "3"],
        },
        "alt+4": {
          action: () => triggerButton(DOM_IDS.MEMORY_CHECK),
          description: "Memory check",
          displayKeys: ["Alt", "4"],
        },
      },

      // Special keys
      special: {
        Escape: {
          action: () => this.closeOutputPanel(),
          description: "Close output panel",
          displayKeys: ["Esc"],
        },
      },
    };
  }

  // Get current state (immutable)
  getState(): Readonly<ShortcutState> {
    return { ...this.state };
  }

  // Subscribe to state changes (like React useEffect)
  subscribe(listener: () => void): () => void {
    this.state.listeners.push(listener);

    // Return unsubscribe function (cleanup like in useEffect)
    return () => {
      this.state.listeners = this.state.listeners.filter((l) => l !== listener);
    };
  }

  // Update state immutably (like React useState setter)
  private setState(partialState: Partial<ShortcutState>): void {
    // Create new state object (immutable update)
    this.state = {
      ...this.state,
      ...partialState,
    };

    // Notify all listeners (like React re-renders)
    this.state.listeners.forEach((listener) => listener());
  }

  // Core function to close output panel
  closeOutputPanel(): void {
    const outputPanel = document.getElementById(DOM_IDS.OUTPUT_PANEL);
    if (outputPanel && outputPanel.style.display !== "none") {
      triggerButton(DOM_IDS.CLOSE_OUTPUT);
      // Restore editor focus after closing panel
      setTimeout(() => {
        if ((window as any).editor) (window as any).editor.focus();
      }, 10);
    }
  }

  // Get special key handlers
  getSpecialKeyHandlers(): { [key: string]: KeyHandler } {
    return {
      // Escape key handler (works with terminal focus)
      Escape: (e) => {
        const outputPanel = document.getElementById(DOM_IDS.OUTPUT_PANEL);
        if (outputPanel && outputPanel.style.display !== "none") {
          e.preventDefault();
          this.closeOutputPanel();
          return true; // Handled
        }
        return false; // Not handled
      },

      // Compile shortcut (Ctrl+Enter or Cmd+Enter)
      Enter: (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          triggerButton(DOM_IDS.COMPILE);
          return true; // Handled
        }
        return false; // Not handled
      },
    };
  }

  // Handle keyboard events
  handleKeyboardEvent(event: KeyboardEvent): void {
    // First check special keys (Enter with modifiers, Escape)
    const specialHandlers = this.getSpecialKeyHandlers();
    const specialHandler = specialHandlers[event.key];
    if (specialHandler && specialHandler(event)) {
      return; // Handled by special handler
    }

    // Normalize the key combination
    const normalizedKey = normalizeKeyCombo(event);

    // Get platform-specific shortcut map
    const platformMap = this.state.isMac
      ? this.state.shortcuts.mac
      : this.state.shortcuts.other;

    // Check common shortcut map
    const commonShortcut = this.state.shortcuts.common[normalizedKey];
    if (commonShortcut) {
      event.preventDefault();
      commonShortcut.action();
      return;
    }

    // Check platform-specific shortcut map
    const platformShortcut = platformMap[normalizedKey];
    if (platformShortcut) {
      event.preventDefault();
      platformShortcut.action();
      return;
    }
  }

  // Generate shortcuts list for UI
  generateShortcutsList(): void {
    const shortcutsContainer = document.getElementById(
      DOM_IDS.SHORTCUTS_CONTENT
    );
    if (!shortcutsContainer) return;

    // Clear existing content
    shortcutsContainer.innerHTML = "";

    // Create list
    const ul = document.createElement("ul");

    // Add common shortcuts
    Object.values(this.state.shortcuts.common).forEach((shortcut) => {
      const li = document.createElement("li");
      const keyHtml = shortcut.displayKeys
        .map((key) => `<kbd>${key}</kbd>`)
        .join(" + ");
      li.innerHTML = `${keyHtml} - ${shortcut.description}`;
      ul.appendChild(li);
    });

    // Add platform-specific shortcuts
    const platformShortcuts = this.state.isMac
      ? this.state.shortcuts.mac
      : this.state.shortcuts.other;

    Object.values(platformShortcuts).forEach((shortcut) => {
      const li = document.createElement("li");
      const keyHtml = shortcut.displayKeys
        .map((key) => `<kbd>${key}</kbd>`)
        .join(" + ");
      li.innerHTML = `${keyHtml} - ${shortcut.description}`;
      ul.appendChild(li);
    });

    // Add special keys
    Object.values(this.state.shortcuts.special).forEach((shortcut) => {
      const li = document.createElement("li");
      const keyHtml = shortcut.displayKeys
        .map((key) => `<kbd>${key}</kbd>`)
        .join(" + ");
      li.innerHTML = `${keyHtml} - ${shortcut.description}`;
      ul.appendChild(li);
    });

    shortcutsContainer.appendChild(ul);
  }

  // Initialize shortcuts system
  initialize(): void {
    // Register main shortcut handler (bubbling phase)
    document.addEventListener("keydown", (event) =>
      this.handleKeyboardEvent(event)
    );

    // Register special Escape key handler (capture phase)
    // This ensures Escape works even when terminal has focus
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          const handled = this.getSpecialKeyHandlers().Escape(event);
          if (handled) return;
        }
      },
      true
    ); // true enables capture phase

    // Generate shortcuts list immediately instead of waiting for another DOMContentLoaded event
    this.generateShortcutsList();
  }
}

// Create singleton shortcut store instance (like React Context)
const shortcutStoreInstance = new ShortcutStore();

// Initialize shortcuts system on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  shortcutStoreInstance.initialize();
});

// Export the shortcut store for other modules
export { shortcutStoreInstance };
