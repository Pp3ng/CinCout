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

  // Build modifier string with array methods
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

// Helper to reduce DOM access repetition
const clickElement = (id: string): void => document.getElementById(id)?.click();

// Core UI actions - easily adaptable to React components
export const uiActions = {
  compile: () => clickElement(DomElementId.COMPILE),
  viewAssembly: () => clickElement(DomElementId.VIEW_ASSEMBLY),
  formatCode: () => clickElement(DomElementId.FORMAT),
  lintCode: () => clickElement(DomElementId.LINT_CODE),
  memoryCheck: () => clickElement(DomElementId.MEMORY_CHECK),
  debug: () => clickElement(DomElementId.DEBUG),
  syscallTrace: () => clickElement(DomElementId.SYSCALL),
  takeCodeSnapshot: () => clickElement(DomElementId.CODESNAP),
  closeOutputPanel: (): boolean => {
    const outputPanel = document.getElementById(DomElementId.OUTPUT_PANEL);
    if (outputPanel?.style.display !== "none") {
      clickElement(DomElementId.CLOSE_OUTPUT);
      Promise.resolve().then(() => getEditorService().getEditor()?.focus());
      return true;
    }
    return false;
  },
};

// Editor-specific actions
export const editorActions = {
  toggleCodeFolding: (): void => {
    const editor = getEditorService().getEditor();
    editor?.foldCode(editor.getCursor());
  },

  saveCodeToFile: async (): Promise<void> => {
    const editorService = getEditorService();
    const editor = editorService.getEditor();
    if (!editor) return;

    try {
      const code = editorService.getValue();
      const fileType =
        (document.getElementById(DomElementId.LANGUAGE) as HTMLSelectElement)
          ?.value === "cpp"
          ? "cpp"
          : "c";
      const blob = new Blob([code], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      // Create and click download link
      Object.assign(document.createElement("a"), {
        href: url,
        download: `code.${fileType}`,
      }).click();

      // Clean up URL object
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error("Failed to save file:", error);
    }
  },

  openCodeFromFile: async (): Promise<void> => {
    try {
      // Create and click file input
      const fileInput = Object.assign(document.createElement("input"), {
        type: "file",
        accept: ".c,.cpp",
      });
      fileInput.click();

      // Wait for file selection
      const file = await new Promise<File | null>((resolve) => {
        fileInput.onchange = (e) =>
          resolve((e.target as HTMLInputElement).files?.[0] ?? null);
        fileInput.oncancel = () => resolve(null);
      });

      if (!file) return;

      // Load file content into editor
      getEditorService().setValue(await file.text());
    } catch (error) {
      console.error("Failed to open file:", error);
    }
  },
};

// View actions
export const viewActions = {
  toggleZenMode: () => clickElement(DomElementId.ZEN_MODE),
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
  lintCode: "Lint code",
  memoryCheck: "Memory check",
  debug: "Debug with GDB",
  syscallTrace: "Trace system calls",
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

  // Define number action mappings with their descriptions
  const numberActionPairs = [
    [uiActions.viewAssembly, actionDescriptions.viewAssembly],
    [uiActions.formatCode, actionDescriptions.formatCode],
    [uiActions.lintCode, actionDescriptions.lintCode],
    [uiActions.memoryCheck, actionDescriptions.memoryCheck],
    [uiActions.debug, actionDescriptions.debug],
    [uiActions.syscallTrace, actionDescriptions.syscallTrace],
  ] as const;

  // Generate platform-specific shortcuts for numbers
  const mac: Record<string, ShortcutDefinition> = {};
  const other: Record<string, ShortcutDefinition> = {};

  // Map number keys to actions based on platform
  numberActionPairs.forEach(([action, description], index) => {
    const num = index + 1;
    mac[`ctrl+${num}`] = { action, description, displayKeys: ["^", `${num}`] };
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
  // Priority handlers for common keys
  if (event.key === "Escape" && uiActions.closeOutputPanel()) {
    event.preventDefault();
    return;
  }

  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    uiActions.compile();
    return;
  }

  // Find and execute matching shortcut
  const normalizedKey = normalizeKey(event);
  const { common, mac, other, special } = shortcuts;

  // Look for shortcut in all collections
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

  // Combine all shortcut collections into one array
  return Object.values({
    ...common,
    ...platformShortcuts,
    ...special,
  });
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
export const renderShortcutsList = (): void => {
  const container = document.getElementById("shortcuts-content");
  if (!container) return;

  const shortcuts = createShortcuts();
  const shortcutItems = createShortcutItems(shortcuts);

  // Create a styled keyboard key element
  const createKeyElement = (key: string) => `
    <kbd class="inline-block bg-[var(--bg-primary)] text-[var(--accent)] 
      font-[600] text-[0.85em] leading-[1.2] font-mono py-[2px] px-[4px] 
      m-[0_2px] rounded-[var(--radius-sm)] border border-[var(--accent)] 
      shadow-[var(--shadow-sm)] whitespace-nowrap transform-gpu translate-y-0 
      transition-[transform,box-shadow] duration-[var(--transition-fast)] 
      hover:translate-y-[-1px] hover:shadow-[var(--shadow-md)]">${key}</kbd>
  `;

  // Create HTML for a shortcut item
  const createListItem = ({ displayKeys, description }: ShortcutDefinition) => `
    <li class="mb-[3px] py-[3px] px-0">
      ${displayKeys.map(createKeyElement).join(" + ")} - ${description}
    </li>
  `;

  // Create the entire list at once
  container.innerHTML = `
    <ul class="list-none p-0 m-0">
      ${shortcutItems.map(createListItem).join("")}
    </ul>
  `;
};
