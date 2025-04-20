// Import CodeMirror themes from npm packages
import "codemirror/theme/nord.css";
import "codemirror/theme/dracula.css";
import "codemirror/theme/monokai.css";
import "codemirror/theme/material.css";
import "codemirror/theme/ayu-dark.css";
import "codemirror/theme/gruvbox-dark.css";
import "codemirror/theme/seti.css";
import "codemirror/theme/the-matrix.css";

// Define theme interfaces
interface TerminalColors {
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
}

interface Theme {
  name: string;
  bg: string;
  bgSecondary: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentHover: string;
  border: string;
  terminal: TerminalColors;
}

interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selection: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
  [key: string]: string;
}

interface ThemeMap {
  [key: string]: Theme;
}

interface EditorInstance {
  instance: any;
  type: string;
}

// Theme definitions object
const themes: ThemeMap = {
  default: {
    name: "Default",
    bg: "#ffffff",
    bgSecondary: "#f5f7fa",
    text: "#1a2233",
    textSecondary: "#6e7a8a",
    accent: "#1e88e5",
    accentHover: "#1565c0",
    border: "#e0e4e8",
    terminal: {
      red: "#e53935",
      green: "#43a047",
      yellow: "#ffb300",
      blue: "#1e88e5",
      magenta: "#d81b60",
      cyan: "#00acc1",
    },
  },
  nord: {
    name: "Nord",
    bg: "#2e3440",
    bgSecondary: "#3b4252",
    text: "#eceff4",
    textSecondary: "#8fbcbb",
    accent: "#88c0d0",
    accentHover: "#81a1c1",
    border: "#4c566a",
    terminal: {
      red: "#bf616a",
      green: "#a3be8c",
      yellow: "#ebcb8b",
      blue: "#81a1c1",
      magenta: "#b48ead",
      cyan: "#8fbcbb",
    },
  },
  dracula: {
    name: "Dracula",
    bg: "#282a36",
    bgSecondary: "#44475a",
    text: "#f8f8f2",
    textSecondary: "#6272a4",
    accent: "#bd93f9",
    accentHover: "#ff79c6",
    border: "#6272a4",
    terminal: {
      red: "#ff5555",
      green: "#50fa7b",
      yellow: "#f1fa8c",
      blue: "#bd93f9",
      magenta: "#ff79c6",
      cyan: "#8be9fd",
    },
  },
  monokai: {
    name: "Monokai",
    bg: "#272822",
    bgSecondary: "#3e3d32",
    text: "#f8f8f2",
    textSecondary: "#75715e",
    accent: "#a6e22e",
    accentHover: "#fd971f",
    border: "#49483e",
    terminal: {
      red: "#f92672",
      green: "#a6e22e",
      yellow: "#f4bf75",
      blue: "#66d9ef",
      magenta: "#ae81ff",
      cyan: "#a1efe4",
    },
  },
  material: {
    name: "Material",
    bg: "#263238",
    bgSecondary: "#37474f",
    text: "#eeffff",
    textSecondary: "#b0bec5",
    accent: "#89ddff",
    accentHover: "#80cbc4",
    border: "#546e7a",
    terminal: {
      red: "#f07178",
      green: "#c3e88d",
      yellow: "#ffcb6b",
      blue: "#82aaff",
      magenta: "#c792ea",
      cyan: "#89ddff",
    },
  },
  "ayu-dark": {
    name: "Ayu Dark",
    bg: "#0a0e14",
    bgSecondary: "#1f2430",
    text: "#f8f8f2",
    textSecondary: "#7a88a3",
    accent: "#ffb454",
    accentHover: "#ff8f40",
    border: "#11151c",
    terminal: {
      red: "#ff3333",
      green: "#c2d94c",
      yellow: "#ffb454",
      blue: "#59c2ff",
      magenta: "#d2a6ff",
      cyan: "#95e6cb",
    },
  },
  "gruvbox-dark": {
    name: "Gruvbox Dark",
    bg: "#282828",
    bgSecondary: "#3c3836",
    text: "#fbf1c7",
    textSecondary: "#a89984",
    accent: "#b8bb26",
    accentHover: "#98971a",
    border: "#504945",
    terminal: {
      red: "#fb4934",
      green: "#b8bb26",
      yellow: "#fabd2f",
      blue: "#83a598",
      magenta: "#d3869b",
      cyan: "#8ec07c",
    },
  },
  "the-matrix": {
    name: "The Matrix",
    bg: "#060606",
    bgSecondary: "#141414",
    text: "#00FF9C",
    textSecondary: "#257245",
    accent: "#00BB41",
    accentHover: "#39AA14",
    border: "#004000",
    terminal: {
      red: "#FF0000",
      green: "#00BB41",
      yellow: "#FFDD00",
      blue: "#00AAFF",
      magenta: "#FF00FF",
      cyan: "#00FFFF",
    },
  },
  seti: {
    name: "Seti",
    bg: "#151718",
    bgSecondary: "#1d1f20",
    text: "#ffffff",
    textSecondary: "#6d8086",
    accent: "#55b5db",
    accentHover: "#55dbbe",
    border: "#0e1112",
    terminal: {
      red: "#e15a60",
      green: "#9fca56",
      yellow: "#e6cd69",
      blue: "#55b5db",
      magenta: "#a074c4",
      cyan: "#55dbbe",
    },
  },
};

// Theme Manager class - handles all theme-related functionality
class ThemeManager {
  private themeSelect: HTMLSelectElement | null = null;
  private currentTheme: string = "default";
  private cssVarMap: { [key: string]: string } = {
    bg: "--bg-primary",
    bgSecondary: "--bg-secondary",
    text: "--text-primary",
    textSecondary: "--text-secondary",
    accent: "--accent",
    accentHover: "--accent-hover",
    border: "--border",
  };

