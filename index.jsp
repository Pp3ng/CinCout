<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <title>Web C/C++</title>
    <!-- CodeMirror core styles -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.css">
    <!-- Themes -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/nord.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/dracula.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/monokai.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/material.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/ayu-dark.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/gruvbox-dark.min.css">
    <link rel="icon" type="image/png"
        href="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg">

    <!-- CodeMirror core and plugins -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/clike/clike.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/gas/gas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/keymap/vim.min.js"></script>

    <style>
        /* Root CSS variables for theme colors */
        :root {
            --bg-primary: #2e3440;
            --bg-secondary: #3b4252;
            --text-primary: #eceff4;
            --text-secondary: #d8dee9;
            --accent: #5e81ac;
            --accent-hover: #81a1c1;
            --border: #4c566a;
        }

        /* Base body styles */
        body {
            margin: 0;
            padding: 20px;
            background: var(--bg-primary);
            color: var(--text-primary);
            font-family: system-ui, -apple-system, sans-serif;
        }

        /* Main container */
        .container {
            max-width: 1600px;
            margin: 0 auto;
        }

        /* Header styles */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            background: var(--bg-secondary);
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        /* GitHub icon styles */
        .github-icon {
            width: 32px;
            height: 32px;
            transition: opacity 0.3s;
        }

        .github-icon:hover {
            opacity: 0.8;
        }

        /* Controls container */
        .controls {
            display: flex;
            gap: 15px;
            align-items: center;
            height: 32px;
        }

        /* Editor layout */
        .editor-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            height: calc(100vh - 140px);
            min-height: 500px;
        }

        /* Panel styles */
        .panel {
            background: var(--bg-secondary);
            border-radius: 8px;
            padding: 15px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            height: 100%;
            max-height: calc(100vh - 140px);
            overflow: hidden;
        }

        /* Panel header styles */
        .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            height: 40px;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--border);
        }

        /* Panel title styles */
        .panel-title {
            font-size: 16px;
            font-weight: bold;
            margin: 0;
            line-height: 32px;
            height: 32px;
        }

        /* CodeMirror editor styles */
        .CodeMirror {
            height: calc(100% - 60px);
            border-radius: 4px;
            font-size: 14px;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            overflow-y: hidden;
        }

        /* Button container styles */
        .button-container {
            display: flex;
            gap: 10px;
            align-items: center;
            height: 32px;
        }

        /* Button styles */
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
            height: 32px;
            white-space: nowrap;
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

        /* Select dropdown styles */
        select {
            background: var(--bg-primary);
            color: var(--text-primary);
            border: 1px solid var(--border);
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            min-width: 120px;
            height: 32px;
        }

        /* Toggle container styles */
        .toggle-container {
            display: flex;
            align-items: center;
            gap: 8px;
            height: 32px;
        }

        /* Toggle switch styles */
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

        /* Toggle slider styles */
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

        input:checked+.slider {
            background-color: var(--accent);
        }

        input:checked+.slider:before {
            transform: translateX(26px);
        }

        /* Output and assembly view styles */
        #output,
        #assembly {
            background: var(--bg-primary);
            padding: 15px;
            border-radius: 4px;
            font-family: 'JetBrains Mono', monospace;
            white-space: pre-wrap;
            flex: 1;
            font-size: 14px;
            overflow: auto;
        }

        /* Active button state */
        button.active {
            background-color: var(--accent-hover);
        }

        /* Responsive design */
        @media (max-width: 1200px) {
            .editor-container {
                grid-template-columns: 1fr;
                height: auto;
                min-height: unset;
            }

            .panel {
                min-height: 500px;
            }
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <h1>Web C/C++</h1>
            <div class="controls">
                <select id="language">
                    <option value="c">C</option>
                    <option value="cpp">C++</option>
                </select>
                <select id="template"></select>
                <select id="theme-select">
                    <option value="nord">Nord</option>
                    <option value="dracula">Dracula</option>
                    <option value="monokai">Monokai</option>
                    <option value="material">Material</option>
                    <option value="ayu-dark">Ayu Dark</option>
                    <option value="gruvbox-dark">Gruvbox Dark</option>
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
                    <div class="panel-title">Code Editor</div>
                    <div class="button-container">
                        <button id="compile">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M5 15l7-7 7 7" />
                            </svg>
                            Compile & Run
                        </button>
                        <button id="format">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 5l7 7-7 7M5 12h14" />
                            </svg>
                            Format
                        </button>
                        <button id="viewAssembly">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 4v16m-8-8h16" />
                            </svg>
                            View Assembly
                        </button>
                    </div>
                </div>
                <textarea id="code"></textarea>
            </div>
            <div class="panel">
                <div class="panel-header">
                    <div class="button-container">
                        <button id="outputTab" class="active">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 5l7 7-7 7M5 12h14" />
                            </svg>
                            Output
                        </button>
                        <button id="assemblyTab">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 4v16m-8-8h16" />
                            </svg>
                            Assembly
                        </button>
                    </div>
                    <button id="clear">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 6v14H5V6M4 6h16M10 11v6M14 11v6" />
                        </svg>
                        Clear
                    </button>
                </div>
                <div id="output" style="display: block;">// Program output will appear here</div>
                <div id="assembly" style="display: none;"></div>
            </div>
        </div>
    </div>

    <script>
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

        const templates = {
            c: {
                "Hello World": `#include <stdio.h>

int main(int argc, const char *argv[]) {
    printf("Hello, World!\\n");
    return 0;
}`,
                "Array Sum": `#include <stdio.h>

int main(int argc, const char *argv[]) {
    int arr[] = {1, 2, 3, 4, 5};
    int sum = 0;

    for(int i = 0; i < 5; i++) {
        sum += arr[i];
    }

    printf("Sum: %d\\n", sum);
    return 0;
}`,
                "Recursion Factorial": `#include <stdio.h>

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main(int argc, const char *argv[]) {
    int n = 5;
    printf("Factorial of %d is %d\\n", n, factorial(n));
    return 0;
}`,
                "Dynamic Array": `#include <stdio.h>
#include <stdlib.h>

int main(int argc, const char *argv[]) {
    int n = 5;
    int *arr = malloc(n * sizeof(int));
    int sum = 0;

    for(int i = 0; i < n; i++) {
        arr[i] = i + 1; // Initialize array
        sum += arr[i];
    }

    printf("Sum: %d\\n", sum);
    free(arr); // Free allocated memory
    return 0;
}`,
                "Fork": `#include <stdio.h>
#include <unistd.h>

int main(int argc, const char *argv[]) {
    pid_t pid = fork();

    if (pid < 0) {
        perror("Fork failed");
        return 1;
    } else if (pid == 0) {
        // Child process
        printf("Hello from child process!\\n");
    } else {
        // Parent process
        printf("Hello from parent process!\\n");
    }

    return 0;
}`,
                "Sleep": `#include <stdio.h>
#include <unistd.h>

int main(int argc, const char *argv[]) {
    printf("Sleeping for 3 seconds...\\n");
    sleep(3);
    printf("Awake now!\\n");
    return 0;
}`,
                "String Copy": `#include <stdio.h>
#include <string.h>

int main(int argc, const char *argv[]) {
    char source[] = "Hello, World!";
    char destination[50];
    strcpy(destination, source);
    printf("Copied string: %s\\n", destination);
    return 0;
}`,
                "Pointer Arithmetic": `#include <stdio.h>

int main(int argc, const char *argv[]) {
    int arr[] = {10, 20, 30, 40, 50};
    int *ptr = arr;

    printf("Second element: %d\\n", *(ptr + 1)); // Pointer arithmetic
    return 0;
}`,
                "Swap Function": `#include <stdio.h>

void swap(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

int main(int argc, const char *argv[]) {
    int x = 5, y = 10;
    swap(&x, &y);
    printf("After swap: x = %d, y = %d\\n", x, y);
    return 0;
}`
            },
            cpp: {
                "Hello World": `#include <iostream>

int main(int argc, const char *argv[]) {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}`,
                "Array Sum": `#include <iostream>

int main(int argc, const char *argv[]) {
    int arr[] = {1, 2, 3, 4, 5};
    int sum = 0;

    for(int i = 0; i < 5; i++) {
        sum += arr[i];
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

int main(int argc, const char *argv[]) {
    Person person("Alice", 25);
    person.introduce();
    return 0;
}`,
                "Basic Pointer": `#include <iostream>

int main(int argc, const char *argv[]) {
    int value = 42;
    int* ptr = &value;

    std::cout << "Value: " << value << ", Pointer points to: " << *ptr << std::endl;
    return 0;
}`,
                "Sorting with Array": `#include <iostream>
#include <algorithm>

int main(int argc, const char *argv[]) {
    int arr[] = {5, 2, 8, 1, 4};
    int n = sizeof(arr) / sizeof(arr[0]);

    std::sort(arr, arr + n);

    std::cout << "Sorted numbers: ";
    for (int i = 0; i < n; i++) {
        std::cout << arr[i] << " ";
    }
    std::cout << std::endl;
    return 0;
}`,
                "Template Function": `#include <iostream>

template<typename T>
T add(T a, T b) {
    return a + b;
}

int 

    std::cout << "Sum of 5.5 and 4.5: " << add(5.5, 4.5) << std::endl;
    return 0;
}`,
                "String Manipulation": `#include <iostream>
#include <cstring>

int main(int argc, const char *argv[]) {
    const char* str = "Hello, World!";
    char copy[20];
    strcpy(copy, str);

    std::cout << "Copied string: " << copy << std::endl;
    return 0;
}`,
                "Polymorphism": `#include <iostream>

class Animal {
public:
    virtual void speak() const {
        std::cout << "Animal speaks!" << std::endl;
    }
};

class Dog : public Animal {
public:
    void speak() const override {
        std::cout << "Woof! Woof!" << std::endl;
    }
};

int main(int argc, const char *argv[]) {
    Animal* animal = new Dog();
    animal->speak(); // Triggers Dog's speak() due to polymorphism
    delete[] animal;
    return 0;
}`,
                "Lambda Function": `#include <iostream>
#include <vector>
#include <algorithm>

int main(int argc, const char *argv[]) {
    std::vector<int> nums = {1, 2, 3, 4, 5};
    std::for_each(nums.begin(), nums.end(), [](int n) {
        std::cout << n * n << " ";
    });
    std::cout << std::endl;
    return 0;
}`,
                "Smart Pointers": `#include <iostream>
#include <memory>

class Resource {
public:
    Resource() { std::cout << "Resource acquired\\n"; }
    ~Resource() { std::cout << "Resource released\\n"; }
    void sayHello() const { std::cout << "Hello from Resource\\n"; }
};

int main(int argc, const char *argv[]) {
    std::unique_ptr<Resource> res1 = std::make_unique<Resource>();
    res1->sayHello();
    return 0;
}`
            }
        };


        function updateTemplates() {
            const lang = document.getElementById("language").value;
            const templateSelect = document.getElementById("template");
            templateSelect.innerHTML = ''; // Clear existing options

            // Add template options based on current language
            for (const name in templates[lang]) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                templateSelect.appendChild(option);
            }
        }

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
            const output = document.getElementById("output");

            document.getElementById("outputTab").click();
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

        document.getElementById("format").onclick = function () {
            const code = editor.getValue();
            const cursor = editor.getCursor();

            const lang = document.getElementById("language").value;

            fetch('format.jsp', {
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

            document.getElementById("assemblyTab").click();
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

        // Clear button click handler
        document.getElementById("clear").onclick = function () {
            document.getElementById("output").textContent = "// Program output will appear here";
            assemblyView.setValue("");
        };

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
                const blob = new Blob([code], { type: 'text/plain' });
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
        });

        // Handle window resize
        window.addEventListener('resize', function () {
            editor.refresh();
            assemblyView.refresh();
        });

        // Initialize editor with default template
        updateTemplates();
        document.getElementById("template").value = "Hello World";
        editor.setValue(templates[document.getElementById("language").value]["Hello World"]);

        const themes = {
            "nord": {
                name: "Nord",
                bg: "#2e3440",
                bgSecondary: "#3b4252",
                text: "#eceff4",
                textSecondary: "#d8dee9",
                accent: "#5e81ac",
                accentHover: "#81a1c1",
                border: "#4c566a",
                cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/nord.min.css"
            },
            "dracula": {
                name: "Dracula",
                bg: "#282a36",
                bgSecondary: "#44475a",
                text: "#f8f8f2",
                textSecondary: "#6272a4",
                accent: "#bd93f9",
                accentHover: "#ff79c6",
                border: "#6272a4",
                cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/dracula.min.css"
            },
            "monokai": {
                name: "Monokai",
                bg: "#272822",
                bgSecondary: "#3e3d32",
                text: "#f8f8f2",
                textSecondary: "#75715e",
                accent: "#a6e22e",
                accentHover: "#f92672",
                border: "#49483e",
                cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/monokai.min.css"
            },
            "material": {
                name: "Material",
                bg: "#263238",
                bgSecondary: "#37474f",
                text: "#eeffff",
                textSecondary: "#b0bec5",
                accent: "#89ddff",
                accentHover: "#80cbc4",
                border: "#546e7a",
                cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/material.min.css"
            },
            "ayu-dark": {
                name: "Ayu Dark",
                bg: "#0a0e14",
                bgSecondary: "#1f2430",
                text: "#e6e1cf",
                textSecondary: "#b3b1ad",
                accent: "#ffb454",
                accentHover: "#ff8f40",
                border: "#11151c",
                cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/ayu-dark.min.css"
            },
            "gruvbox-dark": {
                name: "Gruvbox Dark",
                bg: "#282828",
                bgSecondary: "#3c3836",
                text: "#ebdbb2",
                textSecondary: "#a89984",
                accent: "#b8bb26",
                accentHover: "#98971a",
                border: "#504945",
                cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/gruvbox-dark.min.css"
            }
        };

        // Load theme CSS from CDN
        function loadThemeCSS(theme) {
            const existingLink = document.querySelector(`link[href="${theme.cdnUrl}"]`);
            if (!existingLink) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = theme.cdnUrl;
                document.head.appendChild(link);
            }
        }

        function applyTheme(themeName) {
            const theme = themes[themeName];
            if (!theme) return;

            loadThemeCSS(theme);

            document.documentElement.style.setProperty('--bg-primary', theme.bg);
            document.documentElement.style.setProperty('--bg-secondary', theme.bgSecondary);
            document.documentElement.style.setProperty('--text-primary', theme.text);
            document.documentElement.style.setProperty('--text-secondary', theme.textSecondary);
            document.documentElement.style.setProperty('--accent', theme.accent);
            document.documentElement.style.setProperty('--accent-hover', theme.accentHover);
            document.documentElement.style.setProperty('--border', theme.border);

            editor.setOption('theme', themeName);
            assemblyView.setOption('theme', themeName);

            localStorage.setItem('preferred-theme', themeName);
        }

        function initializeThemeSelector() {
            const themeSelect = document.getElementById('theme-select');

            themeSelect.innerHTML = '';

            Object.keys(themes).forEach(themeKey => {
                const option = document.createElement('option');
                option.value = themeKey;
                option.textContent = themes[themeKey].name;
                themeSelect.appendChild(option);
            });

            const savedTheme = localStorage.getItem('preferred-theme') || 'nord';
            themeSelect.value = savedTheme;

            applyTheme(savedTheme);

            themeSelect.addEventListener('change', (e) => {
                applyTheme(e.target.value);
            });
        }

        document.addEventListener('DOMContentLoaded', function () {
            Object.values(themes).forEach(theme => {
                loadThemeCSS(theme);
            });

            initializeThemeSelector();
        });
    </script>
</body>

</html>