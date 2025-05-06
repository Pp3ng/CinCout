import React, { createContext, useContext, useRef, useEffect } from "react";
import { CompileOptions } from "../types";
import { useUIState, useCodeConfig } from "./UIStateContext";
import CompileSocketManager from "../services/CompileSocketManager";
import DebugSocketManager from "../services/DebugSocketManager";
import { EditorService } from "../services/EditorService";

interface SocketContextType {
  compileCode: (options?: Partial<CompileOptions>) => Promise<void>;
  startDebugSession: (options?: Partial<CompileOptions>) => Promise<void>;
  sendDebugCommand: (command: string) => Promise<void>;
  cleanup: () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { state, setState } = useUIState();
  const { config } = useCodeConfig();
  const compileSocketManagerRef = useRef<CompileSocketManager | null>(null);
  const debugSocketManagerRef = useRef<DebugSocketManager | null>(null);

  // Initialize socket managers if they don't exist
  const ensureSocketManagersExist = () => {
    if (!compileSocketManagerRef.current) {
      compileSocketManagerRef.current = new CompileSocketManager({
        updateCompilationState: (state) => {
          setState({ compilationState: state });
        },
        updateProcessRunning: (running) => {
          setState({ isProcessRunning: running });
        },
        showOutput: () => {
          setState({ isOutputVisible: true });
        },
        refreshEditor: () => {
          setTimeout(() => {
            EditorService.refresh();
          }, 10);
        },
      });
    }

    if (!debugSocketManagerRef.current) {
      debugSocketManagerRef.current = new DebugSocketManager({
        updateDebugState: (state) => {
          setState({ compilationState: state });
        },
        setDebuggingActive: (active) => {
          setState({ isDebuggingActive: active });
        },
        showOutput: () => {
          setState({ isOutputVisible: true });
        },
        refreshEditor: () => {
          setTimeout(() => {
            EditorService.refresh();
          }, 10);
        },
      });
    }
  };

  // Sync EditorService config when React context config changes
  useEffect(() => {
    EditorService.updateFromConfig(config);
  }, [config]);

  // Get the current compilation options with code from editor
  const getCurrentCompileOptions = (): CompileOptions => {
    return {
      code: EditorService.getValue(),
      lang: config.language,
      compiler: config.compiler,
      optimization: config.optimization,
    };
  };

  // Compile code using current options
  const compileCode = async (
    options?: Partial<CompileOptions>
  ): Promise<void> => {
    ensureSocketManagersExist();

    // Use provided options or get current options
    const finalOptions = options
      ? { ...getCurrentCompileOptions(), ...options }
      : getCurrentCompileOptions();

    if (compileSocketManagerRef.current) {
      setState({ isOutputVisible: true });
      await compileSocketManagerRef.current.compile(finalOptions);
    }
  };

  // Start debug session
  const startDebugSession = async (
    options?: Partial<CompileOptions>
  ): Promise<void> => {
    ensureSocketManagersExist();

    // Use provided options or get current options
    const finalOptions = options
      ? { ...getCurrentCompileOptions(), ...options }
      : getCurrentCompileOptions();

    if (debugSocketManagerRef.current) {
      setState({ isOutputVisible: true });
      await debugSocketManagerRef.current.startDebugSession(finalOptions);
    }
  };

  // Send debug command
  const sendDebugCommand = async (command: string): Promise<void> => {
    ensureSocketManagersExist();
    if (debugSocketManagerRef.current) {
      await debugSocketManagerRef.current.sendDebugCommand(command);
    }
  };

  // Cleanup socket connections
  const cleanup = () => {
    if (compileSocketManagerRef.current) {
      compileSocketManagerRef.current.cleanup();
    }

    if (debugSocketManagerRef.current) {
      debugSocketManagerRef.current.cleanup();
    }
  };

  return (
    <SocketContext.Provider
      value={{
        compileCode,
        startDebugSession,
        sendDebugCommand,
        cleanup,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use the socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
