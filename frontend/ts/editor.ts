import CodeMirror from "codemirror";
import { EditorInstances } from "./types";

const setupEditors = (): EditorInstances => {
  const codeElement = document.getElementById("code") as HTMLTextAreaElement;
  const asmElement = document.getElementById("assembly") as HTMLDivElement;

  if (!codeElement || !asmElement) {
    throw new Error("Required DOM elements not found");
  }

  // Get saved theme if any
  const savedTheme = localStorage.getItem("preferred-theme") || "default";
  // Use the default export as a function
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

  const assemblyView = CodeMirror(asmElement, {
    lineNumbers: true,
    mode: "gas",
    readOnly: true,
    lineWrapping: true,
    theme: savedTheme !== "default" ? savedTheme : "default",
  });
  assemblyView.setSize(null, "100%");

  return { editor, assemblyView };
};

const setupFontZoomHandler = (editor: Editor, assemblyView: Editor) => {
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

// Add global refresh method
(window as any).refreshEditors = forceRefreshEditors;

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  initEditors();
});
