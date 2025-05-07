import React, { createContext, useContext, useCallback } from "react";
import { ApiService } from "../services/api-service";
import { CompileOptions } from "../types";
import { useUIState, useCodeConfig } from "./UIStateContext";
import { EditorService } from "../services/EditorService";
import { useNotification } from "../hooks/useNotification";

interface ApiContextType {
  viewAssembly: (options?: Partial<CompileOptions>) => Promise<void>;
  runMemCheck: (options?: Partial<CompileOptions>) => Promise<void>;
  formatCode: (code: string, lang: string) => Promise<string | null>;
  runStyleCheck: (code: string, lang: string) => Promise<void>;
}

const ApiServiceContext = createContext<ApiContextType | null>(null);

export const ApiServiceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { setState } = useUIState();
  const { config } = useCodeConfig();
  // Use notification hook
  const { success, error } = useNotification();

  // Get the current compilation options with code from editor
  const getCurrentCompileOptions = useCallback((): CompileOptions => {
    return {
      code: EditorService.getValue(),
      lang: config.language,
      compiler: config.compiler,
      optimization: config.optimization,
    };
  }, [config]);

  // Format code through API
  const formatCode = useCallback(
    async (code: string, lang: string): Promise<string | null> => {
      const cursor = EditorService.getCursor();

      try {
        const data = await ApiService.formatCode(code, lang);

        // Apply formatting changes while preserving editor state
        const formattedData = data.trim();
        const scrollInfo = EditorService.getScrollInfo();

        EditorService.setValue(formattedData);
        if (cursor) EditorService.setCursor(cursor);
        if (scrollInfo) EditorService.scrollTo(scrollInfo.left, scrollInfo.top);
        EditorService.refresh();

        success("Code formatted successfully", 2000, {
          top: "50%",
          left: "50%",
        });

        return formattedData;
      } catch (err) {
        console.error("Format error:", err);
        error("Failed to format code", 3000, { top: "50%", left: "50%" });
        return null;
      }
    },
    [success, error]
  );

  // View assembly code
  const viewAssembly = useCallback(
    async (options?: Partial<CompileOptions>): Promise<void> => {
      setState({ isOutputVisible: true });
      setLoadingOutput("Generating assembly code...");

      try {
        // Use provided options or get current options
        const finalOptions = options
          ? { ...getCurrentCompileOptions(), ...options }
          : getCurrentCompileOptions();

        const data = await ApiService.fetchAssembly(finalOptions);
        setOutput(`<div id="assembly-view-container"></div>`);

        // Use the assemblyView to display the assembly code
        setTimeout(() => {
          const container = document.getElementById("assembly-view-container");
          const assemblyView = (window as any).assemblyView;

          if (assemblyView && container) {
            assemblyView.setValue(data.trim());
            container.appendChild(assemblyView.getWrapperElement());
            setTimeout(() => assemblyView.refresh(), 10);
          } else {
            setOutput(`<pre class="assembly-output">${data.trim()}</pre>`);
          }
        }, 0);
      } catch (error) {
        console.error("Assembly view error:", error);
        setOutput(
          `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Error: ${error}</div>`
        );
      }
    },
    [setState, getCurrentCompileOptions]
  );

  // Run memory check
  const runMemCheck = useCallback(
    async (options?: Partial<CompileOptions>): Promise<void> => {
      setState({ isOutputVisible: true });
      setLoadingOutput("Running memory check...");

      try {
        // Use provided options or get current options
        const finalOptions = options
          ? { ...getCurrentCompileOptions(), ...options }
          : getCurrentCompileOptions();

        const data = await ApiService.runMemCheck(finalOptions);
        setOutput(
          `<div class="memcheck-output" style="white-space: pre-wrap; overflow: visible;">${data}</div>`
        );
      } catch (error) {
        console.error("Memcheck error:", error);
        setOutput(
          `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Error: ${error}</div>`
        );
      }
    },
    [setState, getCurrentCompileOptions]
  );

  // Run style check
  const runStyleCheck = useCallback(
    async (code: string, lang: string): Promise<void> => {
      setState({ isOutputVisible: true });
      setLoadingOutput("Running style check...");

      try {
        const data = await ApiService.runStyleCheck(code, lang);

        // Process and format the output
        const formattedLines = data
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => !!line)
          .map(
            (line) =>
              `<div class="style-block" style="white-space: pre-wrap; overflow: visible;">${line}</div>`
          )
          .join("\n");

        setOutput(
          `<div class="style-check-output" style="white-space: pre-wrap; overflow: visible;">${formattedLines}</div>`
        );
      } catch (error) {
        setOutput(
          `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Error: ${error}</div>`
        );
      }
    },
    [setState]
  );

  // Helper functions for setting output
  const setOutput = useCallback((html: string) => {
    const outputEl = document.getElementById("output");
    if (outputEl) {
      outputEl.innerHTML = html;
    }
  }, []);

  const setLoadingOutput = useCallback(
    (text: string) => {
      setOutput(`<div class='loading'>${text}</div>`);
    },
    [setOutput]
  );

  return (
    <ApiServiceContext.Provider
      value={{
        viewAssembly,
        runMemCheck,
        formatCode,
        runStyleCheck,
      }}
    >
      {children}
    </ApiServiceContext.Provider>
  );
};

// Custom hook to use the API service context
export const useApiService = () => {
  const context = useContext(ApiServiceContext);
  if (!context) {
    throw new Error("useApiService must be used within an ApiServiceProvider");
  }
  return context;
};
