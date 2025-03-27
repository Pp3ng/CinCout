// Module pattern for better organization
const WebCppUI = (function() {
  // Private variables
  let socket;
  let terminal;
  window.fitAddon = null; // Make fitAddon global for layout.js
  let isCompiling = false;
  let isRunning = false;
  let sessionId;
  let lastInput = '';
  
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
   * Initialize WebSocket connection
   */
  function initWebSocket() {
    console.log('Initializing WebSocket connection');
    
    // Close any existing connection
    if (socket) {
      try {
        socket.close();
      } catch (e) {
        console.error('Error closing existing WebSocket:', e);
      }
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    socket = new WebSocket(`${protocol}//${host}`);
    
    socket.onopen = () => {
      console.log('WebSocket connection established');
      updateStatus('Ready');
    };
    
    socket.onmessage = (event) => {
      console.log('WebSocket message received:', event.data.substring(0, 100) + (event.data.length > 100 ? '...' : ''));
      handleWebSocketMessage(event);
    };
    
    socket.onclose = () => {
      console.log('WebSocket connection closed');
      updateStatus('Disconnected');
      
      // Reset state
      isCompiling = false;
      isRunning = false;
      
      // Only try to reconnect if page is still active
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          console.log('Attempting to reconnect WebSocket');
          initWebSocket(); // Try to reconnect
        }
      }, 3000);
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      updateStatus('Connection Error');
    };
  }
  
  /**
   * Initialize UI event handlers
   */
  function initEventHandlers() {
    console.log('Initializing event handlers');
    
    // Language change handler - must be added before template events
    domElements.language.addEventListener('change', function() {
      console.log('Language changed to:', this.value);
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
        console.log('Template changed to:', this.value);
        const templateName = this.value;
        const lang = domElements.language.value;
        
        // Update editor with selected template
        if (window.editor && templates && templates[lang] && templates[lang][templateName]) {
          window.editor.setValue(templates[lang][templateName]);
        }
      });
    }
    
    // Compile button event
    domElements.compile.addEventListener('click', function() {
      console.log('Compile button clicked');
      
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
        console.error('Empty code, cannot compile');
        domElements.output.innerHTML = '<div class="error-output">Error: Code cannot be empty</div>';
        return;
      }
      
      if (socket && socket.readyState === WebSocket.OPEN) {
        console.log('Sending compile request via WebSocket');
        socket.send(JSON.stringify({
          type: 'compile',
          code: code,
          lang: lang,
          compiler: compiler,
          optimization: optimization
        }));
      } else {
        console.error('WebSocket not connected, cannot compile');
        domElements.output.innerHTML = '<div class="error-output">Error: WebSocket connection not established</div>';
      }
    });
    
    // Close output panel event - send cleanup signal to backend
    domElements.closeOutput.addEventListener('click', function() {
      console.log('Close output button clicked, cleaning up session');
      
      if (socket && socket.readyState === WebSocket.OPEN && sessionId) {
        console.log(`Sending cleanup request for session ${sessionId}`);
        // Send cleanup request to backend
        socket.send(JSON.stringify({
          action: 'cleanup',
          sessionId: sessionId
        }));
        
        // Reset state
        isRunning = false;
        isCompiling = false;
      } else {
        console.log('No active session or WebSocket to clean up');
      }
    });
    
    // View Assembly button click handler
    domElements.viewAssembly.addEventListener('click', function() {
      console.log('View Assembly button clicked');
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
      console.log('Memory check button clicked');
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
          `<div class="memcheck-output" style="white-space: pre-wrap; overflow: visible;">${formatOutput(data)}</div>`;
      })
      .catch(error => {
        domElements.output.innerHTML = 
          `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Error: ${error}</div>`;
      });
    });

    // Format button click handler
    domElements.format.addEventListener('click', function() {
      console.log('Format button clicked');
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
      console.log('Style check button clicked');
      const code = window.editor.getValue();
      const lang = domElements.language.value;

      domElements.outputTab.click();
      domElements.output.innerHTML = "<div class='loading'>Running cppcheck...</div>";

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
            return `<div class="style-block" style="white-space: pre-wrap; overflow: visible;">${formatOutput(line)}</div>`;
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
      console.log('Clear button clicked');
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
    
    console.log('Event handlers initialized');
  }
  
  /**
   * Handle incoming WebSocket messages
   * @param {MessageEvent} event - The WebSocket message event
   */
  function handleWebSocketMessage(event) {
    const data = JSON.parse(event.data);
    
    switch(data.type) {
      case 'connected':
        sessionId = data.sessionId;
        console.log(`Connected with session ID: ${sessionId}`);
        break;
        
      case 'compiling':
        isCompiling = true;
        isRunning = false;
        updateStatus('Compiling...');
        console.log('Received compiling event');
        
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
        console.log('Received compilation error');
        domElements.output.innerHTML = 
          `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">${formatOutput(data.output)}</div>`;
        break;
        
      case 'compile-success':
        isCompiling = false;
        isRunning = true;
        updateStatus('Running');
        console.log('Received compilation success, setting up terminal');
        
        // Clear any previous terminal instance to prevent double execution
        if (terminal) {
          console.log('Disposing existing terminal');
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
        console.log('Session cleanup completed on server');
        break;
        
      default:
        console.log(`Unknown message type: ${data.type}`);
    }
  }
  
  /**
   * Format compiler output for display
   */
  function formatOutput(output) {
    if (!output) return '';
    return output
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/error:/g, '<span class="error-highlight">error:</span>')
      .replace(/warning:/g, '<span class="warning-highlight">warning:</span>')
      .replace(/note:/g, '<span class="note-highlight">note:</span>');
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
    console.log('Setting up terminal interface');
    
    // Clear previous content
    domElements.output.innerHTML = '<div id="terminal-container" class="terminal-container"></div>';
    
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
      rendererType: 'dom',
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
      
      console.log('Terminal setup complete');
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
  }
  
  /**
   * Set up terminal input handling
   */
  function setupTerminalInput() {
    console.log('Setting up terminal input handling');
    let lineBuffer = '';
    
    // Handle terminal input
    terminal.onData(data => {
      if (!isRunning || !socket || socket.readyState !== WebSocket.OPEN) {
        console.log('Not sending terminal input: program not running or socket closed');
        return;
      }

      // Handle Enter key
      if (data === '\r') {
        lastInput = lineBuffer; // Record the last sent input
        terminal.write('\r\n');
        console.log(`Sending input to program: "${lineBuffer}"`);
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
  }
  
  /**
   * Initialize all components
   */
  function init() {
    console.log('Initializing WebCpp UI');
    
    // Initialize WebSocket connection
    initWebSocket();
    
    // Initialize event handlers
    initEventHandlers();
    
    // ... other initialization code ...
    
    console.log('WebCpp UI initialization complete');
  }
  
  // Public API
  return {
    init: init
  };
})();

// Initialize the UI when the DOM is ready
document.addEventListener('DOMContentLoaded', WebCppUI.init);