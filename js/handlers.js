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
    const optimization = document.getElementById("optimization").value;
    const output = document.getElementById("output");

    document.getElementById("outputTab").click();
    output.innerHTML = "<div class='loading'>Compiling...</div>";

    fetch('jsp/compile.jsp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'code=' + encodeURIComponent(code) +
            '&lang=' + encodeURIComponent(lang) +
            '&compiler=' + encodeURIComponent(compiler) +
            '&optimization=' + encodeURIComponent(optimization) +
            '&action=compile'
    })
    .then(response => response.text())
    .then(data => {
        const trimmedData = data.trim();
        output.innerHTML = `<div class="highlighted-output" style="white-space: pre-wrap; overflow: visible;">${formatOutput(trimmedData)}</div>`;
    })
    .catch(error => {
        output.innerHTML = `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Error: ${error}</div>`;
    });
};

//Memcheck button click handler
document.getElementById("memcheck").onclick = function () {
    const code = editor.getValue();
    const lang = document.getElementById("language").value;
    const compiler = document.getElementById("compiler").value;
    const optimization = document.getElementById("optimization").value;

    document.getElementById("outputTab").click();
    document.getElementById("output").innerHTML = "<div class='loading'>Running memory check...</div>";

    fetch('jsp/memcheck.jsp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'code=' + encodeURIComponent(code) +
            '&lang=' + encodeURIComponent(lang) +
            '&compiler=' + encodeURIComponent(compiler) +
            '&optimization=' + encodeURIComponent(optimization)
    })
    .then(response => response.text())
    .then(data => {
        document.getElementById("output").innerHTML = 
            `<div class="memcheck-output" style="white-space: pre-wrap; overflow: visible;">${formatOutput(data)}</div>`;
    })
    .catch(error => {
        document.getElementById("output").innerHTML = 
            `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Error: ${error}</div>`;
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
    const optimization = document.getElementById("optimization").value;

    document.getElementById("assemblyTab").click();

    // Create a loading div
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.textContent = 'Generating assembly code';

    //Get assembly div and its CodeMirroe container
    const assemblyDiv = document.getElementById("assembly");
    const cmContainer = assemblyDiv.querySelector('.CodeMirror');

    // Insert loadingDiv before cmcontainer
    assemblyDiv.insertBefore(loadingDiv, cmContainer);
    assemblyView.setValue('');

    fetch('jsp/compile.jsp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'code=' + encodeURIComponent(code) +
            '&lang=' + encodeURIComponent(lang) +
            '&compiler=' + encodeURIComponent(compiler) +
            '&optimization=' + encodeURIComponent(optimization) +
            '&action=assembly'
    })
    .then(response => response.text())
    .then(data => {
        loadingDiv.remove();
        const trimmedData = data.trim();
        assemblyView.setValue(trimmedData);
    })
    .catch(error => {
        loadingDiv.remove();
        assemblyView.setValue("Error: " + error);
    });
};

document.getElementById("styleCheck").onclick = function () {
    const code = editor.getValue();
    const lang = document.getElementById("language").value;

    document.getElementById("outputTab").click();
    document.getElementById("output").innerHTML = "<div class='loading'>Running cppcheck...</div>";

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
            const lines = data.split('\n');
            const formattedLines = lines.map(line => {
                if (line.trim()) {
                    return `<div class="style-block" style="white-space: pre-wrap; overflow: visible;">${formatOutput(line)}</div>`;
                }
                return '';
            }).filter(line => line);

            document.getElementById("output").innerHTML =
                `<div class="style-check-output" style="white-space: pre-wrap; overflow: visible;">${formattedLines.join('\n')}</div>`;
        })
        .catch(error => {
            document.getElementById("output").innerHTML = `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Error: ${error}</div>`;
        });
};

// Clear button click handler
document.getElementById("clear").onclick = function () {
    document.getElementById("output").innerHTML = `<pre class="default-output">// Program output will appear here</pre>`;
    assemblyView.setValue("");
};

// Handle window resize
window.addEventListener('resize', function () {
    editor.refresh();
    assemblyView.refresh();
});

//Button ripple effect
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll("button").forEach(button => {
        button.addEventListener("click", function (event) {
            const button = event.currentTarget;

            //Remove existing ripples
            const ripples = button.getElementsByClassName("ripple");
            Array.from(ripples).forEach(ripple => ripple.remove());

            //Create a new ripple
            const circle = document.createElement("span");
            const diameter = Math.max(button.clientWidth, button.clientHeight);
            const radius = diameter / 2;

            //Set position of ripple
            const rect = button.getBoundingClientRect();
            const x = event.clientX - rect.left - radius;
            const y = event.clientY - rect.top - radius;

            circle.style.width = circle.style.height = `${diameter}px`;
            circle.style.left = `${x}px`;
            circle.style.top = `${y}px`;
            circle.classList.add("ripple");

            button.appendChild(circle);

            circle.addEventListener("animationend", () => circle.remove());
        });
    });
});

function formatOutput(text) {
    text = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/error:/gi, '<span class="error-text">error:</span>')
        .replace(/warning:/gi, '<span class="warning-text">warning:</span>')
        .replace(/(\d+):(\d+):/g, '<span class="line-number">$1</span>:<span class="column-number">$2</span>:');

    if (text.includes('HEAP SUMMARY') || text.includes('LEAK SUMMARY')) {
        text = text
            .replace(/###LINE:(\d+)###/g, '(line: <span class="line-number">$1</span>)')
            .replace(/###LEAK:(.*?)###/g, '<div class="memcheck-leak">$1</div>')
            .trim()// Remove leading and trailing whitespace
            .replace(/\n{2,}/g, '\n'); // Remove multiple newlines
    }

    return text;
}