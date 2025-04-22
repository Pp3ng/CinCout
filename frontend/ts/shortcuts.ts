// Refactored shortcut management system - Prepared for React migration

// Using enum constants for better type safety
enum DomElementId {
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

// Using strict TypeScript types
export type PlatformType = 'MacOS' | 'Other';

// Using advanced TypeScript types to simplify shortcut definitions
export interface ShortcutDefinition {
  action: () => void;
  description: string;
  displayKeys: string[];
}

// Creating Record type for shortcut mappings
export type ShortcutMap = Record<string, ShortcutDefinition>;

// Using discriminated union types to restructure shortcut categories
export interface ShortcutCategories {
  common: ShortcutMap;
  mac: ShortcutMap;
  other: ShortcutMap;
  special: ShortcutMap;
}

// Following single responsibility principle, separating state definition
export interface ShortcutState {
  currentOS: PlatformType;
  isMac: boolean;
  shortcuts: ShortcutCategories;
}

// Defining specialized types for event handling
export type KeyHandler = (e: KeyboardEvent) => boolean;
export type Listener = () => void;

/**
 * Pure function toolkit - These will fit well with React's functional programming model
 */
export const ShortcutHelpers = {
  detectOS(): PlatformType {
    return /Mac/.test(window.navigator.userAgent) ? "MacOS" : "Other";
  },

  triggerButton(id: DomElementId): void {
    const element = document.getElementById(id);
    if (element) element.click();
  },

  saveCodeToFile(): void {
    const editor = (window as any).editor;
    if (!editor) return;
    
    const code = editor.getValue();
    const languageElement = document.getElementById(DomElementId.LANGUAGE) as HTMLSelectElement;
    const fileType = languageElement?.value === "cpp" ? "cpp" : "c";
    
    const blob = new Blob([code], { type: "text/plain" });
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `code.${fileType}`;
    downloadLink.click();
    
    // Clean up URL object to prevent memory leaks
    URL.revokeObjectURL(downloadLink.href);
  },

  openCodeFromFile(): void {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".c,.cpp";

    fileInput.onchange = function(this: HTMLInputElement) {
      const selectedFile = this.files?.[0];
      if (!selectedFile) return;

      const reader = new FileReader();
      reader.onload = function() {
        const editor = (window as any).editor;
        if (editor && typeof reader.result === 'string') {
          editor.setValue(reader.result);
        }
      };
      reader.readAsText(selectedFile);
    };

    fileInput.click();
  },

  toggleCodeFolding(): void {
    const editor = (window as any).editor;
    if (editor) {
      editor.foldCode(editor.getCursor());
    }
  },

  normalizeKeyCombo(event: KeyboardEvent): string {
    // Consider keyboard layout compatibility, especially international keyboards
    const key = event.key.toLowerCase();

    // Standardize special keys
    if (key === "enter") return "Enter";
    if (key === "escape") return "Escape";

    // Build key combination prefix
    const modifiers = [];
    if (event.ctrlKey) modifiers.push("ctrl");
    if (event.altKey) modifiers.push("alt");
    if (event.metaKey) modifiers.push("meta");
    if (event.shiftKey) modifiers.push("shift");
    
    const prefix = modifiers.length > 0 ? modifiers.join("+") + "+" : "";

    // Handle letter and number keys
    if (prefix && key.length === 1) return prefix + key;
    if (prefix && /^[0-9]$/.test(key)) return prefix + key;

    // Return unmodified keys as is
    return event.key;
  },

  closeOutputPanel(): void {
    const outputPanel = document.getElementById(DomElementId.OUTPUT_PANEL);
    if (outputPanel && outputPanel.style.display !== "none") {
      ShortcutHelpers.triggerButton(DomElementId.CLOSE_OUTPUT);
      
      // Using Promise instead of setTimeout for better readability and React migration
      Promise.resolve().then(() => {
        const editor = (window as any).editor;
        if (editor) editor.focus();
      });
    }
  },
  
  // Rendering helper function for React
  createShortcutListItem(shortcut: ShortcutDefinition): string {
    const keyHtml = shortcut.displayKeys
      .map(key => `<kbd>${key}</kbd>`)
      .join(" + ");
    return `${keyHtml} - ${shortcut.description}`;
  }
};

/**
 * Redux-inspired redesign of shortcut state management
 * This pattern will easily integrate with React's useReducer or Redux
 */
export class ShortcutStore {
  private state: ShortcutState;
  private listeners: Listener[] = [];

