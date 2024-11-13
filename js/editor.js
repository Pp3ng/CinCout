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