// TypeScript definitions for global objects
declare const CodeMirror: any;

// Initialize editor globally so it can be accessed by layout.js
(window as any).editor = CodeMirror.fromTextArea(document.getElementById("code"), {
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
        widget: '...'
    }
});

// Initialize assembly view globally so it can be accessed by layout.js
(window as any).assemblyView = CodeMirror(document.getElementById("assembly"), {
    lineNumbers: true,
    mode: "gas",
    readOnly: true,
    lineWrapping: true
});

(window as any).assemblyView.setSize(null, "100%");

//Init font size
let fontSize: number = 14;

document.addEventListener('wheel', function(e: WheelEvent) {
    if (e.ctrlKey) {
        e.preventDefault();
        
        // Change font size according to direction of scroll
        if (e.deltaY < 0) {
            fontSize = Math.min(fontSize + 1, 24);// Max font size is 24px
        } else {
            fontSize = Math.max(fontSize - 1, 8); // Min font size is 8px
        }

        (window as any).editor.getWrapperElement().style.fontSize = `${fontSize}px`;
        (window as any).assemblyView.getWrapperElement().style.fontSize = `${fontSize}px`;
        
        (window as any).editor.refresh();
        (window as any).assemblyView.refresh();
    }
}, { passive: false });

(window as any).editor.getWrapperElement().style.fontSize = `${fontSize}px`;
(window as any).assemblyView.getWrapperElement().style.fontSize = `${fontSize}px`;
