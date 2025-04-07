// Define WebSocket-related interfaces
interface WebCppSocket {
    init: (messageHandler: (event: MessageEvent) => void, statusUpdater: (status: string) => void) => void;
    sendData: (data: any) => Promise<void>;
    reconnect: () => void;
    isConnected: () => boolean;
    getSessionId: () => string | null;
    setSessionId: (id: string) => void;
}

// Define message types
interface WebSocketMessage {
    type: string;
    [key: string]: any;
}

// DOM elements interface
interface DomElements {
    [key: string]: HTMLElement | null;
}

// Declare global objects
declare global {
    interface Window {
        WebCppSocket: WebCppSocket;
        editor: any;
        assemblyView: any;
        fitAddon: any;
        terminal: any;
        templates: any;
        templateLists: Record<string, string[]>;
        loadedTemplates: Set<string>;
        updateTemplates: () => Promise<void>;
        setTemplate: () => Promise<void>;
    }
}

// Module pattern for better organization
const WebCppUI = (function() {
  // Private variables
  let terminal: any;
  window.fitAddon = null; // Make fitAddon global for layout.js
  let isCompiling = false;
  let isRunning = false;
  
  // DOM element cache for performance
  const domElements: DomElements = {
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
  function handleWebSocketMessage(event: MessageEvent): void {
    const data = JSON.parse(event.data) as WebSocketMessage;
    
    switch(data.type) {
      case 'pong':
        // Received pong from server, connection is alive
        break;
        
      case 'connected':
        window.WebCppSocket.setSessionId(data.sessionId);
        console.log(`Connected with session ID: ${window.WebCppSocket.getSessionId()}`);
        break;
        
      case 'compiling':
        isCompiling = true;
        isRunning = false;
        updateStatus('Compiling...');
        
        // Make sure the output panel is visible
        if (domElements.outputPanel) {
          domElements.outputPanel.style.display = 'flex';
        }
        document.querySelector('.editor-panel')?.classList.add('with-output');
        domElements.outputTab?.click();
        
        if (domElements.output) {
          domElements.output.innerHTML = '<div class="loading">Compiling</div>';
        }
        
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
        if (domElements.output) {
          domElements.output.innerHTML = 
            `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">${data.output}</div>`;
        }
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
        if (domElements.outputPanel) {
          domElements.outputPanel.style.display = 'flex';
        }
        document.querySelector('.editor-panel')?.classList.add('with-output');
        domElements.outputTab?.click();
        
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
  function updateStatus(status: string): void {
    console.log(`Status updated: ${status}`);
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      statusElement.textContent = status;
    }
  }
  
  /**
   * Set up terminal interface
   */
  function setupTerminal(): void {
    // Clear previous content
    if (domElements.output) {
      domElements.output.innerHTML = '<div id="terminal-container" class="terminal-container"></div>';
    }
    
    // Make sure to get the correct theme first
    const currentTheme = (window as any).getTerminalTheme ? (window as any).getTerminalTheme() : {};
    
    // Create terminal instance
    terminal = new (window as any).Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      theme: currentTheme,
      allowTransparency: true,
      rendererType: 'dom',
      convertEol: true, // Ensure line ending conversion
      // Add custom key handling to prevent terminal from capturing Escape key
      customKeyEventHandler: (event: KeyboardEvent) => {
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
    window.fitAddon = new (window as any).FitAddon.FitAddon();
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
          if (window.WebCppSocket.isConnected() && isRunning) {
            window.WebCppSocket.sendData({
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
    terminal.onResize(({ cols, rows }: { cols: number, rows: number }) => {
      if (window.WebCppSocket.isConnected() && isRunning) {
        window.WebCppSocket.sendData({
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
  function setupTerminalInput(): void {
    // Simplified terminal input handling, letting backend handle echo
    terminal.onData((data: string) => {
      if (!isRunning || !window.WebCppSocket.isConnected()) {
        console.log('Not sending terminal input: program not running or socket closed');
        return;
      }

      // Send all input characters to the server for PTY to handle
      window.WebCppSocket.sendData({
        type: 'input',
        input: data
      });
    });
  }
  
  /**
   * Initialize event handlers
   */
  function initEventHandlers(): void {
    
    // Language change handler - must be added before template events
    if (domElements.language) {
      domElements.language.addEventListener('change', async function(this: HTMLSelectElement) {
        const lang = this.value;
        
        // Update available templates for the selected language
        if (typeof window.updateTemplates === 'function') {
          await window.updateTemplates();
          
          // Set default template
          const templateSelect = document.getElementById('template') as HTMLSelectElement;
          if (templateSelect) {
            // Try to select Hello World template if it exists
            const helloWorldOption = Array.from(templateSelect.options).find(
              option => option.value === 'Hello World'
            );
            
            if (helloWorldOption) {
              templateSelect.value = 'Hello World';
              // Call setTemplate to update editor content
              if (typeof window.setTemplate === 'function') {
                window.setTemplate();
              }
            } else if (templateSelect.options.length > 0) {
              // Select first available template
              templateSelect.selectedIndex = 0;
              if (typeof window.setTemplate === 'function') {
                window.setTemplate();
              }
            }
          }
        }
      });
    }
    
    // Template change handler
    if (domElements.template) {
      domElements.template.addEventListener('change', function(this: HTMLSelectElement) {
        if (typeof window.setTemplate === 'function') {
          window.setTemplate();
        }
      });
    }
    
    // Compile button event
    if (domElements.compile) {
      domElements.compile.addEventListener('click', async function() {
        
        if (isCompiling || isRunning) {
          console.log('A process is already running, ignoring compile request');
          return;
        }
        
        const code = window.editor.getValue();
        const lang = (domElements.language as HTMLSelectElement)?.value;
        const compiler = (document.getElementById('compiler') as HTMLSelectElement)?.value;
        const optimization = (document.getElementById('optimization') as HTMLSelectElement)?.value;
        
        console.log(`Compiling ${lang} code with ${compiler} (${optimization})`);
        
        if (code.trim() === '') {
          if (domElements.output) {
            domElements.output.innerHTML = '<div class="error-output">Error: Code cannot be empty</div>';
          }
          return;
        }
        
        try {
          await window.WebCppSocket.sendData({
            type: 'compile',
            code: code,
            lang: lang,
            compiler: compiler,
            optimization: optimization
          });
        } catch (error) {
          console.error('WebSocket connection failed:', error);
          if (domElements.output) {
            domElements.output.innerHTML = '<div class="error-output">Error: WebSocket connection failed. Please try again.</div>';
          }
          updateStatus('Connection Failed');
        }
      });
    }
    
    // Close output panel event - send cleanup signal to backend
    if (domElements.closeOutput) {
      domElements.closeOutput.addEventListener('click', async function() {
        
        try {
          const sessionId = window.WebCppSocket.getSessionId();
          if (sessionId) {
            console.log(`Sending cleanup request for session ${sessionId}`);
            // Send cleanup request to backend
            await window.WebCppSocket.sendData({
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
    }
    
    // View Assembly button click handler
    if (domElements.viewAssembly) {
      domElements.viewAssembly.addEventListener('click', function() {
        const code = window.editor.getValue();
        const lang = (domElements.language as HTMLSelectElement)?.value;
        const compiler = (document.getElementById("compiler") as HTMLSelectElement)?.value;
        const optimization = (document.getElementById("optimization") as HTMLSelectElement)?.value;

        domElements.assemblyTab?.click();

        // Create a loading div
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading';
        loadingDiv.textContent = 'Generating assembly code';

        // Get assembly div and its CodeMirror container
        const assemblyDiv = domElements.assembly as HTMLElement;
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
    }

    // Memory check button click handler
    if (domElements.memcheck) {
      domElements.memcheck.addEventListener('click', function() {
        const code = window.editor.getValue();
        const lang = (domElements.language as HTMLSelectElement)?.value;
        const compiler = (document.getElementById("compiler") as HTMLSelectElement)?.value;
        const optimization = (document.getElementById("optimization") as HTMLSelectElement)?.value;

        domElements.outputTab?.click();
        if (domElements.output) {
          domElements.output.innerHTML = "<div class='loading'>Running memory check...</div>";
        }

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
          if (domElements.output) {
            domElements.output.innerHTML = 
              `<div class="memcheck-output" style="white-space: pre-wrap; overflow: visible;">${data}</div>`;
          }
        })
        .catch(error => {
          if (domElements.output) {
            domElements.output.innerHTML = 
              `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Error: ${error}</div>`;
          }
        });
      });
    }

    // Format button click handler
    if (domElements.format) {
      domElements.format.addEventListener('click', function() {
        const code = window.editor.getValue();
        const cursor = window.editor.getCursor();
        const lang = (domElements.language as HTMLSelectElement)?.value;

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
    }

    // Style check button click handler
    if (domElements.styleCheck) {
      domElements.styleCheck.addEventListener('click', function() {
        const code = window.editor.getValue();
        const lang = (domElements.language as HTMLSelectElement)?.value;

        domElements.outputTab?.click();
        if (domElements.output) {
          domElements.output.innerHTML = "<div class='loading'>Running style check...</div>";
        }

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

          if (domElements.output) {
            domElements.output.innerHTML =
              `<div class="style-check-output" style="white-space: pre-wrap; overflow: visible;">${formattedLines.join('\n')}</div>`;
          }
        })
        .catch(error => {
          if (domElements.output) {
            domElements.output.innerHTML = `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">Error: ${error}</div>`;
          }
        });
      });
    }

    // Clear button click handler
    if (domElements.clear) {
      domElements.clear.addEventListener('click', function() {
        if (domElements.output) {
          domElements.output.innerHTML = `<pre class="default-output">// Program output will appear here</pre>`;
        }
        if (window.assemblyView) {
          window.assemblyView.setValue("");
        }
      });
    }
    
    // Initialize theme selection
    if (domElements.themeSelect) {
      domElements.themeSelect.addEventListener('change', function(this: HTMLSelectElement) {
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
      domElements.vimMode.addEventListener('change', function(this: HTMLInputElement) {
        if (window.editor) {
          window.editor.setOption('keyMap', this.checked ? 'vim' : 'default');
        }
      });
    }
  }
  
  /**
   * Initialize all components
   */
  function init(): void {
    // Initialize WebSocket connection with handler
    window.WebCppSocket.init(handleWebSocketMessage, updateStatus);
    
    // Initialize event handlers
    initEventHandlers();
  }
  
  // Public API
  return {
    init: init,
    reconnect: function(): void {
      // Public method to force reconnection
      window.WebCppSocket.reconnect();
    }
  };
})();

// Initialize the UI when the DOM is ready
document.addEventListener('DOMContentLoaded', WebCppUI.init);
