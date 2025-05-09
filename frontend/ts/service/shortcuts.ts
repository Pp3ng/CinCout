// Import types from centralized types file
import { DomElementId, ShortcutDefinition, ShortcutCategories } from "../types";
import { getEditorService } from "./editor";

// Platform detection
export const isMac = /Mac/.test(navigator.userAgent);

// Key normalization utility
export const normalizeKey = (event: KeyboardEvent): string => {
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
};

// Core UI actions - easily adaptable to React components
export const uiActions = {
  compile: () => document.getElementById(DomElementId.COMPILE)?.click(),
  viewAssembly: () =>
    document.getElementById(DomElementId.VIEW_ASSEMBLY)?.click(),
  formatCode: () => document.getElementById(DomElementId.FORMAT)?.click(),
  styleCheck: () => document.getElementById(DomElementId.STYLE_CHECK)?.click(),
  memoryCheck: () =>
    document.getElementById(DomElementId.MEMORY_CHECK)?.click(),
  debug: () => document.getElementById(DomElementId.DEBUG)?.click(),
  takeCodeSnapshot: () =>
    document.getElementById(DomElementId.CODESNAP)?.click(),
  closeOutputPanel: (): boolean => {
    const outputPanel = document.getElementById(DomElementId.OUTPUT_PANEL);
    if (outputPanel && outputPanel.style.display !== "none") {
      document.getElementById(DomElementId.CLOSE_OUTPUT)?.click();
      Promise.resolve().then(() => {
        const editorService = getEditorService();
        editorService.getEditor()?.focus();
      });
      return true;
    }
    return false;
  },
};

// Editor-specific actions
export const editorActions = {
  toggleCodeFolding: (): void => {
    const editorService = getEditorService();
    const editor = editorService.getEditor();
    if (editor) {
      const cursor = editorService.getCursor();
      if (cursor) {
        editor.foldCode(cursor);
      }
    }
  },

  saveCodeToFile: async (): Promise<void> => {
    const editorService = getEditorService();
    const editor = editorService.getEditor();
    if (!editor) return;

    try {
      const code = editorService.getValue();
      const languageElement = document.getElementById(
        DomElementId.LANGUAGE
      ) as HTMLSelectElement;
      const fileType = languageElement?.value === "cpp" ? "cpp" : "c";
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
      const editorService = getEditorService();
      editorService.setValue(content);
    } catch (error) {
      console.error("Failed to open file:", error);
    }
  },
};

// View actions
export const viewActions = {
  toggleZenMode: (): void =>
    document.getElementById(DomElementId.ZEN_MODE)?.click(),
};

// Action descriptions - for UI rendering
export const actionDescriptions = {
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

// Create shortcut configuration based on platform
export const createShortcuts = (): ShortcutCategories => {
  const cmdKey = isMac ? "meta" : "ctrl";

  // Common shortcuts that use cmd/ctrl key combinations
  const common = {
    [`${cmdKey}+Enter`]: {
      action: uiActions.compile,
      description: actionDescriptions.compile,
      displayKeys: isMac ? ["⌘", "return"] : ["Ctrl", "Enter"],
    },
    [`${cmdKey}+s`]: {
      action: editorActions.saveCodeToFile,
      description: actionDescriptions.saveCode,
      displayKeys: isMac ? ["⌘", "S"] : ["Ctrl", "S"],
    },
    [`${cmdKey}+o`]: {
      action: editorActions.openCodeFromFile,
      description: actionDescriptions.openCode,
      displayKeys: isMac ? ["⌘", "O"] : ["Ctrl", "O"],
    },
    [`${cmdKey}+k`]: {
      action: editorActions.toggleCodeFolding,
      description: actionDescriptions.toggleFolding,
      displayKeys: isMac ? ["⌘", "K"] : ["Ctrl", "K"],
    },
    [`${cmdKey}+p`]: {
      action: uiActions.takeCodeSnapshot,
      description: actionDescriptions.takeSnapshot,
      displayKeys: isMac ? ["⌘", "P"] : ["Ctrl", "P"],
    },
    [`${cmdKey}+shift+z`]: {
      action: viewActions.toggleZenMode,
      description: actionDescriptions.zenMode,
      displayKeys: isMac ? ["⌘", "⇧", "Z"] : ["Ctrl", "Shift", "Z"],
    },
  };

  // Define number action mappings only once
  const numberActions = [
    {
      action: uiActions.viewAssembly,
      description: actionDescriptions.viewAssembly,
    },
    {
      action: uiActions.formatCode,
      description: actionDescriptions.formatCode,
    },
    {
      action: uiActions.styleCheck,
      description: actionDescriptions.styleCheck,
    },
    {
      action: uiActions.memoryCheck,
      description: actionDescriptions.memoryCheck,
    },
    {
      action: uiActions.debug,
      description: actionDescriptions.debug,
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
      action: () => uiActions.closeOutputPanel(),
      description: actionDescriptions.closeOutput,
      displayKeys: ["Esc"],
    },
  };

  return { common, mac, other, special };
};

// Handler for keyboard shortcuts
export const handleKeyboardEvent = (
  event: KeyboardEvent,
  shortcuts: ShortcutCategories
): void => {
  // Handle Escape key with priority
  if (event.key === "Escape" && uiActions.closeOutputPanel()) {
    event.preventDefault();
    return;
  }

  // Handle Enter with modifiers
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    uiActions.compile();
    return;
  }

  // Handle other shortcuts
  const normalizedKey = normalizeKey(event);
  const { common, mac, other, special } = shortcuts;

  // Find matching shortcut from relevant maps
  const shortcut =
    special[normalizedKey] ||
    common[normalizedKey] ||
    (isMac ? mac : other)[normalizedKey];

  if (shortcut) {
    event.preventDefault();
    shortcut.action();
  }
};

// Create array of shortcut items for UI rendering
export const createShortcutItems = (
  shortcuts: ShortcutCategories
): ShortcutDefinition[] => {
  const { common, special } = shortcuts;
  const platformShortcuts = isMac ? shortcuts.mac : shortcuts.other;

  return [
    ...Object.values(common),
    ...Object.values(platformShortcuts),
    ...Object.values(special),
  ] as ShortcutDefinition[];
};

// Initialize shortcut listener - returns cleanup function
export const initializeShortcuts = (): (() => void) => {
  const shortcuts = createShortcuts();
  const handler = (event: KeyboardEvent) =>
    handleKeyboardEvent(event, shortcuts);

  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
};

// Render shortcuts list to DOM - could be adapted to React component
export const renderShortcutsList = (containerId: string): void => {
  const container = document.getElementById(containerId);
  if (!container) return;

  const shortcuts = createShortcuts();
  const shortcutItems = createShortcutItems(shortcuts);

  const createListItem = ({
    displayKeys,
    description,
  }: ShortcutDefinition): string =>
    `${displayKeys
      .map((key) => `<kbd>${key}</kbd>`)
      .join(" + ")} - ${description}`;

  const ul = document.createElement("ul");

  shortcutItems.forEach((shortcut) => {
    const li = document.createElement("li");
    li.innerHTML = createListItem(shortcut);
    ul.appendChild(li);
  });

  container.innerHTML = "";
  container.appendChild(ul);
};
