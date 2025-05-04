// Data access services for React components
// This file provides access to the existing vanilla JS modules

import { ShortcutManager } from "../shortcuts";
import { ShortcutDefinition, ThemeMap } from "../types";

// Import useTheme hook components
import { useTheme, ThemeContext } from "../hooks/useTheme";

// Reference to ThemeContext value for non-React code
let themeContextValue: any = null;

// Function to set ThemeContext value
export function setThemeContextValue(value: any) {
  themeContextValue = value;
}

// Helper function for context warnings
const warnContextNotAvailable = (feature: string) =>
  console.warn(`ThemeContext not available, ${feature}`);

// Declare global functions added by templates.ts
declare global {
  interface Window {
    getTerminalTheme: () => any;
  }
}

/**
 * Service to access shortcut data
 */
export const ShortcutService = {
  /**
   * Get all shortcuts for rendering in UI
   */
  getAllShortcuts(): Array<ShortcutDefinition> {
    const state = ShortcutManager.getState();
    const { common, special } = state.shortcuts;
    const platformShortcuts = state.isMac
      ? state.shortcuts.mac
      : state.shortcuts.other;

    // Combine all shortcut definitions
    return [
      ...Object.values(common),
      ...Object.values(platformShortcuts),
      ...Object.values(special),
    ];
  },
};

/**
 * Service to access theme data
 * This service uses the React useTheme hook exclusively
 */
export const ThemeService = {
  /**
   * Set the current theme
   */
  setTheme(themeName: string, fromReact: boolean = false): void {
    if (themeContextValue && themeContextValue.setTheme) {
      themeContextValue.setTheme(themeName, fromReact);
    } else {
      warnContextNotAvailable("theme not set");
    }
  },

  /**
   * Get the current theme name
   */
  getCurrentTheme(): string {
    if (themeContextValue && themeContextValue.theme) {
      return themeContextValue.theme;
    }
    // Fallback to localStorage only if ThemeContext isn't initialized yet
    return localStorage.getItem("preferred-theme") || "default";
  },

  /**
   * Get all available themes data
   */
  getAllThemes(): ThemeMap {
    if (themeContextValue && themeContextValue.themeData) {
      return themeContextValue.themeData;
    }
    warnContextNotAvailable("returning empty theme data");
    return {} as ThemeMap;
  },

  /**
   * Get all available themes
   */
  getThemeOptions(): Array<{ value: string; label: string }> {
    if (themeContextValue && themeContextValue.getThemeOptions) {
      return themeContextValue.getThemeOptions();
    }
    warnContextNotAvailable("returning empty theme options");
    return [];
  },

  /**
   * Get terminal theme data
   */
  getTerminalTheme(): any {
    if (themeContextValue && themeContextValue.getTerminalTheme) {
      return themeContextValue.getTerminalTheme();
    }
    warnContextNotAvailable("returning empty terminal theme");
    return {};
  },
};

// Export useTheme and ThemeContext for use in other components
export { useTheme, ThemeContext };
