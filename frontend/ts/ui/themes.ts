// Import CSS for CodeMirror themes
import "codemirror/theme/nord.css";
import "codemirror/theme/dracula.css";
import "codemirror/theme/monokai.css";
import "codemirror/theme/material.css";
import "codemirror/theme/ayu-dark.css";
import "codemirror/theme/gruvbox-dark.css";
import "codemirror/theme/seti.css";
import "codemirror/theme/the-matrix.css";

import themeDefinitions from "../../config/themes.json";
import { ThemeMap, Theme, TerminalTheme } from "../types";
import { getEditorService } from "../service/editor";
import { getTerminalService } from "../service/terminal";

// Helper functions
const hexToRgb = (hex: string): string => {
  const rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return rgb
    ? `${parseInt(rgb[1], 16)}, ${parseInt(rgb[2], 16)}, ${parseInt(
        rgb[3],
        16
      )}`
    : "30, 136, 229";
};

const ensureHashPrefixes = (
  colorObject: Record<string, string>
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(colorObject).map(([key, value]) => [
      key,
      typeof value === "string" && value.trim() !== "" && !value.startsWith("#")
        ? "#" + value.trim()
        : value,
    ])
  );

// Create a more React-friendly theme store
type ThemeListener = (themeName: string, theme: Theme) => void;

class ThemeStore {
  private currentTheme = localStorage.getItem("preferred-theme") || "default";
  private themeData: ThemeMap = themeDefinitions as ThemeMap;
  private listeners: ThemeListener[] = [];

  // Get current theme name
  getCurrentThemeName(): string {
    return this.currentTheme;
  }

  // Get current theme data
  getCurrentTheme(): Theme {
    return this.themeData[this.currentTheme] || this.themeData.default;
  }

  // Get available themes
  getThemes(): ThemeMap {
    return this.themeData;
  }

  // Get terminal theme
  getTerminalTheme(): TerminalTheme {
    const theme = this.getCurrentTheme();
    const terminalColors = theme.terminal || this.themeData.default.terminal;

    return ensureHashPrefixes({
      background: theme.bg,
      foreground: theme.text,
      cursor: theme.accent,
      cursorAccent: theme.bg,
      selection: theme.accent + "40",
      black: "#000000",
      red: terminalColors.red,
      green: terminalColors.green,
      yellow: terminalColors.yellow,
      blue: terminalColors.blue,
      magenta: terminalColors.magenta,
      cyan: terminalColors.cyan,
      white: "#bfbfbf",
      brightBlack: "#4d4d4d",
      brightRed: terminalColors.red,
      brightGreen: terminalColors.green,
      brightYellow: terminalColors.yellow,
      brightBlue: terminalColors.blue,
      brightMagenta: terminalColors.magenta,
      brightCyan: terminalColors.cyan,
      brightWhite: "#e6e6e6",
    }) as TerminalTheme;
  }

  // Get CSS variables for current theme
  getCssVariables(): Record<string, string> {
    const theme = this.getCurrentTheme();
    return {
      "--bg-primary": theme.bg,
      "--bg-secondary": theme.bgSecondary,
      "--text-primary": theme.text,
      "--text-secondary": theme.textSecondary,
      "--accent": theme.accent,
      "--accent-hover": theme.accentHover,
      "--border": theme.border,
      "--accent-rgb": hexToRgb(theme.accent),
      "--error-rgb": "255, 85, 85",
    };
  }

  // Set theme and notify subscribers
  setTheme(themeName: string): void {
    if (!this.themeData[themeName]) {
      console.warn(`Theme ${themeName} not found`);
      return;
    }

    this.currentTheme = themeName;
    localStorage.setItem("preferred-theme", themeName);

    // Notify all listeners
    const theme = this.getCurrentTheme();
    this.listeners.forEach((listener) => listener(themeName, theme));
  }

  // Subscribe to theme changes (React-friendly)
  subscribe(listener: ThemeListener): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

// Create singleton instance
const themeStore = new ThemeStore();

// DOM-specific theme application functions (separate from core theme logic)
export const applyThemeToDOM = (): void => {
  const themeName = themeStore.getCurrentThemeName();
  const theme = themeStore.getCurrentTheme();

  document.body.classList.add("theme-transitioning");

  // Apply CSS variables
  requestAnimationFrame(() => {
    Object.entries(themeStore.getCssVariables()).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });

    // Update theme select dropdown if exists
    const themeSelect = document.getElementById(
      "theme-select"
    ) as HTMLSelectElement;
    if (themeSelect) themeSelect.value = themeName;

    // Update CodeMirror editor theme
    const editorService = getEditorService();
    const editor = editorService.getEditor();
    if (editor) {
      editor.setOption(
        "theme",
        themeName === "default" ? "default" : themeName
      );
    }

    const assemblyView = editorService.getAssemblyView();
    if (assemblyView) {
      assemblyView.setOption(
        "theme",
        themeName === "default" ? "default" : themeName
      );
    }

    // Update terminal theme
    const terminal = getTerminalService().getTerminal();
    if (terminal) {
      setTimeout(() => {
        try {
          const terminalTheme = themeStore.getTerminalTheme();
          if (terminal.options) {
            terminal.options.theme = terminalTheme;
            terminal.refresh(0, terminal.rows - 1);
          }
        } catch (error) {
          console.error("Error updating terminal theme:", error);
        }
      }, 50);
    }

    setTimeout(
      () => document.body.classList.remove("theme-transitioning"),
      300
    );
  });
};

// Initialize theme system with DOM elements
export const initializeThemeUI = (): void => {
  const themeSelect = document.getElementById(
    "theme-select"
  ) as HTMLSelectElement;
  if (themeSelect) {
    themeSelect.innerHTML = "";

    Object.entries(themeStore.getThemes()).forEach(([key, theme]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = theme.name;
      themeSelect.appendChild(option);
    });

    themeSelect.value = themeStore.getCurrentThemeName();
    themeSelect.addEventListener("change", (e) =>
      themeStore.setTheme((e.target as HTMLSelectElement).value)
    );
  }

  // Subscribe to theme changes to update DOM
  themeStore.subscribe(() => applyThemeToDOM());

  // Initial theme application
  applyThemeToDOM();

  // Expose terminal theme getter for external code
  (window as any).getTerminalTheme =
    themeStore.getTerminalTheme.bind(themeStore);
};

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", initializeThemeUI);

// Export for use in other modules
export { themeStore };
