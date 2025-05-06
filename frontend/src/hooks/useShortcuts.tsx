import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShortcutDefinition,
  ShortcutCategories,
  ShortcutState,
  ShortcutMap,
} from "../types";
import { useUIState } from "../context/UIStateContext";
import { EditorService } from "../services/EditorService";

/**
 * Platform and key handling utilities
 */
const ShortcutUtils = {
  isMac: /Mac/.test(window.navigator.userAgent),

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
 * React hook for keyboard shortcuts
 */
export function useShortcuts() {
  const [enabled, setEnabled] = useState(true);
  const { state, setState } = useUIState();

  // Shortcut actions - functions triggered by shortcuts
  const getActions = useCallback(() => {
    return {
      ui: {
        compile: () => {
          // We'll emit events that components can listen for
          document.dispatchEvent(new CustomEvent("cincout:shortcut:compile"));
        },

        viewAssembly: () => {
          document.dispatchEvent(
            new CustomEvent("cincout:shortcut:viewAssembly")
          );
        },

        formatCode: () => {
          document.dispatchEvent(
            new CustomEvent("cincout:shortcut:formatCode")
          );
        },

        styleCheck: () => {
          document.dispatchEvent(
            new CustomEvent("cincout:shortcut:styleCheck")
          );
        },

        memoryCheck: () => {
          document.dispatchEvent(new CustomEvent("cincout:shortcut:memCheck"));
        },

        debug: () => {
          document.dispatchEvent(new CustomEvent("cincout:shortcut:debug"));
        },

        takeCodeSnapshot: () => {
          document.dispatchEvent(new CustomEvent("cincout:shortcut:codeSnap"));
        },

        closeOutputPanel: (): boolean => {
          if (state.isOutputVisible) {
            setState({ isOutputVisible: false });
            setTimeout(() => EditorService.refresh(), 10);
            return true;
          }
          return false;
        },
      },

      editor: {
        toggleCodeFolding: (): void => {
          const editor = EditorService.getEditor();
          if (editor) editor.foldCode(editor.getCursor());
        },

        saveCodeToFile: async (): Promise<void> => {
          try {
            const code = EditorService.getValue();

            // Get language from state
            const fileType =
              EditorService.getConfig().language === "cpp" ? "cpp" : "c";

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
            EditorService.setValue(content);
          } catch (error) {
            console.error("Failed to open file:", error);
          }
        },
      },

      view: {
        toggleZenMode: (): void => {
          document.dispatchEvent(new CustomEvent("cincout:shortcut:zenMode"));
        },
      },
    };
  }, [state.isOutputVisible, setState]);

  // Create shortcut configuration based on platform
  const createShortcuts = useCallback(
    (actions: ReturnType<typeof getActions>): ShortcutCategories => {
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
    },
    []
  );

  // Initialize state with platform detection
  const initialState: ShortcutState = useMemo(
    () => ({
      currentOS: ShortcutUtils.isMac ? "MacOS" : "Other",
      isMac: ShortcutUtils.isMac,
      shortcuts: createShortcuts(getActions()),
    }),
    [createShortcuts, getActions]
  );

  const [shortcutState] = useState<ShortcutState>(initialState);

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
      const { common, mac, other, special } = shortcutState.shortcuts;

      // Find matching shortcut from relevant maps
      const shortcut =
        special[normalizedKey] ||
        common[normalizedKey] ||
        (shortcutState.isMac ? mac : other)[normalizedKey];

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    },
    [shortcutState.shortcuts, shortcutState.isMac, enabled, getActions]
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
    const { common, mac, other, special } = shortcutState.shortcuts;

    // Combine all shortcuts into a single array
    const allShortcuts = [
      ...Object.values(common),
      ...Object.values(shortcutState.isMac ? mac : other),
      ...Object.values(special),
    ];

    return allShortcuts;
  }, [shortcutState.shortcuts, shortcutState.isMac]);

  // Enable/disable shortcuts
  const toggleShortcuts = useCallback((enable: boolean) => {
    setEnabled(enable);
  }, []);

  // Return interface
  return {
    shortcuts: getAllShortcuts(),
    isMac: shortcutState.isMac,
    enabled,
    toggleShortcuts,
    utils: ShortcutUtils,
  };
}

export default useShortcuts;
