import CodeMirror from "codemirror";
import { EditorInstances } from "./types";

const setupEditors = (): EditorInstances => {
  const codeElement = document.getElementById("code") as HTMLTextAreaElement;
  const outputElement = document.getElementById("output") as HTMLDivElement;

  if (!codeElement || !outputElement) {
    throw new Error("Required DOM elements not found");
  }

  // Get saved theme if any
  const savedTheme = localStorage.getItem("preferred-theme") || "default";

  // Main code editor
  const editor = CodeMirror.fromTextArea(codeElement, {
    lineNumbers: true,
    mode: "text/x-c++src",
    keyMap: "default",
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
    theme: savedTheme !== "default" ? savedTheme : "default",
  });

  // Assembly view - will create this but won't attach to DOM until needed
  const assemblyView = CodeMirror(document.createElement("div"), {
    lineNumbers: true,
    mode: "gas",
    readOnly: true,
    lineWrapping: true,
    theme: savedTheme !== "default" ? savedTheme : "default",
  });

  return { editor, assemblyView };
};

const setupFontZoomHandler = (
  editor: CodeMirror.Editor,
  assemblyView: CodeMirror.Editor
) => {
  let fontSize = 14;

  const applyFontSize = () => {
    editor.getWrapperElement().style.fontSize = `${fontSize}px`;
    assemblyView.getWrapperElement().style.fontSize = `${fontSize}px`;
    editor.refresh();
    assemblyView.refresh();
  };

  applyFontSize();

  document.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        fontSize =
          e.deltaY < 0 ? Math.min(fontSize + 1, 24) : Math.max(fontSize - 1, 8);
        applyFontSize();
      }
    },
    { passive: false }
  );
};

const forceRefreshEditors = () => {
  if ((window as any).editor) {
    (window as any).editor.refresh();
  }
  if ((window as any).assemblyView) {
    (window as any).assemblyView.refresh();
  }
};

const initEditors = (): void => {
  try {
    const { editor, assemblyView } = setupEditors();

    // attach to global window so layout.js can use it
    (window as any).editor = editor;
    (window as any).assemblyView = assemblyView;

    setupFontZoomHandler(editor, assemblyView);
  } catch (e) {
    console.error("Editor setup failed:", e);
  }
};

/**
 * EditorService - handles editor-specific functionality
 * Provides methods to interact with CodeMirror editor instances
 */
export class EditorService {
  private static getEditor() {
    return (window as any).editor;
  }

  static getValue(): string {
    return this.getEditor()?.getValue() || "";
  }

  static setValue(value: string): void {
    const editor = this.getEditor();
    if (editor) {
      editor.setValue(value);
    }
  }

  static getCursor(): any {
    return this.getEditor()?.getCursor();
  }

  static setCursor(cursor: any): void {
    const editor = this.getEditor();
    if (editor) {
      editor.setCursor(cursor);
    }
  }

  static getScrollInfo(): any {
    return this.getEditor()?.getScrollInfo();
  }

  static scrollTo(left: number, top: number): void {
    const editor = this.getEditor();
    if (editor) {
      editor.scrollTo(left, top);
    }
  }

  static refresh(): void {
    const editor = this.getEditor();
    if (editor) {
      editor.refresh();
    }
  }

  static setOption(key: string, value: any): void {
    const editor = this.getEditor();
    if (editor) {
      editor.setOption(key, value);
    }
  }

  static setAssemblyValue(value: string): void {
    if ((window as any).assemblyView) {
      (window as any).assemblyView.setValue(value);
    }
  }

  // Methods for React integration - set select values with change event triggering
  static setSelectValue(selectId: string, value: string): void {
    const select = document.getElementById(selectId) as HTMLSelectElement;
    if (select && select.value !== value) {
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  static setLanguage(language: string): void {
    this.setSelectValue("language", language);
  }

  static setCompiler(compiler: string): void {
    this.setSelectValue("compiler", compiler);
  }

  static setOptimization(optimization: string): void {
    this.setSelectValue("optimization", optimization);
  }
}

// Add global refresh method
(window as any).refreshEditors = forceRefreshEditors;

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  initEditors();
});
