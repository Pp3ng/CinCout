let editor = CodeMirror.fromTextArea(document.getElementById("code"), {
    lineNumbers: true,
    mode: "text/x-c++src",
    theme: "nord",
    keyMap: "default",
    matchBrackets: true,
    autoCloseBrackets: true,
    indentUnit: 4,
    tabSize: 4,
    indentWithTabs: true,
    lineWrapping: true
});

let assemblyView = CodeMirror(document.getElementById("assembly"), {
    lineNumbers: true,
    mode: "gas",
    theme: "nord",
    readOnly: true,
    lineWrapping: true
});