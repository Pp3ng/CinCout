// Import types from centralized types file
import { DomElementId, ShortcutDefinition, ShortcutCategories } from "../types";
import { getEditorService } from "./editor";

// Platform detection
export const isMac = /Mac/.test(navigator.userAgent);

// Key normalization
export const normalizeKey = (event: KeyboardEvent): string => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const modifiers = [
    event.ctrlKey && "ctrl",
    event.altKey && "alt",
    event.metaKey && "meta",
    event.shiftKey && "shift",
  ].filter(Boolean);
  return modifiers.length ? modifiers.join("+") + "+" + key : key;
};

const clickElement = (id: string) => document.getElementById(id)?.click();

const uiActions = {
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

const editorActions = {
  toggleCodeFolding: () => {
    const editor = getEditorService().getEditor();
    editor?.foldCode(editor.getCursor());
  },

  saveCodeToFile: async () => {
    const editor = getEditorService().getEditor();
    if (!editor) return;
    try {
      const code = getEditorService().getValue();
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
    } catch (e) {
      console.error("Failed to save file:", e);
    }
  },
  openCodeFromFile: async () => {
    try {
      // Create file input element and trigger click
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
      // Load file content
      getEditorService().setValue(await file.text());
    } catch (e) {
      console.error("Failed to open file:", e);
    }
  },
};

const viewActions = {
  toggleZenMode: () => clickElement(DomElementId.ZEN_MODE),
};

// Create shortcut configuration
const createShortcuts = (): ShortcutCategories => {
  const cmd = isMac ? "meta" : "ctrl";
  const common = {
    [`${cmd}+Enter`]: {
      action: uiActions.compile,
      description: "Compile and run",
      displayKeys: isMac ? ["⌘", "return"] : ["Ctrl", "Enter"],
    },
    [`${cmd}+s`]: {
      action: editorActions.saveCodeToFile,
      description: "Save code to file",
      displayKeys: isMac ? ["⌘", "S"] : ["Ctrl", "S"],
    },
    [`${cmd}+o`]: {
      action: editorActions.openCodeFromFile,
      description: "Open code from file",
      displayKeys: isMac ? ["⌘", "O"] : ["Ctrl", "O"],
    },
    [`${cmd}+k`]: {
      action: editorActions.toggleCodeFolding,
      description: "Toggle code folding",
      displayKeys: isMac ? ["⌘", "K"] : ["Ctrl", "K"],
    },
    [`${cmd}+p`]: {
      action: uiActions.takeCodeSnapshot,
      description: "Take code snapshot",
      displayKeys: isMac ? ["⌘", "P"] : ["Ctrl", "P"],
    },
    [`${cmd}+shift+z`]: {
      action: viewActions.toggleZenMode,
      description: "Zen Mode",
      displayKeys: isMac ? ["⌘", "⇧", "Z"] : ["Ctrl", "Shift", "Z"],
    },
  };
  const numberPairs: { action: () => void; description: string }[] = [
    { action: uiActions.viewAssembly, description: "View assembly code" },
    { action: uiActions.formatCode, description: "Format code" },
    { action: uiActions.lintCode, description: "Lint code" },
    { action: uiActions.memoryCheck, description: "Memory check" },
    { action: uiActions.debug, description: "Debug with GDB" },
    { action: uiActions.syscallTrace, description: "Trace system calls" },
  ];
  const mac: Record<string, ShortcutDefinition> = {},
    other: Record<string, ShortcutDefinition> = {};

  // Map number pairs to shortcuts
  numberPairs.forEach(({ action, description }, index) => {
    const n = index + 1;
    mac[`ctrl+${n}`] = { action, description, displayKeys: ["^", `${n}`] };
    other[`alt+${n}`] = { action, description, displayKeys: ["Alt", `${n}`] };
  });
  const special = {
    Escape: {
      action: () => uiActions.closeOutputPanel(),
      description: "Close output panel",
      displayKeys: ["Esc"],
    },
  };
  return { common, mac, other, special };
};

const handleKeyboardEvent = (
  event: KeyboardEvent,
  shortcuts: ShortcutCategories
): void => {
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

// Array of all shortcut for rendering
const createShortcutItems = (
  shortcuts: ShortcutCategories
): ShortcutDefinition[] =>
  Object.values({
    ...shortcuts.common,
    ...(isMac ? shortcuts.mac : shortcuts.other),
    ...shortcuts.special,
  });

export const initializeShortcuts = (): (() => void) => {
  const shortcuts = createShortcuts();
  const handler = (event: KeyboardEvent) =>
    handleKeyboardEvent(event, shortcuts);
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
};

// Render shortcuts list UI
export const renderShortcutsList = (): void => {
  const container = document.getElementById("shortcuts-content");
  if (!container) return;
  const shortcuts = createShortcuts();
  const shortcutItems = createShortcutItems(shortcuts);
  // Create styled key elements
  const createKey = (k: string) => `
    <kbd class="inline-block bg-[var(--bg-primary)] text-[var(--accent)] 
      font-[600] text-[0.85em] leading-[1.2] font-mono py-[2px] px-[4px] 
      m-[0_2px] rounded-[var(--radius-sm)] border border-[var(--accent)] 
      shadow-[var(--shadow-sm)] whitespace-nowrap translate-y-0 
      transition-[transform,box-shadow] duration-[var(--transition-fast)] 
      hover:translate-y-[-1px] hover:shadow-[var(--shadow-md)]">${k}</kbd>
  `;
  // Create entire list
  container.innerHTML = `<ul class="list-none p-0 m-0">${shortcutItems
    .map(
      ({ displayKeys, description }) => `
    <li class="mb-[3px] py-[3px] px-0">
      ${displayKeys.map(createKey).join(" + ")} - ${description}
    </li>`
    )
    .join("")}</ul>`;
};