  constructor() {
    const currentOS = ShortcutHelpers.detectOS();
    const isMac = currentOS === "MacOS";
    
    this.state = {
      currentOS,
      isMac,
      shortcuts: this.createShortcutDefinitions(isMac ? "meta" : "ctrl", isMac),
    };
  }

  // Create shortcut definitions (pure function approach)
  private createShortcutDefinitions(
    cmdKey: string, 
    isMac: boolean
  ): ShortcutCategories {
    return {
      common: {
        [`${cmdKey}+Enter`]: {
          action: () => ShortcutHelpers.triggerButton(DomElementId.COMPILE),
          description: "Compile and run",
          displayKeys: isMac ? ["⌘", "return"] : ["Ctrl", "Enter"],
        },
        [`${cmdKey}+s`]: {
          action: ShortcutHelpers.saveCodeToFile,
          description: "Save code to file",
          displayKeys: isMac ? ["⌘", "S"] : ["Ctrl", "S"],
        },
        [`${cmdKey}+o`]: {
          action: ShortcutHelpers.openCodeFromFile,
          description: "Open code from file",
          displayKeys: isMac ? ["⌘", "O"] : ["Ctrl", "O"],
        },
        [`${cmdKey}+k`]: {
          action: ShortcutHelpers.toggleCodeFolding,
          description: "Toggle code folding",
          displayKeys: isMac ? ["⌘", "K"] : ["Ctrl", "K"],
        },
        [`${cmdKey}+p`]: {
          action: () => ShortcutHelpers.triggerButton(DomElementId.CODESNAP),
          description: "Take code snapshot",
          displayKeys: isMac ? ["⌘", "P"] : ["Ctrl", "P"],
        },
      },
      
      mac: {
        "ctrl+1": {
          action: () => ShortcutHelpers.triggerButton(DomElementId.VIEW_ASSEMBLY),
          description: "View assembly code",
          displayKeys: ["^", "1"],
        },
        "ctrl+2": {
          action: () => ShortcutHelpers.triggerButton(DomElementId.FORMAT),
          description: "Format code",
          displayKeys: ["^", "2"],
        },
        "ctrl+3": {
          action: () => ShortcutHelpers.triggerButton(DomElementId.STYLE_CHECK),
          description: "Style check",
          displayKeys: ["^", "3"],
        },
        "ctrl+4": {
          action: () => ShortcutHelpers.triggerButton(DomElementId.MEMORY_CHECK),
          description: "Memory check",
          displayKeys: ["^", "4"],
        },
      },
      
      other: {
        "alt+1": {
          action: () => ShortcutHelpers.triggerButton(DomElementId.VIEW_ASSEMBLY),
          description: "View assembly code",
          displayKeys: ["Alt", "1"],
        },
        "alt+2": {
          action: () => ShortcutHelpers.triggerButton(DomElementId.FORMAT),
          description: "Format code",
          displayKeys: ["Alt", "2"],
        },
        "alt+3": {
          action: () => ShortcutHelpers.triggerButton(DomElementId.STYLE_CHECK),
          description: "Style check",
          displayKeys: ["Alt", "3"],
        },
        "alt+4": {
          action: () => ShortcutHelpers.triggerButton(DomElementId.MEMORY_CHECK),
          description: "Memory check",
          displayKeys: ["Alt", "4"],
        },
      },
      
      special: {
        Escape: {
          action: ShortcutHelpers.closeOutputPanel,
          description: "Close output panel",
          displayKeys: ["Esc"],
        },
      },
    };
  }

  // Get state immutably (similar to Redux)
  getState(): Readonly<ShortcutState> {
    return {...this.state};
  }

