import React, { useEffect, useState, useContext } from "react";
import ReactDOM from "react-dom/client";
import Header from "./components/Header";
import {
  ShortcutService,
  ThemeService,
  setThemeContextValue,
} from "./services/frontend-services";
import { ShortcutDefinition } from "./types";
import { EditorService } from "./handlers";
import { ThemeProvider, ThemeContext, useTheme } from "./hooks/useTheme";

/**
 * Initialize the React Header component and mount it to replace the existing header
 */
export function initializeReactHeader() {
  const existingHeader = document.querySelector(".header");
  if (!existingHeader) return false;

  const root = ReactDOM.createRoot(existingHeader);
  root.render(
    <React.StrictMode>
      <ThemeProvider>
        <ThemeContextBridge>
          <ReactHeader />
        </ThemeContextBridge>
      </ThemeProvider>
    </React.StrictMode>
  );
  return true;
}

// ThemeContextBridge component to provide the theme context to non-React code
const ThemeContextBridge: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const themeContext = useContext(ThemeContext);
  useEffect(() => {
    setThemeContextValue(themeContext);
    return () => setThemeContextValue(null);
  }, [themeContext]);
  return <>{children}</>;
};

// Flag to prevent infinite loops in event handling
let isHandlingThemeChange = false;

// React Header component with data fetching capabilities
const ReactHeader: React.FC = () => {
  const { theme, getThemeOptions } = useTheme();
  const [shortcuts, setShortcuts] = useState<Array<ShortcutDefinition>>([]);
  const [currentLanguage, setCurrentLanguage] = useState<string>("c");
  const [currentCompiler, setCurrentCompiler] = useState<string>("gcc");
  const [currentOptimization, setCurrentOptimization] = useState<string>("-O0");
  const [vimMode, setVimMode] = useState<boolean>(
    localStorage.getItem("cincout-vim-mode") === "true"
  );

  useEffect(() => {
    setShortcuts(ShortcutService.getAllShortcuts());
  }, []);

  return (
    <Header
      themes={getThemeOptions()}
      shortcuts={shortcuts}
      initialLanguage={currentLanguage}
      initialCompiler={currentCompiler}
      initialOptimization={currentOptimization}
      initialTheme={theme}
      initialVimMode={vimMode}
      onLanguageChange={handleLanguageChange}
      onCompilerChange={handleCompilerChange}
      onOptimizationChange={handleOptimizationChange}
      onThemeChange={handleThemeChange}
    />
  );
};

// Event handlers that will communicate with existing code using EditorService
function handleLanguageChange(language: string) {
  EditorService.setLanguage(language);
}

function handleCompilerChange(compiler: string) {
  EditorService.setCompiler(compiler);
}

function handleOptimizationChange(optimization: string) {
  EditorService.setOptimization(optimization);
}

function handleThemeChange(theme: string) {
  if (isHandlingThemeChange) return;
  isHandlingThemeChange = true;

  try {
    // Dispatch event for backward compatibility
    document.dispatchEvent(
      new CustomEvent("react:themeChange", { detail: { theme } })
    );
    ThemeService.setTheme(theme, true);
  } finally {
    setTimeout(() => {
      isHandlingThemeChange = false;
    }, 100);
  }
}
