import React, { createContext, useState, useContext, ReactNode } from "react";
import { UIState, CompilationState } from "../types";

// Create context with default values
const UIStateContext = createContext<{
  state: UIState;
  setState: (partialState: Partial<UIState>) => void;
  toggleZenMode: () => void;
}>({
  state: {
    isOutputVisible: false,
    isLoading: false,
    loadingMessage: "",
    compilationState: CompilationState.IDLE,
    theme: "default",
    isDebuggingActive: false,
    isZenMode: false,
  },
  setState: () => {},
  toggleZenMode: () => {},
});

// Code configuration context for language, compiler, and optimization settings
export interface CodeConfig {
  language: string;
  compiler: string;
  optimization: string;
}

const CodeConfigContext = createContext<{
  config: CodeConfig;
  setConfig: (partialConfig: Partial<CodeConfig>) => void;
}>({
  config: {
    language: "c",
    compiler: "gcc",
    optimization: "-O0",
  },
  setConfig: () => {},
});

// Provider component
export const UIStateProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, setStateValue] = useState<UIState>({
    isOutputVisible: false,
    isLoading: false,
    loadingMessage: "",
    compilationState: CompilationState.IDLE,
    theme: localStorage.getItem("cincout-theme") || "default",
    isDebuggingActive: false,
    isZenMode: false,
  });

  const [config, setConfigValue] = useState<CodeConfig>({
    language: localStorage.getItem("cincout-language") || "c",
    compiler: localStorage.getItem("cincout-compiler") || "gcc",
    optimization: localStorage.getItem("cincout-optimization") || "-O0",
  });

  const setState = (partialState: Partial<UIState>) => {
    setStateValue((prevState) => ({ ...prevState, ...partialState }));
  };

  const toggleZenMode = () => {
    setStateValue((prevState) => ({
      ...prevState,
      isZenMode: !prevState.isZenMode,
    }));
  };

  const setConfig = (partialConfig: Partial<CodeConfig>) => {
    setConfigValue((prevConfig) => {
      const newConfig = { ...prevConfig, ...partialConfig };

      // Save to localStorage for persistence
      if (partialConfig.language) {
        localStorage.setItem("cincout-language", newConfig.language);
      }
      if (partialConfig.compiler) {
        localStorage.setItem("cincout-compiler", newConfig.compiler);
      }
      if (partialConfig.optimization) {
        localStorage.setItem("cincout-optimization", newConfig.optimization);
      }

      return newConfig;
    });
  };

  return (
    <UIStateContext.Provider value={{ state, setState, toggleZenMode }}>
      <CodeConfigContext.Provider value={{ config, setConfig }}>
        {children}
      </CodeConfigContext.Provider>
    </UIStateContext.Provider>
  );
};

// Custom hook to use the UIState context
export const useUIState = () => {
  const context = useContext(UIStateContext);
  if (!context) {
    throw new Error("useUIState must be used within a UIStateProvider");
  }
  return context;
};

// Custom hook to use code configuration
export const useCodeConfig = () => {
  const context = useContext(CodeConfigContext);
  if (!context) {
    throw new Error("useCodeConfig must be used within a UIStateProvider");
  }
  return context;
};
