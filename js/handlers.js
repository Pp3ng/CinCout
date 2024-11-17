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
    output.innerHTML = "<div class='loading'>Compiling...</div>";

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
            output.innerHTML = `<pre class="highlighted-output">${formatOutput(data)}</pre>`;
        })
        .catch(error => {
            output.innerHTML = `<pre class="error-output">Error: ${error}</pre>`;
        });
};

//Memcheck button click handler
document.getElementById("memcheck").onclick = function () {
    const code = editor.getValue();
    const lang = document.getElementById("language").value;

    document.getElementById("outputTab").click();
    document.getElementById("output").innerHTML = "<div class='loading'>Running memory check...</div>";

    fetch('jsp/memcheck.jsp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'code=' + encodeURIComponent(code) +
            '&lang=' + encodeURIComponent(lang)
    })
        .then(response => response.text())
        .then(data => {
            document.getElementById("output").innerHTML = `<pre class="memcheck-output">${formatOutput(data)}</pre>`;
        })
        .catch(error => {
            document.getElementById("output").innerHTML = `<pre class="error-output">Error: ${error}</pre>`;
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
            document.getElementById("output").innerHTML = `<pre class="style-check-output">${formatOutput(data)}</pre>`;
        })
        .catch(error => {
            document.getElementById("output").innerHTML = `<pre class="error-output">Error: ${error}</pre>`;
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
        button.addEventListener("click", function(event) {
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
    text = text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');
               
    text = text.replace(/error:/gi, '<span class="error-text">error:</span>');
    text = text.replace(/warning:/gi, '<span class="warning-text">warning:</span>');
    
    text = text.replace(/(allocs|freed|frees|leaks|bytes|blocks)/g, '<span class="memory-text">$1</span>');
    
    text = text.replace(/(\w+\.[ch](?:pp)?):(\d+):/g, '<span class="file-path">$1</span>:<span class="line-number">$2</span>:');
    
    return text;
}