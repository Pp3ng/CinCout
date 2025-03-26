// Initialize editor globally so it can be accessed by layout.js
window.editor = CodeMirror.fromTextArea(document.getElementById("code"), {
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
window.assemblyView = CodeMirror(document.getElementById("assembly"), {
    lineNumbers: true,
    mode: "gas",
    readOnly: true,
    lineWrapping: true
});

window.assemblyView.setSize(null, "100%");

//Init font size
let fontSize = 14;

document.addEventListener('wheel', function(e) {
    if (e.ctrlKey) {
        e.preventDefault();
        
        // Change font size according to direction of scroll
        if (e.deltaY < 0) {
            fontSize = Math.min(fontSize + 1, 24);// Max font size is 24px
        } else {
            fontSize = Math.max(fontSize - 1, 8); // Min font size is 8px
        }

        window.editor.getWrapperElement().style.fontSize = `${fontSize}px`;
        window.assemblyView.getWrapperElement().style.fontSize = `${fontSize}px`;
        
        window.editor.refresh();
        window.assemblyView.refresh();
    }
}, { passive: false });

window.editor.getWrapperElement().style.fontSize = `${fontSize}px`;
window.assemblyView.getWrapperElement().style.fontSize = `${fontSize}px`;