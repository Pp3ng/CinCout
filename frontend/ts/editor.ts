// codemirror-setup.ts
declare const CodeMirror: any;

type EditorInstances = {
    editor: any;
    assemblyView: any;
};

const setupEditors = (): EditorInstances => {
    const codeElement = document.getElementById("code");
    const asmElement = document.getElementById("assembly");

    if (!codeElement || !asmElement) {
        throw new Error("Required DOM elements not found");
    }

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
            "Ctrl-Space": "autocomplete"
        },
        foldOptions: {
            widget: "..."
        }
    });

    const assemblyView = CodeMirror(asmElement, {
        lineNumbers: true,
        mode: "gas",
        readOnly: true,
        lineWrapping: true
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
                fontSize = e.deltaY < 0 ? Math.min(fontSize + 1, 24) : Math.max(fontSize - 1, 8);
                applyFontSize();
            }
        },
        { passive: false }
    );
};

(() => {
    try {
        const { editor, assemblyView } = setupEditors();

        // attach to global window so layout.js can use it
        (window as any).editor = editor;
        (window as any).assemblyView = assemblyView;

        setupFontZoomHandler(editor, assemblyView);
    } catch (e) {
        console.error("Editor setup failed:", e);
    }
})();
