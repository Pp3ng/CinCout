// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

    // Ctrl+Enter or Cmd+Enter to compile and run
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        document.getElementById("compile").click();
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
    // Ctrl+K or Cmd+K to toggle code folding
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        editor.foldCode(editor.getCursor());
    }

    // Handle number shortcuts based on platform
    if (isMac) {
        // Mac: Control + number
        if (e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    document.getElementById("viewAssembly").click();
                    break;
                case '2':
                    e.preventDefault();
                    document.getElementById("format").click();
                    break;
                case '3':
                    e.preventDefault();
                    document.getElementById("styleCheck").click();
                    break;
                case '4':
                    e.preventDefault();
                    document.getElementById("memcheck").click();
                    break;
            }
        }
    } else {
        // Windows/Linux: Alt + number
        if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    document.getElementById("viewAssembly").click();
                    break;
                case '2':
                    e.preventDefault();
                    document.getElementById("format").click();
                    break;
                case '3':
                    e.preventDefault();
                    document.getElementById("styleCheck").click();
                    break;
                case '4':
                    e.preventDefault();
                    document.getElementById("memcheck").click();
                    break;
            }
        }
    }
});