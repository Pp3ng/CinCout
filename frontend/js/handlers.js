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

// WebSocket and terminal variables - add at the top of the file
let socket;
let terminal;
let fitAddon;
let isCompiling = false;
let isRunning = false;
let sessionId;
let lastInput = '';

// Initialize WebSocket connection
function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    socket = new WebSocket(`${protocol}//${host}`);
    
    socket.onopen = () => {
        console.log('WebSocket connection established');
        updateStatus('Ready');
    };
    
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
            case 'connected':
                sessionId = data.sessionId;
                break;
                
            case 'compiling':
                isCompiling = true;
                isRunning = false;
                updateStatus('Compiling...');
                document.getElementById("output").innerHTML = '<div class="loading">Compiling</div>';
                break;
                
            case 'compile-error':
                isCompiling = false;
                isRunning = false;
                updateStatus('Compilation Error');
                document.getElementById("output").innerHTML = 
                    `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">${formatOutput(data.output)}</div>`;
                break;
                
            case 'compile-success':
                isCompiling = false;
                isRunning = true;
                updateStatus('Running');
                // Create terminal interface
                setupTerminal();
                break;
                
            case 'output':
                if (terminal) {
                    // Filter out outputs that match the last input to prevent duplication
                    if (lastInput && (
                        data.output === lastInput ||
                        data.output === lastInput + '\r' ||
                        data.output === lastInput + '\n' ||
                        data.output === lastInput + '\r\n'
                    )) {
                        lastInput = ''; // Clear the processed last input
                        return;
                    }
                    terminal.write(data.output);
                }
                break;
                
            case 'error':
                if (terminal) {
                    terminal.write(`\x1b[31m${data.output}\x1b[0m`);
                }
                break;
                
            case 'exit':
                isRunning = false;
                updateStatus('Completed');
                if (terminal) {
                    terminal.write(`\r\n\x1b[90m[Program exited with code: ${data.code}]\x1b[0m\r\n`);
                }
                break;
        }
    };
    
    socket.onclose = () => {
        console.log('WebSocket connection closed');
        updateStatus('Disconnected');
        setTimeout(() => {
            initWebSocket(); // Try to reconnect
        }, 3000);
    };
    
    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateStatus('Connection Error');
    };
}

// Update status display
function updateStatus(status) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

// Set up terminal interface
function setupTerminal() {
    document.getElementById("output").innerHTML = '<div id="terminal-container" class="terminal-container"></div>';
    
    // Make sure to get the correct theme first
    const currentTheme = window.getTerminalTheme ? window.getTerminalTheme() : {};
    console.log('Setting up terminal with theme:', currentTheme);
    
    // Create terminal instance
    terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        theme: currentTheme,
        allowTransparency: true,
        rendererType: 'dom'
    });
    
    // Create fit addon to make terminal adapt to container size
    fitAddon = new FitAddon.FitAddon();
    terminal.loadAddon(fitAddon);
    
    // Open terminal in container and resize
    terminal.open(document.getElementById('terminal-container'));
    
    // Ensure theme is applied and resize
    setTimeout(() => {
        if (fitAddon) fitAddon.fit();
        // Force terminal redraw to apply new theme
        terminal.refresh(0, terminal.rows - 1);
        console.log('Terminal setup complete');
    }, 50);
    
    // Track user input
    let lineBuffer = '';
    
    // Handle terminal input
    terminal.onData(data => {
        if (!isRunning || !socket || socket.readyState !== WebSocket.OPEN) {
            return;
        }

        // Handle Enter key
        if (data === '\r') {
            lastInput = lineBuffer; // Record the last sent input
            terminal.write('\r\n');
            socket.send(JSON.stringify({
                type: 'input',
                input: lineBuffer
            }));
            lineBuffer = '';
            return;
        }
        
        // Handle Backspace key
        if (data === '\b' || data === '\x7f') {
            if (lineBuffer.length > 0) {
                lineBuffer = lineBuffer.substring(0, lineBuffer.length - 1);
                terminal.write('\b \b'); // Erase character on screen
            }
            return;
        }
        
        // Handle regular characters
        if (data >= ' ' && data <= '~') {
            lineBuffer += data;
            terminal.write(data); // Echo character locally
        }
    });
    
    // Focus terminal
    setTimeout(() => terminal.focus(), 100);
    
    // Listen for window resize events
    window.addEventListener('resize', () => {
        if (fitAddon) fitAddon.fit();
    });
}

// Store the original compile button handler
const originalCompileHandler = document.getElementById("compile").onclick;

// Replace with WebSocket-enabled handler
document.getElementById("compile").onclick = function() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        // Fall back to original HTTP-based handler if WebSocket not available
        return originalCompileHandler.call(this);
    }
    
    // If already compiling, don't do anything
    if (isCompiling) {
        return;
    }
    
    const code = editor.getValue();
    const lang = document.getElementById("language").value;
    const compiler = document.getElementById("compiler").value;
    const optimization = document.getElementById("optimization").value;
    
    document.getElementById("outputTab").click();
    
    // Send compile request via WebSocket
    socket.send(JSON.stringify({
        type: 'compile',
        code: code,
        lang: lang,
        compiler: compiler,
        optimization: optimization
    }));
};

// Add theme change listener to update terminal theme
document.getElementById('theme-select').addEventListener('change', function() {
    if (terminal) {
        setTimeout(() => {
            const newTheme = window.getTerminalTheme ? window.getTerminalTheme() : {};
            console.log('Theme changed, applying terminal theme:', newTheme);
            
            // Update terminal theme
            terminal.setOption('theme', newTheme);
            
            // force terminal redraw to apply new theme
            terminal.refresh(0, terminal.rows - 1);
        }, 50); // Delay to allow theme change to propagate
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Add status indicator to right panel
    const panelHeader = document.querySelectorAll('.panel-header')[1];
    if (panelHeader) {
        const buttonContainer = panelHeader.querySelector('.button-container');
        if (buttonContainer) {
            // Create status element
            const statusEl = document.createElement('div');
            statusEl.className = 'status-indicator';
            statusEl.innerHTML = 'Status: <span id="connection-status">Connecting...</span>';
            
            // Add status element to button container
            buttonContainer.appendChild(statusEl);
        }
    }
    
    // Initialize WebSocket
    initWebSocket();
});

//Memcheck button click handler
document.getElementById("memcheck").onclick = function () {
    const code = editor.getValue();
    const lang = document.getElementById("language").value;
    const compiler = document.getElementById("compiler").value;
    const optimization = document.getElementById("optimization").value;

    document.getElementById("outputTab").click();
    document.getElementById("output").innerHTML = "<div class='loading'>Running memory check...</div>";

    fetch('/api/memcheck', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            code: code,
            lang: lang,
            compiler: compiler,
            optimization: optimization
        })
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

    fetch('/api/format', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            code: code,
            lang: lang
        })
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

    //Get assembly div and its CodeMirror container
    const assemblyDiv = document.getElementById("assembly");
    const cmContainer = assemblyDiv.querySelector('.CodeMirror');

    // Insert loadingDiv before cmcontainer
    assemblyDiv.insertBefore(loadingDiv, cmContainer);
    assemblyView.setValue('');

    fetch('/api/compile', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            code: code,
            lang: lang,
            compiler: compiler,
            optimization: optimization,
            action: 'assembly'
        })
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

    fetch('/api/styleCheck', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            code: code,
            lang: lang
        })
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