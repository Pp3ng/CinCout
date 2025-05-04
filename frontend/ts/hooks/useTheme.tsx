import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import themeDefinitions from "../../config/themes.json";
import { ThemeMap, Theme, TerminalTheme } from "../types";

// Import CodeMirror theme CSS (same as original themes.ts)
import "codemirror/theme/nord.css";
import "codemirror/theme/dracula.css";
import "codemirror/theme/monokai.css";
import "codemirror/theme/material.css";
import "codemirror/theme/ayu-dark.css";
import "codemirror/theme/gruvbox-dark.css";
import "codemirror/theme/seti.css";
import "codemirror/theme/the-matrix.css";

// Define ThemeContext data structure
interface ThemeContextType {
  theme: string;
  themeData: ThemeMap;
  currentThemeData: Theme;
  setTheme: (themeName: string) => void;
  getAllThemes: () => ThemeMap;
  getThemeOptions: () => Array<{ value: string; label: string }>;
  getTerminalTheme: () => TerminalTheme;
}

// Create default values
const defaultThemeContext: ThemeContextType = {
  theme: "default",
  themeData: themeDefinitions as ThemeMap,
  currentThemeData: (themeDefinitions as ThemeMap).default,
  setTheme: () => {},
  getAllThemes: () => themeDefinitions as ThemeMap,
  getThemeOptions: () => [],
  getTerminalTheme: () => ({} as TerminalTheme),
};

// Create ThemeContext
export const ThemeContext =
  createContext<ThemeContextType>(defaultThemeContext);

// ThemeProvider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<string>(
    localStorage.getItem("preferred-theme") || "default"
  );
  const themeData = themeDefinitions as ThemeMap;

  // Utility function: Convert hex color to RGB
  const hexToRgb = useCallback((hex: string): string => {
    const rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return rgb
      ? `${parseInt(rgb[1], 16)}, ${parseInt(rgb[2], 16)}, ${parseInt(
          rgb[3],
          16
        )}`
      : "30, 136, 229";
  }, []);

  // Utility function: Ensure colors have # prefix
  const ensureHashPrefixes = useCallback(
    (colorObject: Record<string, string>): Record<string, string> => {
      return Object.fromEntries(
        Object.entries(colorObject).map(([key, value]) => {
          if (
            typeof value === "string" &&
            value.trim() !== "" &&
            !value.startsWith("#")
          ) {
            return [key, "#" + value.trim()];
          }
          return [key, value];
        })
      );
    },
    []
  );

  // Get current theme data
  const getCurrentThemeData = useCallback((): Theme => {
    return themeData[theme] || themeData.default;
  }, [theme, themeData]);

  // Get terminal theme
  const getTerminalTheme = useCallback((): TerminalTheme => {
    const themeObj = getCurrentThemeData();
    const terminalColors = themeObj.terminal || themeData.default.terminal;

    const terminalTheme = {
      background: themeObj.bg,
      foreground: themeObj.text,
      cursor: themeObj.accent,
      cursorAccent: themeObj.bg,
      selection: themeObj.accent + "40",

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
    };

    const processedTheme = ensureHashPrefixes(terminalTheme);
    return processedTheme as TerminalTheme;
  }, [getCurrentThemeData, ensureHashPrefixes, themeData]);

  // Update editor and terminal themes
  const updateEditorAndTerminal = useCallback(
    (themeName: string): void => {
      // Update CodeMirror editor theme
      if ((window as any).editor) {
        (window as any).editor.setOption(
          "theme",
          themeName === "default" ? "default" : themeName
        );
      }

      if ((window as any).assemblyView) {
        (window as any).assemblyView.setOption(
          "theme",
          themeName === "default" ? "default" : themeName
        );
      }

      // Update terminal theme
      if ((window as any).terminal) {
        setTimeout(() => {
          try {
            const terminalTheme = getTerminalTheme();
            if ((window as any).terminal.options) {
              (window as any).terminal.options.theme = terminalTheme;
              (window as any).terminal.refresh(
                0,
                (window as any).terminal.rows - 1
              );
            }
          } catch (error) {
            console.error("Error updating terminal theme:", error);
          }
        }, 50);
      }
    },
    [getTerminalTheme]
  );

  // Apply theme to DOM
  const applyThemeToDOM = useCallback(
    (themeName: string): void => {
      const themeObj = themeData[themeName];
      if (!themeObj) return;

      // Add transition class
      document.body.classList.add("theme-transitioning");

      // CSS variable mapping
      const cssVarMap = {
        bg: "--bg-primary",
        bgSecondary: "--bg-secondary",
        text: "--text-primary",
        textSecondary: "--text-secondary",
        accent: "--accent",
        accentHover: "--accent-hover",
        border: "--border",
      };

      requestAnimationFrame(() => {
        const root = document.documentElement;

        // Apply theme variables
        Object.entries(cssVarMap).forEach(([themeKey, cssVar]) => {
          if (themeObj[themeKey as keyof Theme]) {
            root.style.setProperty(
              cssVar,
              themeObj[themeKey as keyof Theme] as string
            );
          }
        });

        // Add RGB versions for transparency effects
        root.style.setProperty("--accent-rgb", hexToRgb(themeObj.accent));
        root.style.setProperty("--error-rgb", "255, 85, 85");

        // Update UI components
        const themeSelect = document.getElementById(
          "theme-select"
        ) as HTMLSelectElement;
        if (themeSelect) {
          themeSelect.value = themeName;
        }

        // Update editor and terminal
        updateEditorAndTerminal(themeName);

        // Remove transition class
        setTimeout(() => {
          document.body.classList.remove("theme-transitioning");
        }, 300);

        // Trigger theme change event to notify other components
        const event = new CustomEvent("cincout:theme-updated", {
          detail: { theme: themeName },
        });
        document.dispatchEvent(event);
      });
    },
    [themeData, hexToRgb, updateEditorAndTerminal]
  );

  // Set theme
  const setTheme = useCallback(
    (themeName: string, fromEvent: boolean = false): void => {
      if (!themeData[themeName]) {
        console.warn(`Theme ${themeName} not found`);
        return;
      }

      setThemeState(themeName);
      localStorage.setItem("preferred-theme", themeName);
      applyThemeToDOM(themeName);
    },
    [themeData, applyThemeToDOM]
  );

  // Get all themes
  const getAllThemes = useCallback((): ThemeMap => {
    return themeData;
  }, [themeData]);

  // Convert themes to select options format
  const getThemeOptions = useCallback((): Array<{
    value: string;
    label: string;
  }> => {
    return Object.entries(themeData).map(([key, theme]) => ({
      value: key,
      label: theme.name,
    }));
  }, [themeData]);

  // Initialize and cleanup
  useEffect(() => {
    // Ensure current theme is applied
    const savedTheme = localStorage.getItem("preferred-theme") || "default";
    setTheme(savedTheme);

    // Ensure global access to terminal theme function
    (window as any).getTerminalTheme = getTerminalTheme;

    return () => {
      // Cleanup
      if ((window as any).getTerminalTheme === getTerminalTheme) {
        (window as any).getTerminalTheme = undefined;
      }
    };
  }, []);

  // Provide context value
  const contextValue = {
    theme,
    themeData,
    currentThemeData: getCurrentThemeData(),
    setTheme,
    getAllThemes,
    getThemeOptions,
    getTerminalTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Export default function
export default useTheme;
