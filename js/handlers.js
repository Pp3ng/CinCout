// Template change handler
document.getElementById("template").addEventListener("change", function (e) {
    const lang = document.getElementById("language").value;
    const templateName = e.target.value;
    editor.setValue(templates[lang][templateName]);
});

// Vim mode toggle handler
document.getElementById("vimMode").addEventListener("change", function (e) {
    editor.setOption("keyMap", e.target.checked ? "vim" : "default");
});

// Language change handler
document.getElementById("language").addEventListener("change", function () {
    const lang = this.value;
    updateTemplates();
    document.getElementById("template").value = "Hello World";
    editor.setValue(templates[lang]["Hello World"]);
});

// Output tab click handler
document.getElementById("outputTab").addEventListener("click", function () {
    document.getElementById('output').style.display = 'block';
    document.getElementById('assembly').style.display = 'none';
    this.classList.add('active');
    document.getElementById('assemblyTab').classList.remove('active');
});

// Assembly tab click handler
document.getElementById("assemblyTab").addEventListener("click", function () {
    document.getElementById('output').style.display = 'none';
    document.getElementById('assembly').style.display = 'block';
    this.classList.add('active');
    document.getElementById('outputTab').classList.remove('active');
});

// Compile button click handler
document.getElementById("compile").onclick = function () {
    const code = editor.getValue();
    const lang = document.getElementById("language").value;
    const compiler = document.getElementById("compiler").value;
    const output = document.getElementById("output");

    document.getElementById("outputTab").click();
    output.textContent = "Compiling...";

    fetch('jsp/compile.jsp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'code=' + encodeURIComponent(code) +
            '&lang=' + encodeURIComponent(lang) +
            '&compiler=' + encodeURIComponent(compiler) +
            '&action=compile'
    })
        .then(response => response.text())
        .then(data => {
            output.textContent = data;
        })
        .catch(error => {
            output.textContent = "Error: " + error;
        });
};

document.getElementById("format").onclick = function () {
    const code = editor.getValue();
    const cursor = editor.getCursor();

    const lang = document.getElementById("language").value;

    fetch('jsp/format.jsp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'code=' + encodeURIComponent(code) +
            '&lang=' + encodeURIComponent(lang)
    })
        .then(response => response.text())
        .then(data => {
            // Remove leading and trailing newlines
            const formattedData = data.replace(/^\n+/, '').replace(/\n+$/, '');
            const scrollInfo = editor.getScrollInfo();
            editor.setValue(formattedData);
            editor.setCursor(cursor);
            editor.scrollTo(scrollInfo.left, scrollInfo.top);
            editor.refresh();
        })
        .catch(error => {
            console.error("Format error:", error);
        });
};

// View assembly button click handler
document.getElementById("viewAssembly").onclick = function () {
    const code = editor.getValue();
    const lang = document.getElementById("language").value;
    const compiler = document.getElementById("compiler").value;

    document.getElementById("assemblyTab").click();
    assemblyView.setValue("Generating assembly code...");

    fetch('jsp/compile.jsp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'code=' + encodeURIComponent(code) +
            '&lang=' + encodeURIComponent(lang) +
            '&compiler=' + encodeURIComponent(compiler) +
            '&action=assembly'
    })
        .then(response => response.text())
        .then(data => {
            assemblyView.setValue(data);
        })
        .catch(error => {
            assemblyView.setValue("Error: " + error);
        });
};

document.getElementById("styleCheck").onclick = function () {
    const code = editor.getValue();
    const lang = document.getElementById("language").value;

    document.getElementById("outputTab").click();
    document.getElementById("output").textContent = "Running cppcheck...";

    fetch('jsp/styleCheck.jsp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'code=' + encodeURIComponent(code) +
            '&lang=' + encodeURIComponent(lang)
    })
        .then(response => response.text())
        .then(data => {
            document.getElementById("output").textContent = data;
        })
        .catch(error => {
            document.getElementById("output").textContent = "Error: " + error;
        });
};

// Clear button click handler
document.getElementById("clear").onclick = function () {
    document.getElementById("output").textContent = "// Program output will appear here";
    assemblyView.setValue("");
};

// Handle window resize
window.addEventListener('resize', function () {
    editor.refresh();
    assemblyView.refresh();
});

