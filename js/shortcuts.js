// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
    // Ctrl+Enter or Cmd+Enter to compile and run
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        document.getElementById("compile").click();
    }
    // Ctrl+Shift+A or Cmd+Shift+A to view assembly
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        document.getElementById("viewAssembly").click();
    }
    // Ctrl+L or Cmd+L to clear output
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        document.getElementById("clear").click();
    }
    // Ctrl+S or Cmd+S to save code
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const code = editor.getValue();
        const blob = new Blob([code], {type: 'text/plain'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'code.' + (document.getElementById('language').value === 'cpp' ? 'cpp' : 'c');
        a.click();
    }
    // Ctrl+O or Cmd+O to open code file
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.c,.cpp';
        input.onchange = function () {
            const file = this.files[0];
            const reader = new FileReader();
            reader.onload = function () {
                editor.setValue(reader.result);
            };
            reader.readAsText(file);
        };
        input.click();
    }
    //Ctrl+Alt+F or Cmd+Alt+F to format code
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'f') {
        e.preventDefault();
        document.getElementById("format").click();
    }

    // Ctrl+Alt+C or Cmd+Alt+C to check code style
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'c') {
        e.preventDefault();
        document.getElementById("styleCheck").click();
    }

    // Ctrl+Alt+L or Cmd+Alt+L to check memory
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'l') {
        e.preventDefault();
        document.getElementById("memcheck").click();
    }
});