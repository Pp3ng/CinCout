import themeDefinitions from "../../config/themes.json";
import { ThemeMap, Theme, TerminalTheme } from "../types";

// Helper functions
export const hexToRgb = (hex: string): string => {
  const rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return rgb
    ? `${parseInt(rgb[1], 16)}, ${parseInt(rgb[2], 16)}, ${parseInt(
        rgb[3],
        16
      )}`
    : "30, 136, 229";
};

export const ensureHashPrefixes = (
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

// Types for theme events and listeners
export type ThemeChangeEvent = {
  themeName: string;
  theme: Theme;
};

export type ThemeListener = (event: ThemeChangeEvent) => void;

// Options for theme manager creation
export interface ThemeManagerOptions {
  initialTheme?: string;
  themeData?: ThemeMap;
  storage?: Storage;
}

/**
 * ThemeManager - Core theme management functionality
 * This design is decoupled from DOM manipulation for React integration
 */
export class ThemeManager {
  private currentTheme: string;
  private themeData: ThemeMap;
  private listeners: Set<ThemeListener> = new Set();
  private storage: Storage;
  private STORAGE_KEY = "preferred-theme";

  constructor(options: ThemeManagerOptions = {}) {
    this.storage = options.storage || localStorage;
    this.themeData = options.themeData || (themeDefinitions as ThemeMap);
    
    // Get initial theme from options, storage, or fallback to default
    const savedTheme = this.storage.getItem(this.STORAGE_KEY);
    this.currentTheme = options.initialTheme || savedTheme || "default";
    
    // Validate current theme exists
    if (!this.themeData[this.currentTheme]) {
      console.warn(`Theme '${this.currentTheme}' not found, falling back to default`);
      this.currentTheme = "default";
    }
  }

  /**
   * Get current theme name
   */
  getCurrentThemeName(): string {
    return this.currentTheme;
  }

  /**
   * Get current theme data
   */
  getCurrentTheme(): Theme {
    return this.themeData[this.currentTheme] || this.themeData.default;
  }

  /**
   * Get all available themes
   */
  getThemes(): ThemeMap {
    return this.themeData;
  }

  /**
   * Get terminal theme configuration
   */
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

  /**
   * Get CSS variables for current theme
   */
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

  /**
   * Set theme and notify listeners
   */
  setTheme(themeName: string): boolean {
    if (!this.themeData[themeName]) {
      console.warn(`Theme '${themeName}' not found`);
      return false;
    }

    if (this.currentTheme === themeName) {
      return false; // No change, avoid unnecessary updates
    }

    this.currentTheme = themeName;
    this.storage.setItem(this.STORAGE_KEY, themeName);

    // Notify all listeners
    const theme = this.getCurrentTheme();
    this.notifyListeners({ themeName, theme });
    return true;
  }

  /**
   * Subscribe to theme changes
   * Returns unsubscribe function (React-friendly)
   */
  subscribe(listener: ThemeListener): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Private method to notify all listeners
   */
  private notifyListeners(event: ThemeChangeEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in theme listener:", error);
      }
    });
  }

  /**
   * Destroy the theme manager, clean up resources
   */
  destroy(): void {
    this.listeners.clear();
  }
}

// Create a default instance for backwards compatibility
const defaultManager = new ThemeManager();

export default defaultManager; 