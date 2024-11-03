<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Web C/C++ Editor</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/nord.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/clike/clike.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/gas/gas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/keymap/vim.min.js"></script>
    <style>
        :root {
            --bg-primary: #2e3440;
            --bg-secondary: #3b4252;
            --text-primary: #eceff4;
            --text-secondary: #d8dee9;
            --accent: #5e81ac;
            --accent-hover: #81a1c1;
            --border: #4c566a;
        }

        body {
            margin: 0;
            padding: 20px;
            background: var(--bg-primary);
            color: var(--text-primary);
            font-family: system-ui, -apple-system, sans-serif;
        }

        .container {
            max-width: 1600px;
            margin: 0 auto;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            background: var(--bg-secondary);
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .github-icon {
            width: 32px;
            height: 32px;
            transition: opacity 0.3s;
        }

        .github-icon:hover {
            opacity: 0.8;
        }

        .controls {
            display: flex;
            gap: 15px;
            align-items: center;
        }

        .editor-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
            gap: 20px;
            height: calc(100vh - 140px);
        }

        .panel {
            background: var(--bg-secondary);
            border-radius: 8px;
            padding: 15px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--border);
        }

        .CodeMirror {
            height: calc(100% - 50px);
            border-radius: 4px;
            font-size: 14px;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
        }

        .button-container {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }

        button {
            background: var(--accent);
            color: var(--text-primary);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        button:hover {
            background: var(--accent-hover);
            transform: translateY(-1px);
        }

        button:active {
            transform: translateY(0);
        }

        button svg {
            width: 16px;
            height: 16px;
        }

        select {
            background: var(--bg-primary);
            color: var(--text-primary);
            border: 1px solid var(--border);
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
        }

        .toggle-container {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 24px;
        }

        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: var(--border);
            transition: .4s;
            border-radius: 24px;
        }

        .slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 4px;
            bottom: 4px;
            background-color: var(--text-primary);
            transition: .4s;
            border-radius: 50%;
        }

        input:checked + .slider {
            background-color: var(--accent);
        }

        input:checked + .slider:before {
            transform: translateX(26px);
        }

        #output, #assembly {
            background: var(--bg-primary);
            padding: 15px;
            border-radius: 4px;
            font-family: 'JetBrains Mono', monospace;
            white-space: pre-wrap;
            overflow-y: auto;
            flex-grow: 1;
            font-size: 14px;
            line-height: 1.5;
        }

        .output-controls {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }

        .tab-container {
            display: flex;
            gap: 10px;
        }

        .tab {
            padding: 6px 12px;
            background: var(--bg-primary);
            border: 1px solid var(--border);
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .tab.active {
            background: var(--accent);
            border-color: var(--accent);
        }

        @media (max-width: 1200px) {
            .editor-container {
                grid-template-columns: 1fr;
                height: auto;
            }
            
            .panel {
                height: 500px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Web C/C++ Editor</h1>
            <div class="controls">
                <select id="language">
                    <option value="c">C</option>
                    <option value="cpp">C++</option>
                </select>
                <div class="toggle-container">
                    <span>Vim Mode</span>
                    <label class="toggle-switch">
                        <input type="checkbox" id="vimMode">
                        <span class="slider"></span>
                    </label>
                </div>
                <a href="https://github.com/Pp3ng/webCpp" target="_blank">
                <img src="https://github.com/fluidicon.png" alt="GitHub" class="github-icon">
                </a>
            </div>
        </div>
        <div class="editor-container">
            <div class="panel">
                <div class="panel-header">
                    <h3>Code Editor</h3>
                    <div class="button-container">
                        <button id="compile">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M5 15l7-7 7 7"/>
                            </svg>
                            Compile & Run
                        </button>
                        <button id="viewAssembly">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 4v16m-8-8h16"/>
                            </svg>
                            View Assembly
                        </button>
                    </div>
                </div>
                <textarea id="code">#include <stdio.h>

int main() {
    printf("Hello, World!\n");
    return 0;
}</textarea>
            </div>
            <div class="panel">
                <div class="panel-header">
                    <div class="tab-container">
                        <div class="tab active" data-tab="output">Output</div>
                        <div class="tab" data-tab="assembly">Assembly</div>
                    </div>
                    <button id="clear">Clear</button>
                </div>
                <div id="output" style="display: block;">// Program output will appear here</div>
                <div id="assembly" style="display: none;"></div>
            </div>
        </div>
    </div>

    <script>
        // Initialize CodeMirror for source code
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

        // Initialize CodeMirror for assembly view
        let assemblyView = CodeMirror(document.getElementById("assembly"), {
            lineNumbers: true,
            mode: "gas",
            theme: "nord",
            readOnly: true,
            lineWrapping: true
        });

        // Handle Vim mode toggle
        document.getElementById("vimMode").addEventListener("change", function(e) {
            editor.setOption("keyMap", e.target.checked ? "vim" : "default");
        });

        // Handle language change
        document.getElementById("language").addEventListener("change", function(e) {
            const lang = e.target.value;
            if (lang === "cpp") {
                editor.setValue("#include <iostream>\n\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}");
            } else {
                                   editor.setValue("#include <stdio.h>\n\nint main() {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}");
            }
        });

        // Handle output/assembly tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', function() {
                // Update active tab
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');

                // Show corresponding content
                const tabName = this.dataset.tab;
                document.getElementById('output').style.display = tabName === 'output' ? 'block' : 'none';
                document.getElementById('assembly').style.display = tabName === 'assembly' ? 'block' : 'none';
            });
        });

        // Compile and run code
        document.getElementById("compile").onclick = function() {
            const code = editor.getValue();
            const lang = document.getElementById("language").value;
            const output = document.getElementById("output");

            // Show output tab
            document.querySelector('[data-tab="output"]').click();
            output.textContent = "Compiling...";

            fetch('compile.jsp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'code=' + encodeURIComponent(code) +
                      '&lang=' + encodeURIComponent(lang) +
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

        // View assembly code
        document.getElementById("viewAssembly").onclick = function() {
            const code = editor.getValue();
            const lang = document.getElementById("language").value;

            // Show assembly tab
            document.querySelector('[data-tab="assembly"]').click();
            assemblyView.setValue("Generating assembly code...");

            fetch('compile.jsp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'code=' + encodeURIComponent(code) +
                      '&lang=' + encodeURIComponent(lang) +
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

        // Handle clear button
        document.getElementById("clear").onclick = function() {
            // Clear both output and assembly views
            document.getElementById("output").textContent = "// Program output will appear here";
            assemblyView.setValue("");
        };

        // Add keyboard shortcuts
        document.addEventListener('keydown', function(e) {
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
            if ((e.ctrlKey || e.metaKey) && e.key === 'L') {
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
    
            // Ctrl+O or Cmd+O to open code
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                 e.preventDefault();
                 const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.c,.cpp';
                input.onchange = function() {
                    const file = this.files[0];
                    const reader = new FileReader();
                    reader.onload = function() {
                        editor.setValue(reader.result);
                    };
                    reader.readAsText(file);
                };
                input.click();
            }
        });

        // Handle window resize
        window.addEventListener('resize', function() {
            editor.refresh();
            assemblyView.refresh();
        });

        // Add some example templates
        const templates = {
            c: {
                "Hello World": `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`,
                "Array Sum": `#include <stdio.h>

int main() {
    int arr[] = {1, 2, 3, 4, 5};
    int sum = 0;

    for(int i = 0; i < 5; i++) {
        sum += arr[i];
    }

    printf("Sum: %d\\n", sum);
    return 0;
}`,
                "Recursion": `#include <stdio.h>

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    int n = 5;
    printf("Factorial of %d is %d\\n", n, factorial(n));
    return 0;
}`
            },
            cpp: {
                "Hello World": `#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}`,
                "Vector Operations": `#include <iostream>
#include <vector>

int main() {
    std::vector<int> nums {1, 2, 3, 4, 5};
    int sum = 0;

    for(const auto& num : nums) {
        sum += num;
    }

    std::cout << "Sum: " << sum << std::endl;
    return 0;
}`,
                "Classes": `#include <iostream>
#include <string>

class Person {
private:
    std::string name;
    int age;

public:
    Person(std::string n, int a) : name(n), age(a) {}

    void introduce() {
        std::cout << "I am " << name << ", " << age << " years old." << std::endl;
    }
};

int main() {
    Person person("Alice", 25);
    person.introduce();
    return 0;
}`
            }
        };

        // Function to update template menu
        function updateTemplates() {
            const lang = document.getElementById("language").value;
            const templateSelect = document.getElementById("template");
            templateSelect.innerHTML = '';

            for (const [name, code] of Object.entries(templates[lang])) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                templateSelect.appendChild(option);
            }
        }

        // Initial template setup
        updateTemplates();
    </script>
</body>
</html>
