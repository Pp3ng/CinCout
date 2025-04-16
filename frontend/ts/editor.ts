// Import CodeMirror correctly - this is a workaround for the type issue
import CodeMirror from "codemirror";

type EditorInstances = {
  editor: any;
  assemblyView: any;
};

const setupEditors = (): EditorInstances => {
  const codeElement = document.getElementById("code") as HTMLTextAreaElement;
  const asmElement = document.getElementById("assembly");

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

  // Fix the direct call to CodeMirror
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

const setupFontZoomHandler = (editor: any, assemblyView: any) => {
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
    function (e: WheelEvent) {
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

// Make CodeMirror available globally for other modules that still use window.CodeMirror
(window as any).CodeMirror = CodeMirror;

// Function to force refresh editors - useful for fixing theme issues
const forceRefreshEditors = () => {
  if ((window as any).editor) {
    (window as any).editor.refresh();
  }
  if ((window as any).assemblyView) {
    (window as any).assemblyView.refresh();
  }
};

// Initialize editors
const initEditors = () => {
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