  // Get computed CSS variable value
  private getCssVar(varName: string, fallback: string = ""): string {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    return value || fallback;
  }

  // Get terminal theme configuration based on current theme
  public getTerminalTheme(): TerminalTheme {
    // Get the current theme data
    const themeData = themes[this.currentTheme] || themes["default"];

    // Default terminal colors - used when theme doesn't define specific colors
    const defaultTermColors: TerminalColors = {
      red: "#ff5555",
      green: "#50fa7b",
      yellow: "#f1fa8c",
      blue: "#bd93f9",
      magenta: "#ff79c6",
      cyan: "#8be9fd",
    };

    // Get theme-defined terminal colors or use defaults
    const terminalColors: TerminalColors = {
      ...defaultTermColors,
      ...(themeData.terminal || {}),
    };

    // Build complete terminal theme
    const theme: TerminalTheme = {
      // CSS variable colors
      background: this.getCssVar("--bg-primary"),
      foreground: this.getCssVar("--text-primary"),
      cursor: this.getCssVar("--accent"),
      cursorAccent: this.getCssVar("--bg-primary"),
      selection: this.getCssVar("--accent") + "40", // Add transparency

      // Base colors
      black: "#000000",
      red: terminalColors.red,
      green: terminalColors.green,
      yellow: terminalColors.yellow,
      blue: terminalColors.blue,
      magenta: terminalColors.magenta,
      cyan: terminalColors.cyan,
      white: "#bfbfbf",

      // Bright variants
      brightBlack: "#4d4d4d",
      brightRed: "#ff6e67",
      brightGreen: "#5af78e",
      brightYellow: "#f4f99d",
      brightBlue: "#caa9fa",
      brightMagenta: "#ff92d0",
      brightCyan: "#9aedfe",
      brightWhite: "#e6e6e6",
    };

    return this.ensureHashPrefixes(theme);
  }

  // Ensure all color values have # prefix
  private ensureHashPrefixes(colorObject: { [key: string]: string }): {
    [key: string]: string;
  } {
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
  }

  // Set CSS variables from theme
  private setCssVariables(theme: Theme): void {
    const root = document.documentElement;

    // Set CSS variables using the mapping
    Object.entries(this.cssVarMap).forEach(([themeKey, cssVar]) => {
      if (theme[themeKey as keyof Theme]) {
        root.style.setProperty(
          cssVar,
          theme[themeKey as keyof Theme] as string
        );
      }
    });

    // Add RGB versions of colors for transparency effects
    const hexToRgb = (hex: string): string => {
      const rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
        theme.accent
      );
      if (rgb) {
        return `${parseInt(rgb[1], 16)}, ${parseInt(rgb[2], 16)}, ${parseInt(
          rgb[3],
          16
        )}`;
      }
      return "30, 136, 229"; // Default blue fallback
    };

    root.style.setProperty("--accent-rgb", hexToRgb(theme.accent));
    root.style.setProperty("--error-rgb", "255, 85, 85"); // Default error color
  }

  // Update terminal and editor themes
  private updateEditorAndTerminal(themeName: string): void {
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
        const terminalTheme = this.getTerminalTheme();
        (window as any).terminal.setOption("theme", terminalTheme);
        (window as any).terminal.refresh(0, (window as any).terminal.rows - 1);
      }, 50);
    }
  }

  // Apply theme to the application
  public applyTheme(themeName: string): void {
    const theme = themes[themeName];
    if (!theme) {
      console.warn(`Theme ${themeName} not found`);
      return;
    }

    this.currentTheme = themeName;

    // Add transition class for smooth theme changes
    document.body.classList.add("theme-transitioning");

    // Apply theme in next animation frame for performance
    requestAnimationFrame(() => {
      // Set CSS variables
      this.setCssVariables(theme);

      // Update editor and terminal
      this.updateEditorAndTerminal(themeName);

      // Update theme selector dropdown
      if (this.themeSelect) {
        this.themeSelect.value = themeName;
      }

      // Save preference to local storage
      localStorage.setItem("preferred-theme", themeName);

      // Remove transition class after animation completes
      setTimeout(() => {
        document.body.classList.remove("theme-transitioning");
      }, 300);
    });
  }

  // initialize theme selector dropdown
  private initializeThemeSelector(): void {
    this.themeSelect = document.getElementById(
      "theme-select"
    ) as HTMLSelectElement;
    if (!this.themeSelect) return;

    // Clear existing options
    this.themeSelect.innerHTML = "";

    // Add theme options
    Object.keys(themes).forEach((themeKey) => {
      const option = document.createElement("option");
      option.value = themeKey;
      option.textContent = themes[themeKey].name;
      this.themeSelect.appendChild(option);
    });

    // Set selected theme from storage or default
    const savedTheme = localStorage.getItem("preferred-theme") || "default";
    this.themeSelect.value = savedTheme;
  }

  // Initialize the theme manager
  public initialize(): void {
    this.initializeThemeSelector();

    // Apply initial theme from storage
    const savedTheme = localStorage.getItem("preferred-theme") || "default";
    this.applyTheme(savedTheme);
  }
}

// Create theme manager instance
const themeManager = new ThemeManager();

// Maintain compatibility with existing code
(window as any).getTerminalTheme = (): TerminalTheme =>
  themeManager.getTerminalTheme();
(window as any).applyTheme = (themeName: string): void =>
  themeManager.applyTheme(themeName);

// Initialize themes on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  themeManager.initialize();
});

// Export the themeManager for other modules
export { themeManager, ThemeManager };
