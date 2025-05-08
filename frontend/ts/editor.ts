import CodeMirror from "codemirror";
import { EditorInstances } from "./types";

export class EditorService {
  private static instance: EditorService;
  private editor: CodeMirror.Editor | null = null;
  private assemblyView: CodeMirror.Editor | null = null;

  private constructor() {}

  static getInstance(): EditorService {
    if (!EditorService.instance) {
      EditorService.instance = new EditorService();
    }
    return EditorService.instance;
  }

  setEditors(editors: EditorInstances): void {
    this.editor = editors.editor;
    this.assemblyView = editors.assemblyView;
  }

  getEditor(): CodeMirror.Editor | null {
    return this.editor;
  }

  getAssemblyView(): CodeMirror.Editor | null {
    return this.assemblyView;
  }

  getValue(): string {
    return this.editor?.getValue() || "";
  }

  setValue(value: string): void {
    if (this.editor) {
      this.editor.setValue(value);
    }
  }

  getCursor(): CodeMirror.Position | null {
    return this.editor?.getCursor() || null;
  }

  setCursor(cursor: CodeMirror.Position): void {
    if (this.editor) {
      this.editor.setCursor(cursor);
    }
  }

  getScrollInfo(): CodeMirror.ScrollInfo | null {
    return this.editor?.getScrollInfo() || null;
  }

  scrollTo(left: number, top: number): void {
    if (this.editor) {
      this.editor.scrollTo(left, top);
    }
  }

  refresh(): void {
    if (this.editor) {
      this.editor.refresh();
    }
  }

  setOption<K extends keyof CodeMirror.EditorConfiguration>(key: K, value: CodeMirror.EditorConfiguration[K]): void {
    if (this.editor) {
      this.editor.setOption(key, value);
    }
  }

  setAssemblyValue(value: string): void {
    if (this.assemblyView) {
      this.assemblyView.setValue(value);
    }
  }

  refreshAll(): void {
    if (this.editor) {
      this.editor.refresh();
    }
    if (this.assemblyView) {
      this.assemblyView.refresh();
    }
  }
}

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

export const getEditorService = (): EditorService => {
  return EditorService.getInstance();
};

export interface EditorActions {
  toggleZenMode: () => void;
}

let globalActions: EditorActions | null = null;

export const setEditorActions = (actions: EditorActions): void => {
  globalActions = actions;
};

export const getEditorActions = (): EditorActions | null => {
  return globalActions;
};

const initEditors = (): void => {
  try {
    const editorInstances = setupEditors();
    
    const editorService = EditorService.getInstance();
    editorService.setEditors(editorInstances);

    setupFontZoomHandler(editorInstances.editor, editorInstances.assemblyView);
    
  } catch (e) {
    console.error("Editor setup failed:", e);
  }
};

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  initEditors();
});
