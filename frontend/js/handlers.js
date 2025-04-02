// Module pattern for better organization
const WebCppUI = (function() {
  // Private variables
  let terminal;
  window.fitAddon = null; // Make fitAddon global for layout.js
  let isCompiling = false;
  let isRunning = false;
  
  // DOM element cache for performance
  const domElements = {
    template: document.getElementById("template"),
    vimMode: document.getElementById("vimMode"),
    language: document.getElementById("language"),
    outputTab: document.getElementById("outputTab"),
    assemblyTab: document.getElementById("assemblyTab"),
    output: document.getElementById("output"),
    assembly: document.getElementById("assembly"),
    compile: document.getElementById("compile"),
    memcheck: document.getElementById("memcheck"),
    format: document.getElementById("format"),
    viewAssembly: document.getElementById("viewAssembly"),
    styleCheck: document.getElementById("styleCheck"),
    clear: document.getElementById("clear"),
    themeSelect: document.getElementById("theme-select"),
    outputPanel: document.getElementById("outputPanel"),
    closeOutput: document.getElementById("closeOutput")
  };
  
  /**
   * Handle incoming WebSocket messages
   * @param {MessageEvent} event - The WebSocket message event
   */
  function handleWebSocketMessage(event) {
    const data = JSON.parse(event.data);
    
    switch(data.type) {
      case 'pong':
        // Received pong from server, connection is alive
        break;
        
      case 'connected':
        WebCppSocket.setSessionId(data.sessionId);
        console.log(`Connected with session ID: ${WebCppSocket.getSessionId()}`);
        break;
        
      case 'compiling':
        isCompiling = true;
        isRunning = false;
        updateStatus('Compiling...');
        
        // Make sure the output panel is visible
        domElements.outputPanel.style.display = 'flex';
        document.querySelector('.editor-panel').classList.add('with-output');
        domElements.outputTab.click();
        
        domElements.output.innerHTML = '<div class="loading">Compiling</div>';
        
        // Refresh editor after layout change
        if (window.editor) {
          setTimeout(() => window.editor.refresh(), 10);
        }
        break;
        
      case 'compile-error':
        isCompiling = false;
        isRunning = false;
        updateStatus('Compilation Error');
        // The output is already formatted by the backend
        domElements.output.innerHTML = 
          `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">${data.output}</div>`;
        break;
        
      case 'compile-success':
        isCompiling = false;
        isRunning = true;
        updateStatus('Running');
        
        // Clear any previous terminal instance to prevent double execution
        if (terminal) {
          try {
            terminal.dispose();
          } catch (e) {
            console.error('Error disposing terminal:', e);
          }
          terminal = null;
        }
        
        // Make sure the output panel is visible
        domElements.outputPanel.style.display = 'flex';
        document.querySelector('.editor-panel').classList.add('with-output');
        domElements.outputTab.click();
        
        // Create terminal interface
        setupTerminal();
        
        // Refresh editor after layout change
        if (window.editor) {
          setTimeout(() => window.editor.refresh(), 10);
        }
        break;
        
      case 'output':
        if (terminal) {
          // Directly write the content received from the server, no filtering needed
          // PTY already handles echo correctly
          terminal.write(data.output);
        }
        break;
        
      case 'error':
        console.error('Received error from server:', data.output || data.message);
        if (terminal) {
          terminal.write(`\x1b[31m${data.output || data.message}\x1b[0m`);
        }
        break;
        
      case 'exit':
        isRunning = false;
        updateStatus('Completed');
        console.log(`Program exited with code: ${data.code}`);
        
        if (terminal) {
          terminal.write(`\r\n\x1b[90m[Program exited with code: ${data.code}]\x1b[0m\r\n`);
        }
        break;
        
      case 'cleanup-complete':
        break;
        
      case 'session_restored':
        // Handle session restoration
        console.log('Session restored:', data.message);
        // Reset the status
        isRunning = true;
        updateStatus('Session Restored');
        
        // If terminal doesn't exist, need to recreate it
        if (!terminal) {
          setupTerminal();
        }
        break;
        
      default:
        console.log(`Unknown message type: ${data.type}`);
    }
  }
  
  /**
   * Update status display
   * @param {string} status - Status text to display
   */
  function updateStatus(status) {
    console.log(`Status updated: ${status}`);
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      statusElement.textContent = status;
    }
  }
  
  /**
   * Set up terminal interface
   */
  function setupTerminal() {
    
    // Clear previous content
    domElements.output.innerHTML = '<div id="terminal-container" class="terminal-container"></div>';
    
    // Make sure to get the correct theme first
    const currentTheme = window.getTerminalTheme ? window.getTerminalTheme() : {};
    
    // Create terminal instance
    terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      theme: currentTheme,
      allowTransparency: true,
      rendererType: 'dom',
      convertEol: true, // Ensure line ending conversion
      // Add custom key handling to prevent terminal from capturing Escape key
      customKeyEventHandler: (event) => {
        // Pass through all non-Escape key events to terminal
        if (event.key !== 'Escape') {
          return true;
        }
        
        // Don't let terminal handle Escape key
        // Our global document listener will handle it
        if (event.type === 'keydown' && event.key === 'Escape') {
          return false;
        }
        
        return true;
      }
    });
    
    // Create fit addon to make terminal adapt to container size
    window.fitAddon = new FitAddon.FitAddon();
    terminal.loadAddon(window.fitAddon);
    
    // Open terminal in container and resize
    const terminalContainer = document.getElementById('terminal-container');
    if (!terminalContainer) {
      console.error('Terminal container not found');
      return;
    }
    
    terminal.open(terminalContainer);
    
    // Ensure theme is applied and resize
    setTimeout(() => {
      if (window.fitAddon) {
        try {
          window.fitAddon.fit();
          // Send the adjusted size to the server
          if (WebCppSocket.isConnected() && isRunning) {
            WebCppSocket.sendData({
              type: 'resize',
              cols: terminal.cols,
              rows: terminal.rows
            });
          }
        } catch (e) {
          console.error('Error fitting terminal:', e);
        }
      }
      
      // Force terminal redraw to apply new theme
      try {
        terminal.refresh(0, terminal.rows - 1);
      } catch (e) {
        console.error('Error refreshing terminal:', e);
      }
      
    }, 50);
    
    // Handle terminal input
    setupTerminalInput();
    
    // Focus terminal
    setTimeout(() => terminal.focus(), 100);
    
    // Listen for window resize events
    window.addEventListener('resize', () => {
      if (window.fitAddon) {
        try {
          window.fitAddon.fit();
        } catch (e) {
          console.error('Error fitting terminal on resize:', e);
        }
      }
    });

    // After terminal is opened, send size information to the server
    terminal.onResize(({ cols, rows }) => {
      if (WebCppSocket.isConnected() && isRunning) {
        WebCppSocket.sendData({
          type: 'resize',
          cols: cols,
          rows: rows
        });
      }
    });
  }
  
  /**
   * Set up terminal input handling
   */
  function setupTerminalInput() {
    // Simplified terminal input handling, letting backend handle echo
    terminal.onData(data => {
      if (!isRunning || !WebCppSocket.isConnected()) {
        console.log('Not sending terminal input: program not running or socket closed');
        return;
      }

      // Send all input characters to the server for PTY to handle
      WebCppSocket.sendData({
        type: 'input',
        input: data
      });
    });
  }
  
  /**
   * Initialize event handlers
   */
  function initEventHandlers() {
    
    // Language change handler - must be added before template events
    domElements.language.addEventListener('change', function() {
      const lang = this.value;
      
      // Update available templates for the selected language
      if (typeof updateTemplates === 'function') {
        updateTemplates();
        
        // Set default template
        const templateSelect = document.getElementById('template');
        if (templateSelect) {
          templateSelect.value = 'Hello World';
          // Update editor with the selected template
          if (window.editor && templates && templates[lang] && templates[lang]['Hello World']) {
            window.editor.setValue(templates[lang]['Hello World']);
          }
        }
      }
    });
    
    // Template change handler
    if (domElements.template) {
      domElements.template.addEventListener('change', function() {
        const templateName = this.value;
        const lang = domElements.language.value;
        
        // Update editor with selected template
        if (window.editor && templates && templates[lang] && templates[lang][templateName]) {
          window.editor.setValue(templates[lang][templateName]);
        }
      });
    }
    
    // Compile button event
    domElements.compile.addEventListener('click', async function() {
      
      if (isCompiling || isRunning) {
        console.log('A process is already running, ignoring compile request');
        return;
      }
      
      const code = window.editor.getValue();
      const lang = domElements.language.value;
      const compiler = document.getElementById('compiler').value;
      const optimization = document.getElementById('optimization').value;
      
      console.log(`Compiling ${lang} code with ${compiler} (${optimization})`);
      
      if (code.trim() === '') {
        domElements.output.innerHTML = '<div class="error-output">Error: Code cannot be empty</div>';
        return;
      }
      
      try {
        await WebCppSocket.sendData({
          type: 'compile',
          code: code,
          lang: lang,
          compiler: compiler,
          optimization: optimization
        });
      } catch (error) {
        console.error('WebSocket connection failed:', error);
        domElements.output.innerHTML = '<div class="error-output">Error: WebSocket connection failed. Please try again.</div>';
        updateStatus('Connection Failed');
      }
    });
    
    // Close output panel event - send cleanup signal to backend
    domElements.closeOutput.addEventListener('click', async function() {
      
      try {
        const sessionId = WebCppSocket.getSessionId();
        if (sessionId) {
          console.log(`Sending cleanup request for session ${sessionId}`);
          // Send cleanup request to backend
          await WebCppSocket.sendData({
            action: 'cleanup',
            sessionId: sessionId
          });
          
          // Reset state
          isRunning = false;
          isCompiling = false;
        }
      } catch (error) {
        console.log('Failed to send cleanup request:', error);
      }
    });
    
    // View Assembly button click handler
    domElements.viewAssembly.addEventListener('click', function() {
      const code = window.editor.getValue();
      const lang = domElements.language.value;
      const compiler = document.getElementById("compiler").value;
      const optimization = document.getElementById("optimization").value;

      domElements.assemblyTab.click();

      // Create a loading div
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'loading';
      loadingDiv.textContent = 'Generating assembly code';

      // Get assembly div and its CodeMirror container
      const assemblyDiv = domElements.assembly;
      const cmContainer = assemblyDiv.querySelector('.CodeMirror');

      // Insert loadingDiv before cmcontainer
      if (cmContainer) {
        assemblyDiv.insertBefore(loadingDiv, cmContainer);
      } else {
        assemblyDiv.appendChild(loadingDiv);
      }
      
      if (window.assemblyView) {
        window.assemblyView.setValue('');
      }

      fetch('/api/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
        // Remove loading div
        if (loadingDiv.parentNode) {
          loadingDiv.parentNode.removeChild(loadingDiv);
        }
        
        const trimmedData = data.trim();
        if (window.assemblyView) {
          window.assemblyView.setValue(trimmedData);
        }
      })
      .catch(error => {
        // Remove loading div
        if (loadingDiv.parentNode) {
          loadingDiv.parentNode.removeChild(loadingDiv);
        }
        
        if (window.assemblyView) {
          window.assemblyView.setValue("Error: " + error);
        }
      });
    });

    // Memory check button click handler
    domElements.memcheck.addEventListener('click', function() {
      const code = window.editor.getValue();
      const lang = domElements.language.value;
      const compiler = document.getElementById("compiler").value;
      const optimization = document.getElementById("optimization").value;

      domElements.outputTab.click();
      domElements.output.innerHTML = "<div class='loading'>Running memory check...</div>";

      fetch('/api/memcheck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
        domElements.output.innerHTML = 
          `<div class="memcheck-output" style="white-space: pre-wrap; overflow: visible;">${data}</div>`;
      })
      .catch(error => {
        domElements.output.innerHTML = 
          `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Error: ${error}</div>`;
      });
    });

    // Format button click handler
    domElements.format.addEventListener('click', function() {
      const code = window.editor.getValue();
      const cursor = window.editor.getCursor();
      const lang = domElements.language.value;

      fetch('/api/format', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
        const scrollInfo = window.editor.getScrollInfo();
        window.editor.setValue(formattedData);
        window.editor.setCursor(cursor);
        window.editor.scrollTo(scrollInfo.left, scrollInfo.top);
        window.editor.refresh();
      })
      .catch(error => {
        console.error("Format error:", error);
      });
    });

    // Style check button click handler
    domElements.styleCheck.addEventListener('click', function() {
      const code = window.editor.getValue();
      const lang = domElements.language.value;

      domElements.outputTab.click();
      domElements.output.innerHTML = "<div class='loading'>Running style check...</div>";

      fetch('/api/styleCheck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
            // The line is already formatted by the backend
            return `<div class="style-block" style="white-space: pre-wrap; overflow: visible;">${line}</div>`;
          }
          return '';
        }).filter(line => line);

        domElements.output.innerHTML =
          `<div class="style-check-output" style="white-space: pre-wrap; overflow: visible;">${formattedLines.join('\n')}</div>`;
      })
      .catch(error => {
        domElements.output.innerHTML = `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Error: ${error}</div>`;
      });
    });

    // Clear button click handler
    domElements.clear.addEventListener('click', function() {
      domElements.output.innerHTML = `<pre class="default-output">// Program output will appear here</pre>`;
      if (window.assemblyView) {
        window.assemblyView.setValue("");
      }
    });
    
    // Initialize theme selection
    if (domElements.themeSelect) {
      domElements.themeSelect.addEventListener('change', function() {
        const theme = this.value;
        if (window.editor) {
          window.editor.setOption('theme', theme);
        }
        if (window.assemblyView) {
          window.assemblyView.setOption('theme', theme);
        }
      });
    }
    
    // Initialize Vim mode toggle
    if (domElements.vimMode) {
      domElements.vimMode.addEventListener('change', function() {
        if (window.editor) {
          window.editor.setOption('keyMap', this.checked ? 'vim' : 'default');
        }
      });
    }
  }
  
  /**
   * Initialize all components
   */
  function init() {
    // Initialize WebSocket connection with handler
    WebCppSocket.init(handleWebSocketMessage, updateStatus);
    
    // Initialize event handlers
    initEventHandlers();
  }
  
  // Public API
  return {
    init: init,
    reconnect: function() {
      // Public method to force reconnection
      WebCppSocket.reconnect();
    }
  };
})();

// Initialize the UI when the DOM is ready
document.addEventListener('DOMContentLoaded', WebCppUI.init);