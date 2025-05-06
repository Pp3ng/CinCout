import { useEffect, useRef, useState } from "react";
import CodeMirror from "codemirror";
import { useTheme } from "./useTheme";

// Editor configuration options
interface EditorOptions {
  mode?: string;
  theme?: string;
  lineNumbers?: boolean;
  foldGutter?: boolean;
}

// Font size control options
interface FontSizeOptions {
  initialFontSize?: number;
  minFontSize?: number;
  maxFontSize?: number;
}

export const useEditor = (
  editorOptions: EditorOptions = {},
  fontOptions: FontSizeOptions = {}
) => {
  // Editor references
  const editorRef = useRef<CodeMirror.Editor | null>(null);
  const assemblyViewRef = useRef<CodeMirror.Editor | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // States
  const { theme } = useTheme();
  const [fontSize, setFontSize] = useState(fontOptions.initialFontSize || 14);
  const [isVimMode, setIsVimMode] = useState(
    () => localStorage.getItem("cincout-vim-mode") === "true"
  );

  // Initialize editors
  useEffect(() => {
    if (textareaRef.current && !editorRef.current) {
      // Set up main editor
      editorRef.current = CodeMirror.fromTextArea(textareaRef.current, {
        lineNumbers: true,
        mode: "text/x-c++src",
        keyMap: isVimMode ? "vim" : "default",
        matchBrackets: true,
        autoCloseBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: true,
        lineWrapping: true,
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        extraKeys: {
          "Ctrl-Space": "autocomplete",
        },
        foldOptions: {
          widget: "...",
        },
        theme: theme !== "default" ? theme : "default",
        ...editorOptions,
      });

      // Set up assembly view - not attached to DOM until needed
      assemblyViewRef.current = CodeMirror(document.createElement("div"), {
        lineNumbers: true,
        mode: "gas",
        readOnly: true,
        lineWrapping: true,
        theme: theme !== "default" ? theme : "default",
      });

      // Attach to window for compatibility with existing code
      (window as any).editor = editorRef.current;
      (window as any).assemblyView = assemblyViewRef.current;

      // Set font size
      applyFontSize(fontSize);
    }

    return () => {
      // Cleanup when component unmounts
      if (editorRef.current) {
        // We're not removing the editor instance to maintain compatibility
        // with existing code that expects it to be available on window
      }
    };
  }, []);

  // Update theme when it changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setOption(
        "theme",
        theme !== "default" ? theme : "default"
      );
    }
    if (assemblyViewRef.current) {
      assemblyViewRef.current.setOption(
        "theme",
        theme !== "default" ? theme : "default"
      );
    }
  }, [theme]);

  // Update keyMap when Vim mode changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setOption("keyMap", isVimMode ? "vim" : "default");
    }
  }, [isVimMode]);

  // Set up font size wheel handler
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const min = fontOptions.minFontSize || 8;
        const max = fontOptions.maxFontSize || 24;
        const newSize =
          e.deltaY < 0
            ? Math.min(fontSize + 1, max)
            : Math.max(fontSize - 1, min);

        setFontSize(newSize);
        applyFontSize(newSize);
      }
    };

    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      document.removeEventListener("wheel", handleWheel);
    };
  }, [fontSize, fontOptions.minFontSize, fontOptions.maxFontSize]);

  // Helper to apply font size to all editors
  const applyFontSize = (size: number) => {
    if (editorRef.current) {
      const wrapper = editorRef.current.getWrapperElement();
      wrapper.style.fontSize = `${size}px`;
      editorRef.current.refresh();
    }
    if (assemblyViewRef.current) {
      const wrapper = assemblyViewRef.current.getWrapperElement();
      wrapper.style.fontSize = `${size}px`;
      assemblyViewRef.current.refresh();
    }
  };

  // Editor utility methods
  const getValue = () => editorRef.current?.getValue() || "";
  const setValue = (value: string) => editorRef.current?.setValue(value);
  const getCursor = () => editorRef.current?.getCursor();
  const setCursor = (cursor: any) => editorRef.current?.setCursor(cursor);
  const getScrollInfo = () => editorRef.current?.getScrollInfo();
  const scrollTo = (left: number, top: number) =>
    editorRef.current?.scrollTo(left, top);
  const refresh = () => editorRef.current?.refresh();
  const setOption = (key: string, value: any) =>
    editorRef.current?.setOption(key, value);
  const setVimMode = (enabled: boolean) => {
    setIsVimMode(enabled);
    localStorage.setItem("cincout-vim-mode", enabled.toString());
  };

  // Return the editor instances and utilities
  return {
    textareaRef,
    editorRef,
    assemblyViewRef,
    setVimMode,
    fontSize,
    setFontSize,
    // Editor API methods
    getValue,
    setValue,
    getCursor,
    setCursor,
    getScrollInfo,
    scrollTo,
    refresh,
    setOption,
    // For assembly view
    setAssemblyValue: (value: string) =>
      assemblyViewRef.current?.setValue(value),
  };
};

export default useEditor;
