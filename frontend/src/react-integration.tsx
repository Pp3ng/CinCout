import React, { useEffect, useState, useContext } from "react";
import ReactDOM from "react-dom/client";
import Header from "./components/Header";
import { setThemeContextValue } from "./services/frontend-services";
import { EditorService } from "./editor";
import { ThemeProvider, ThemeContext } from "./hooks/useTheme";

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
// React Header component with data fetching capabilities
const ReactHeader: React.FC = () => {
  const [currentLanguage] = useState<string>("c");
  const [currentCompiler] = useState<string>("gcc");
  const [currentOptimization] = useState<string>("-O0");
  const initialVimMode = localStorage.getItem("cincout-vim-mode") === "true";

  return (
    <Header
      initialLanguage={currentLanguage}
      initialCompiler={currentCompiler}
      initialOptimization={currentOptimization}
      initialVimMode={initialVimMode}
      onLanguageChange={handleLanguageChange}
      onCompilerChange={handleCompilerChange}
      onOptimizationChange={handleOptimizationChange}
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
