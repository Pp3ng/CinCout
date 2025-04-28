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

// Utilities and actions
const getEditor = () => (window as any).editor;
const getElement = (id: DomElementId) => document.getElementById(id);

export const ShortcutUtils = {
  detectOS: (): PlatformType =>
    /Mac/.test(window.navigator.userAgent) ? "MacOS" : "Other",

  triggerButton: (id: DomElementId): void => {
    getElement(id)?.click();
  },

  normalizeKeyCombo: (event: KeyboardEvent): string => {
    const key = event.key.toLowerCase();
    if (key === "enter") return "Enter";
    if (key === "escape") return "Escape";

    const modifiers = [
      event.ctrlKey && "ctrl",
      event.altKey && "alt",
      event.metaKey && "meta",
      event.shiftKey && "shift",
    ].filter(Boolean);

    const prefix = modifiers.length > 0 ? modifiers.join("+") + "+" : "";
    return prefix && (key.length === 1 || /^[0-9]$/.test(key))
      ? prefix + key
      : event.key;
  },
};

// Action functions
export const Actions = {
  saveCodeToFile: async (): Promise<void> => {
    const editor = getEditor();
    if (!editor) return;

    try {
      const code = editor.getValue();
      const fileType =
        (getElement(DomElementId.LANGUAGE) as HTMLSelectElement)?.value ===
        "cpp"
          ? "cpp"
          : "c";

      const url = URL.createObjectURL(new Blob([code], { type: "text/plain" }));
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

      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          typeof reader.result === "string"
            ? resolve(reader.result)
            : reject(new Error("Failed to read file as text"));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });

      getEditor()?.setValue(content);
    } catch (error) {
      console.error("Failed to open file:", error);
    }
  },

  toggleCodeFolding: (): void => {
    const editor = getEditor();
    if (editor) editor.foldCode(editor.getCursor());
  },

  closeOutputPanel: (): void => {
    const outputPanel = getElement(DomElementId.OUTPUT_PANEL);
    if (outputPanel && outputPanel.style.display !== "none") {
      ShortcutUtils.triggerButton(DomElementId.CLOSE_OUTPUT);
      Promise.resolve().then(() => getEditor()?.focus());
    }
  },
};

// Shortcut configuration factory
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

// Special key handlers
export function getSpecialKeyHandlers(): Record<string, KeyHandler> {
  return {
    Escape: (e) => {
      const outputPanel = getElement(DomElementId.OUTPUT_PANEL);
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

// Store implementation
export function createShortcutStore() {
  const currentOS = ShortcutUtils.detectOS();
  const isMac = currentOS === "MacOS";
  const state: ShortcutState = {
    currentOS,
    isMac,
    shortcuts: createShortcutConfig(isMac),
  };

  const listeners: Array<() => void> = [];

  return {
    getState: () => ({ ...state }),

    subscribe: (listener: () => void) => {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      };
    },

    handleKeyboardEvent: (event: KeyboardEvent): void => {
      // Check special keys first
      const specialHandlers = getSpecialKeyHandlers();
      if (specialHandlers[event.key]?.(event)) return;

      // Check other shortcuts
      const normalizedKey = ShortcutUtils.normalizeKeyCombo(event);
      const { common, mac, other } = state.shortcuts;
      const shortcut =
        common[normalizedKey] || (state.isMac ? mac : other)[normalizedKey];

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    },
  };
}

// UI Renderer
export function renderShortcutsList(state: ShortcutState): void {
  const container = getElement(DomElementId.SHORTCUTS_CONTENT);
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

// Initialize app
const store = createShortcutStore();

export function initializeShortcuts(): () => void {
  renderShortcutsList(store.getState());

  const keydownHandler = store.handleKeyboardEvent;
  document.addEventListener("keydown", keydownHandler);

  const escapeHandler = (event: KeyboardEvent) => {
    if (event.key === "Escape" && getSpecialKeyHandlers().Escape(event)) return;
  };
  document.addEventListener("keydown", escapeHandler, true);

  return () => {
    document.removeEventListener("keydown", keydownHandler);
    document.removeEventListener("keydown", escapeHandler, true);
  };
}

// Hook interface
export function useShortcuts() {
  return {
    getState: store.getState,
    subscribe: store.subscribe,
  };
}

// Auto-initialize
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", initializeShortcuts);
}
