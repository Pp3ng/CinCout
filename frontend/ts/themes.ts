// Import CodeMirror themes from npm packages
import "codemirror/theme/nord.css";
import "codemirror/theme/dracula.css";
import "codemirror/theme/monokai.css";
import "codemirror/theme/material.css";
import "codemirror/theme/ayu-dark.css";
import "codemirror/theme/gruvbox-dark.css";
import "codemirror/theme/seti.css";
import "codemirror/theme/the-matrix.css";

// Import theme definitions from JSON file
import themeDefinitions from "../config/themes.json";

// Import types from centralized types file
import { ThemeMap, Theme, TerminalTheme } from "./types";

// Theme management
const createThemeStore = () => {
  // State
  let currentTheme = "default";
  const themeData = themeDefinitions as ThemeMap;

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
  ): Record<string, string> => {
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
  };

  // Get current theme data
  const getCurrentTheme = (): Theme => {
    return themeData[currentTheme] || themeData.default;
  };

  const getTerminalTheme = (): TerminalTheme => {
    const theme = getCurrentTheme();

    const terminalColors = theme.terminal || themeData.default.terminal;

    const terminalTheme = {
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
    };

    const processedTheme = ensureHashPrefixes(terminalTheme);
    return processedTheme as TerminalTheme;
  };

  // Update editor and terminal with theme
  const updateEditorAndTerminal = (themeName: string): void => {
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
  };

  // Apply theme to DOM
  const applyThemeToDOM = (themeName: string): void => {
    const theme = themeData[themeName];
    if (!theme) return;

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
        if (theme[themeKey as keyof Theme]) {
          root.style.setProperty(
            cssVar,
            theme[themeKey as keyof Theme] as string
          );
        }
      });

      // Add RGB versions for transparency effects
      root.style.setProperty("--accent-rgb", hexToRgb(theme.accent));
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

      // Remove transition class after animation
      setTimeout(() => {
        document.body.classList.remove("theme-transitioning");
      }, 300);
    });
  };

  // Public API
  return {
    setTheme: (themeName: string): void => {
      if (!themeData[themeName]) {
        console.warn(`Theme ${themeName} not found`);
        return;
      }

      currentTheme = themeName;
      localStorage.setItem("preferred-theme", themeName);
      applyThemeToDOM(themeName);
    },

    getTerminalTheme,

    initialize: (): void => {
      // Setup theme selector
      const themeSelect = document.getElementById(
        "theme-select"
      ) as HTMLSelectElement;
      if (themeSelect) {
        // Clear existing options
        themeSelect.innerHTML = "";

        // Add theme options
        Object.entries(themeData).forEach(([key, theme]) => {
          const option = document.createElement("option");
          option.value = key;
          option.textContent = theme.name;
          themeSelect.appendChild(option);
        });

        // Set initial value and add event listener
        const savedTheme = localStorage.getItem("preferred-theme") || "default";
        themeSelect.value = savedTheme;
        themeSelect.addEventListener("change", (e) => {
          const target = e.target as HTMLSelectElement;
          themeStoreInstance.setTheme(target.value);
        });
      }

      // Apply initial theme from storage
      const savedTheme = localStorage.getItem("preferred-theme") || "default";
      themeStoreInstance.setTheme(savedTheme);

      // Make theme getter available globally for terminal setup
      (window as any).getTerminalTheme = getTerminalTheme;
    },
  };
};

// Create singleton instance
const themeStoreInstance = createThemeStore();

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  themeStoreInstance.initialize();
});

// Export for use in other modules
export { themeStoreInstance };