  // Subscribe to state changes (ready for integration with React useEffect)
  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Update state immutably (similar to React's useState)
  private setState(partialState: Partial<ShortcutState>): void {
    this.state = {
      ...this.state,
      ...partialState,
    };
    
    // Notify all listeners (similar to React's re-rendering)
    this.listeners.forEach(listener => listener());
  }

  // Get special key handlers
  getSpecialKeyHandlers(): Record<string, KeyHandler> {
    return {
      // Escape key handler (works with terminal focus)
      Escape: (e) => {
        const outputPanel = document.getElementById(DomElementId.OUTPUT_PANEL);
        if (outputPanel && outputPanel.style.display !== "none") {
          e.preventDefault();
          ShortcutHelpers.closeOutputPanel();
          return true;
        }
        return false;
      },

      // Compile shortcut (Ctrl+Enter or Cmd+Enter)
      Enter: (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          ShortcutHelpers.triggerButton(DomElementId.COMPILE);
          return true;
        }
        return false;
      },
    };
  }

  // Handle keyboard events - will become event handlers for React components
  handleKeyboardEvent = (event: KeyboardEvent): void => {
    // First check special keys (Enter with modifiers, Escape)
    const specialHandlers = this.getSpecialKeyHandlers();
    const specialHandler = specialHandlers[event.key];
    if (specialHandler && specialHandler(event)) {
      return; // Handled by special handler
    }

    // Normalize key combination
    const normalizedKey = ShortcutHelpers.normalizeKeyCombo(event);

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

  // Generate shortcuts list UI (will become a React component)
  generateShortcutsList(): void {
    const shortcutsContainer = document.getElementById(DomElementId.SHORTCUTS_CONTENT);
    if (!shortcutsContainer) return;

    // Clear existing content
    shortcutsContainer.innerHTML = "";

    // Create list
    const ul = document.createElement("ul");
    
    // Add common shortcuts
    Object.values(this.state.shortcuts.common).forEach(shortcut => {
      const li = document.createElement("li");
      li.innerHTML = ShortcutHelpers.createShortcutListItem(shortcut);
      ul.appendChild(li);
    });

    // Add platform-specific shortcuts
    const platformShortcuts = this.state.isMac
      ? this.state.shortcuts.mac
      : this.state.shortcuts.other;

    Object.values(platformShortcuts).forEach(shortcut => {
      const li = document.createElement("li");
      li.innerHTML = ShortcutHelpers.createShortcutListItem(shortcut);
      ul.appendChild(li);
    });

    // Add special keys
    Object.values(this.state.shortcuts.special).forEach(shortcut => {
      const li = document.createElement("li");
      li.innerHTML = ShortcutHelpers.createShortcutListItem(shortcut);
      ul.appendChild(li);
    });

    shortcutsContainer.appendChild(ul);
  }

  // Initialize shortcuts system
  initialize(): void {
    // Register main shortcut handler (bubbling phase)
    document.addEventListener("keydown", this.handleKeyboardEvent);

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
      true // true enables capture phase
    );

    // Generate shortcuts list immediately
    this.generateShortcutsList();
  }
  
  // Cleanup method - for use with React useEffect's return function
  cleanup(): void {
    document.removeEventListener("keydown", this.handleKeyboardEvent);
    document.removeEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.getSpecialKeyHandlers().Escape(event);
      }
    }, true);
  }
}

// Create singleton shortcut store instance (similar to React Context)
export const shortcutStoreInstance = new ShortcutStore();

// Initialize shortcuts system on DOM ready
if (typeof document !== 'undefined') { // SSR compatible
  document.addEventListener("DOMContentLoaded", () => {
    shortcutStoreInstance.initialize();
  });
}

// React migration prep - Creating hook-style interfaces
export const useShortcuts = () => {
  // This will transform into a real custom Hook during React migration
  return {
    state: shortcutStoreInstance.getState(),
    subscribe: shortcutStoreInstance.subscribe.bind(shortcutStoreInstance),
    handleKeyboardEvent: shortcutStoreInstance.handleKeyboardEvent,
  };
};