let editor = CodeMirror.fromTextArea(document.getElementById("code"), {
    lineNumbers: true,
    mode: "text/x-c++src",
    keyMap: "default",
    matchBrackets: true,
    autoCloseBrackets: true,
    indentUnit: 4,
    tabSize: 4,
    indentWithTabs: true,
    lineWrapping: true,
    extraKeys: {
        "Ctrl-Space": "autocomplete"
    }
});

let assemblyView = CodeMirror(document.getElementById("assembly"), {
    lineNumbers: true,
    mode: "gas",
    readOnly: true,
    lineWrapping: true
});

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

        editor.getWrapperElement().style.fontSize = `${fontSize}px`;
        assemblyView.getWrapperElement().style.fontSize = `${fontSize}px`;
        
        editor.refresh();
        assemblyView.refresh();
    }
}, { passive: false });

editor.getWrapperElement().style.fontSize = `${fontSize}px`;
assemblyView.getWrapperElement().style.fontSize = `${fontSize}px`;