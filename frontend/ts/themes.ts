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

// React-like interfaces for state management
interface ThemeState {
  currentTheme: string;
  themeData: ThemeMap;
  listeners: Array<() => void>;
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

// ----- React-like State Store -----

/**
 * ThemeStore - A React-like state manager for theme data
 * Follows patterns similar to Redux/React Context
 */
class ThemeStore {
  private state: ThemeState = {
    currentTheme: "default",
    themeData: themeDefinitions as ThemeMap,
    listeners: [],
  };

  // Get current state (immutable)
  getState(): Readonly<ThemeState> {
    return { ...this.state };
  }

  // Subscribe to state changes (like React useEffect)
  subscribe(listener: () => void): () => void {
    this.state.listeners.push(listener);

    // Return unsubscribe function (cleanup like in useEffect)
    return () => {
      this.state.listeners = this.state.listeners.filter((l) => l !== listener);
    };
  }

  // Update state immutably (like React useState setter)
  private setState(partialState: Partial<ThemeState>): void {
    // Create new state object (immutable update)
    this.state = {
      ...this.state,
      ...partialState,
    };

    // Notify all listeners (like React re-renders)
    this.state.listeners.forEach((listener) => listener());
  }

  // Action creator - change theme
  setTheme(themeName: string): void {
    const theme = this.state.themeData[themeName];
    if (!theme) {
      console.warn(`Theme ${themeName} not found`);
      return;
    }

    // Update state
    this.setState({ currentTheme: themeName });

    // Side effects
    this.applyThemeToDOM(themeName);
    localStorage.setItem("preferred-theme", themeName);
  }

  // Get current theme data
  getCurrentTheme(): Theme {
    return (
      this.state.themeData[this.state.currentTheme] ||
      this.state.themeData.default
    );
  }

  // Get CSS variable from DOM (pure function)
  private getCssVar(varName: string, fallback: string = ""): string {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    return value || fallback;
  }

  // Convert hex color to RGB values
  private hexToRgb(hex: string): string {
    const rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (rgb) {
      return `${parseInt(rgb[1], 16)}, ${parseInt(rgb[2], 16)}, ${parseInt(
        rgb[3],
        16
      )}`;
    }
    return "30, 136, 229"; // Default blue fallback
  }

  // Side effect - Apply theme to DOM
  private applyThemeToDOM(themeName: string): void {
    const theme = this.state.themeData[themeName];
    if (!theme) return;

    // Add transition class for smooth theme changes
    document.body.classList.add("theme-transitioning");

    // CSS variable mapping
    const cssVarMap: { [key: string]: string } = {
      bg: "--bg-primary",
      bgSecondary: "--bg-secondary",
      text: "--text-primary",
      textSecondary: "--text-secondary",
      accent: "--accent",
      accentHover: "--accent-hover",
      border: "--border",
    };

    // Apply CSS variables in next animation frame (performance optimization)
    requestAnimationFrame(() => {
      const root = document.documentElement;

      // Set theme CSS variables
      Object.entries(cssVarMap).forEach(([themeKey, cssVar]) => {
        if (theme[themeKey as keyof Theme]) {
          root.style.setProperty(
            cssVar,
            theme[themeKey as keyof Theme] as string
          );
        }
      });

      // Add RGB versions for transparency effects
      root.style.setProperty("--accent-rgb", this.hexToRgb(theme.accent));
      root.style.setProperty("--error-rgb", "255, 85, 85"); // Default error color

      // Update theme selector component if it exists
      this.updateThemeSelector(themeName);

      // Update editor and terminal
      this.updateEditorAndTerminal(themeName);

      // Remove transition class after animation completes
      setTimeout(() => {
        document.body.classList.remove("theme-transitioning");
      }, 300);
    });
  }

  // Side effect - update UI components
  private updateThemeSelector(themeName: string): void {
    const themeSelect = document.getElementById(
      "theme-select"
    ) as HTMLSelectElement;
    if (themeSelect) {
      themeSelect.value = themeName;
    }
  }

  // Side effect - Update editor and terminal themes
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

    if ((window as any).terminal) {
      setTimeout(() => {
        try {
          // Get the terminal theme
          const terminalTheme = this.getTerminalTheme();

          if ((window as any).terminal.options) {
            (window as any).terminal.options.theme = terminalTheme;

            // Force a refresh of the terminal display
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
  }

  getTerminalTheme(): TerminalTheme {
    const currentTheme = this.getCurrentTheme();

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
      ...(currentTheme.terminal || {}),
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

  // Ensure all color values have # prefix (pure function)
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

  // Initialize the theme system
  initialize(): void {
    // Mount the theme selector component
    this.mountThemeSelector();

    // Apply initial theme from storage
    const savedTheme = localStorage.getItem("preferred-theme") || "default";
    this.setTheme(savedTheme);

    // Make theme getter available globally for terminal setup
    (window as any).getTerminalTheme = this.getTerminalTheme.bind(this);
  }

  // React-like component mounting
  private mountThemeSelector(): void {
    const themeSelect = document.getElementById(
      "theme-select"
    ) as HTMLSelectElement;
    if (!themeSelect) return;

    // Clear existing options
    themeSelect.innerHTML = "";

    // Add theme options (like a React component rendering options)
    Object.entries(this.state.themeData).forEach(([themeKey, themeData]) => {
      const option = document.createElement("option");
      option.value = themeKey;
      option.textContent = themeData.name;
      themeSelect.appendChild(option);
    });

    // Set initial value
    const savedTheme = localStorage.getItem("preferred-theme") || "default";
    themeSelect.value = savedTheme;

    // Add event listener for changes (like onChange in React)
    themeSelect.addEventListener("change", (event) => {
      const target = event.target as HTMLSelectElement;
      this.setTheme(target.value);
    });
  }
}

// Create singleton theme store instance (like React Context)
const themeStoreInstance = new ThemeStore();

// Initialize themes on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  themeStoreInstance.initialize();
});
// Export the theme store and hooks for other modules
export { themeStoreInstance };
