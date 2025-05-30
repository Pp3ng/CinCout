import themeDefinitions from "../../config/themes.json";
import { ThemeMap, Theme, TerminalTheme } from "../types";

// Import CSS for CodeMirror themes
import "codemirror/theme/nord.css";
import "codemirror/theme/dracula.css";
import "codemirror/theme/monokai.css";
import "codemirror/theme/material.css";
import "codemirror/theme/ayu-dark.css";
import "codemirror/theme/gruvbox-dark.css";
import "codemirror/theme/seti.css";
import "codemirror/theme/the-matrix.css";

const THEME_CONFIG = {
  STORAGE_KEY: "cincout-theme",
  DEFAULT_THEME: "default",
  DEFAULT_RGB: "30, 136, 229",
  HEX_REGEX: /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i,
} as const;

export const hexToRgb = (hex: string): string => {
  const match = THEME_CONFIG.HEX_REGEX.exec(hex);

  if (!match) return THEME_CONFIG.DEFAULT_RGB;

  const [, r, g, b] = match;
  return [r, g, b].map((component) => parseInt(component, 16)).join(", ");
};

export const ensureHashPrefixes = (
  colorObject: Record<string, string>
): Record<string, string> => {
  return Object.fromEntries(
    Object.entries(colorObject).map(([key, value]) => {
      const isValidString = typeof value === "string" && value.trim();
      const needsHash = isValidString && !value.startsWith("#");

      return [key, needsHash ? `#${value.trim()}` : value];
    })
  );
};

export interface ThemeChangeEvent {
  readonly themeName: string;
  readonly theme: Theme;
}

export type ThemeListener = (event: ThemeChangeEvent) => void;

// Options for theme manager initialization
export interface ThemeManagerOptions {
  readonly initialTheme?: string;
  readonly themeData?: ThemeMap;
  readonly storage?: Storage;
  readonly storageKey?: string;
}

export class ThemeManager {
  private readonly listeners = new Set<ThemeListener>();
  private readonly storage: Storage;
  private readonly storageKey: string;
  private readonly themeData: ThemeMap;

  private currentThemeName: string;

  constructor(options: ThemeManagerOptions = {}) {
    const {
      storage = localStorage,
      themeData = themeDefinitions as ThemeMap,
      storageKey = THEME_CONFIG.STORAGE_KEY,
      initialTheme,
    } = options;

    this.storage = storage;
    this.themeData = themeData;
    this.storageKey = storageKey;

    this.currentThemeName = this.resolveInitialTheme(initialTheme);
  }

  private readonly resolveInitialTheme = (initialTheme?: string): string => {
    const savedTheme = this.storage.getItem(this.storageKey);
    return initialTheme ?? savedTheme ?? THEME_CONFIG.DEFAULT_THEME;
  };

  readonly getCurrentThemeName = (): string => this.currentThemeName;

  readonly getCurrentTheme = (): Theme =>
    this.themeData[this.currentThemeName] ??
    this.themeData[THEME_CONFIG.DEFAULT_THEME];

  readonly getThemes = (): ThemeMap => this.themeData;

  // Get terminal theme based on current theme
  readonly getTerminalTheme = (): TerminalTheme => {
    const theme = this.getCurrentTheme();
    const terminalColors =
      theme.terminal ?? this.themeData[THEME_CONFIG.DEFAULT_THEME].terminal;

    const baseColors = {
      background: theme.bg,
      foreground: theme.text,
      cursor: theme.accent,
      cursorAccent: theme.bg,
      selection: `${theme.accent}40`, // 40 = 25% opacity in hex
    };

    const standardColors = {
      black: "#000000",
      red: terminalColors.red,
      green: terminalColors.green,
      yellow: terminalColors.yellow,
      blue: terminalColors.blue,
      magenta: terminalColors.magenta,
      cyan: terminalColors.cyan,
      white: "#bfbfbf",
    };

    const brightColors = {
      brightBlack: "#4d4d4d",
      brightRed: terminalColors.red,
      brightGreen: terminalColors.green,
      brightYellow: terminalColors.yellow,
      brightBlue: terminalColors.blue,
      brightMagenta: terminalColors.magenta,
      brightCyan: terminalColors.cyan,
      brightWhite: "#e6e6e6",
    };

    return ensureHashPrefixes({
      ...baseColors,
      ...standardColors,
      ...brightColors,
    }) as TerminalTheme;
  };

  readonly getCssVariables = (): Record<string, string> => {
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
  };

  // Set current theme by name and notify listeners
  readonly setTheme = (themeName: string): boolean => {
    // Early return for no change
    if (this.currentThemeName === themeName) {
      return false;
    }

    this.currentThemeName = themeName;
    this.storage.setItem(this.storageKey, themeName);

    // Notify listeners
    const theme = this.getCurrentTheme();
    this.notifyListeners({ themeName, theme });

    return true;
  };

  // Subscribe method for theme changes
  readonly subscribe = (listener: ThemeListener): (() => void) => {
    this.listeners.add(listener);

    // Return cleanup function to remove listener
    return () => this.listeners.delete(listener);
  };

  private readonly notifyListeners = (event: ThemeChangeEvent): void => {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in theme listener:", error);
      }
    });
  };
}

// Create a default instance for backwards compatibility
const defaultManager = new ThemeManager();

export default defaultManager;
