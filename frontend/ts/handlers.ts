// Define WebSocket-related interfaces
interface CinCoutSocket {
    init: (messageHandler: (event: MessageEvent) => void) => void;
    sendData: (data: any) => Promise<void>;
    isConnected: () => boolean;
    getSessionId: () => string | null;
    setSessionId: (id: string) => void;
    connect: () => Promise<void>;
    disconnect: () => void;
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
        CinCoutSocket: CinCoutSocket;
        editor: any;
        assemblyView: any;
        fitAddon: any;
        terminal: any;
        templates: any;
        templateLists: Record<string, string[]>;
        loadedTemplates: Set<string>;
        updateTemplates: () => Promise<void>;
        setTemplate: () => Promise<void>;
        html2canvas: any;
    }
}

// Module pattern for better organization
const CinCoutUI = (function() {
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
    closeOutput: document.getElementById("closeOutput"),
    codesnap: document.getElementById("codeSnap")
  };
  
  /**
   * Handle incoming WebSocket messages
   * @param {MessageEvent} event - The WebSocket message event
   */
  function handleWebSocketMessage(event: MessageEvent): void {
    const data = JSON.parse(event.data) as WebSocketMessage;
    
    switch(data.type) {
      case 'connected':
        (window as any).CinCoutSocket.setSessionId(data.sessionId);
        break;
        
      case 'compiling':
        isCompiling = true;
        isRunning = false;
        
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
        if ((window as any).editor) {
          setTimeout(() => (window as any).editor.refresh(), 10);
        }
        break;
        
      case 'compile-error':
        isCompiling = false;
        isRunning = false;
        
        // The output is already formatted by the backend
        if (domElements.output) {
          domElements.output.innerHTML = 
            `<div class="error-output" style="white-space: pre-wrap; overflow: visible;">${data.output}</div>`;
        }
        
        // Disconnect WebSocket immediately after error
        (window as any).CinCoutSocket.disconnect();
        break;
        
      case 'compile-success':
        isCompiling = false;
        isRunning = true;
        
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
        if ((window as any).editor) {
          setTimeout(() => (window as any).editor.refresh(), 10);
        }
        break;
        
      case 'output':
        if (terminal) {
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
        
        if (terminal) {
          terminal.write(`\r\n\x1b[90m[Program exited with code: ${data.code}]\x1b[0m\r\n`);
        }
        
        // Disconnect WebSocket immediately when program exits
        (window as any).CinCoutSocket.disconnect();
        break;
        
      default:
        console.log(`Unknown message type: ${data.type}`);
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
    (window as any).fitAddon = new (window as any).FitAddon.FitAddon();
    terminal.loadAddon((window as any).fitAddon);
    
    // Open terminal in container and resize
    const terminalContainer = document.getElementById('terminal-container');
    if (!terminalContainer) {
      console.error('Terminal container not found');
      return;
    }
    
    terminal.open(terminalContainer);
    
    // Ensure theme is applied and resize
    setTimeout(() => {
      if ((window as any).fitAddon) {
        try {
          (window as any).fitAddon.fit();
          // Send the adjusted size to the server
          if ((window as any).CinCoutSocket.isConnected() && isRunning) {
            (window as any).CinCoutSocket.sendData({
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
      if ((window as any).fitAddon) {
        try {
          (window as any).fitAddon.fit();
        } catch (e) {
          console.error('Error fitting terminal on resize:', e);
        }
      }
    });

    // After terminal is opened, send size information to the server
    terminal.onResize(({ cols, rows }: { cols: number, rows: number }) => {
      if ((window as any).CinCoutSocket.isConnected() && isRunning) {
        (window as any).CinCoutSocket.sendData({
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
      if (!isRunning || !(window as any).CinCoutSocket.isConnected()) {
        console.log('Not sending terminal input: program not running or socket closed');
        return;
      }

      // Send all input characters to the server for PTY to handle
      (window as any).CinCoutSocket.sendData({
        type: 'input',
        input: data
      });
    });
  }
  
  /**
   * Take a code snapshot of the code editor
   * @returns {Promise<void>}
   */
  async function takeCodeSnap(): Promise<void> {
    
    // Get the CodeMirror editor element
    const editorElement = document.querySelector('.CodeMirror');
    
    if (!editorElement) {
      console.error('CodeMirror editor element not found');
      return;
    }
    
    try {
      // Show loading indicator
      const loadingIndicator = document.createElement('div');
      loadingIndicator.className = 'codesnap-loading';
      loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating code snapshot...';
      loadingIndicator.style.cssText = 'position: fixed; top: 20px; right: 20px; background: rgba(0,0,0,0.7); color: white; padding: 10px; border-radius: 5px; z-index: 9999;';
      document.body.appendChild(loadingIndicator);
      
      // Get the CodeMirror instance
      const cm = (editorElement as any).CodeMirror;
      if (!cm) {
        throw new Error('CodeMirror instance not found');
      }
      
      // Get code content and language
      const fullContent = cm.getValue();
      const lang = (domElements.language as HTMLSelectElement)?.value || 'code';

      // Create filename with timestamp
      const timestamp = (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} at ${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}.${String(now.getSeconds()).padStart(2, '0')}`
      })();
      const filename = `${lang}-${timestamp}.png`;
      
      // Get current theme directly from theme selector
      const currentTheme = (document.getElementById('theme-select') as HTMLSelectElement)?.value || 'default';
      
      // Calculate width based on longest line
      const lines = fullContent.split('\n');
      const longestLine = lines.reduce((longest: string, line: string) => line.length > longest.length ? line : longest, '');
      
      // Measure line width
      const measureEl = document.createElement('div');
      measureEl.style.cssText = 'position: absolute; left: -9999px; visibility: hidden; white-space: pre;';
      measureEl.style.fontFamily = window.getComputedStyle(editorElement).fontFamily;
      measureEl.style.fontSize = window.getComputedStyle(editorElement).fontSize;
      measureEl.textContent = longestLine;
      document.body.appendChild(measureEl);
      const longestLineWidth = measureEl.clientWidth;
      document.body.removeChild(measureEl);
      
      // Calculate total width including line numbers
      const lineNumbersWidth = editorElement.querySelector('.CodeMirror-linenumbers')?.clientWidth || 0;
      const totalWidth = longestLineWidth + lineNumbersWidth + 40;
      
      // Create temporary container for new editor
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = `position: absolute; left: -9999px; top: -9999px; opacity: 1; width: ${totalWidth}px;`;
      document.body.appendChild(tempContainer);
      
      // Get original editor styling
      const computedStyle = window.getComputedStyle(editorElement);
      const editorStyles = {
        fontFamily: computedStyle.getPropertyValue('font-family'),
        fontSize: computedStyle.getPropertyValue('font-size'),
        lineHeight: computedStyle.getPropertyValue('line-height')
      };
      
      // Copy editor options that matter for rendering
      const currentOptions = {};
      const relevantOptions = ['mode', 'lineWrapping', 'lineNumbers', 'foldGutter', 'theme', 'indentUnit', 'indentWithTabs', 'smartIndent'];
      
      for (const option of relevantOptions) {
        try {
          const value = cm.getOption(option);
          if (value !== undefined) {
            (currentOptions as any)[option] = value;
          }
        } catch (e) {
          console.warn(`Couldn't get option ${option}:`, e);
        }
      }
      
      // Create new CodeMirror instance for snapshot
      const newCm = (window as any).CodeMirror(tempContainer, {
        ...currentOptions,
        value: fullContent,
        readOnly: true,
        viewportMargin: Infinity,
        theme: currentTheme !== 'default' ? currentTheme : 'default'
      });
      
      // Wait for theme CSS to load and apply
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Style the new editor element
      const newEditorElement = tempContainer.querySelector('.CodeMirror') as HTMLElement;
      if (!newEditorElement) {
        throw new Error('New editor element not found');
      }
      
      // Apply necessary styling
      newEditorElement.style.fontFamily = editorStyles.fontFamily;
      newEditorElement.style.fontSize = editorStyles.fontSize;
      newEditorElement.style.lineHeight = editorStyles.lineHeight;
      newEditorElement.style.width = `${totalWidth}px`;
      
      // Make content fully visible without scrolling
      const scrollElement = newEditorElement.querySelector('.CodeMirror-scroll') as HTMLElement;
      if (scrollElement) {
        scrollElement.style.height = 'auto';
        scrollElement.style.maxHeight = 'none';
        scrollElement.style.overflow = 'visible';
        scrollElement.style.width = `${totalWidth}px`;
      }
      
      const sizerElement = newEditorElement.querySelector('.CodeMirror-sizer') as HTMLElement;
      if (sizerElement) {
        sizerElement.style.marginBottom = '0';
        sizerElement.style.minWidth = `${totalWidth - lineNumbersWidth}px`;
      }
      
      const codeArea = newEditorElement.querySelector('.CodeMirror-lines') as HTMLElement;
      if (codeArea) {
        codeArea.style.width = `${totalWidth - lineNumbersWidth}px`;
      }
      
      // Force refresh and wait for it to complete
      newCm.refresh();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Take screenshot
      const canvas = await window.html2canvas(newEditorElement, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        height: newEditorElement.scrollHeight,
        width: totalWidth,
        windowHeight: newEditorElement.scrollHeight + 100
      });
      
      // Convert to blob and download
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        throw new Error('Failed to create blob from canvas');
      }
      
      // Download the image
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Clean up
      document.body.removeChild(tempContainer);
      document.body.removeChild(loadingIndicator);
      
      // Show success notification
      showNotification(true, 'Code snapshot saved!');
      
    } catch (error) {
      console.error('CodeSnap error:', error);
      
      // Make sure loading indicator is removed in case of error
      const existingIndicator = document.querySelector('.codesnap-loading');
      if (existingIndicator && existingIndicator.parentNode) {
        existingIndicator.parentNode.removeChild(existingIndicator);
      }
      
      // Show error notification
      showNotification(false, 'Failed to create code snapshot');
    }
  }
  
  /**
   * Show a notification message
   * @param success - Whether this is a success or error notification
   * @param message - The message to display
   */
  function showNotification(success: boolean, message: string): void {
    const notification = document.createElement('div');
    notification.className = success ? 'codesnap-notification' : 'codesnap-error';
    
    const icon = success ? 'fa-check-circle' : 'fa-exclamation-circle';
    const bgColor = success ? 'rgba(40,167,69,0.9)' : 'rgba(220,53,69,0.9)';
    
    notification.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    notification.style.cssText = `position: fixed; top: 20px; right: 20px; background: ${bgColor}; color: white; padding: 10px; border-radius: 5px; z-index: 9999; transition: opacity 0.5s ease;`;
    
    document.body.appendChild(notification);
    
    // Remove notification after a delay
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 500);
    }, 3000);
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
        
        const code = (window as any).editor.getValue();
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
          // Ensure output panel is visible
          if (domElements.outputPanel) {
            domElements.outputPanel.style.display = 'flex';
          }
          document.querySelector('.editor-panel')?.classList.add('with-output');
          domElements.outputTab?.click();
          
          if (domElements.output) {
            domElements.output.innerHTML = '<div class="loading">Connecting...</div>';
          }
          
          // Connect to WebSocket server for compilation
          await (window as any).CinCoutSocket.connect();
          if (domElements.output) {
            domElements.output.innerHTML = '<div class="loading">Sending code for compilation...</div>';
          }
          
          await (window as any).CinCoutSocket.sendData({
            type: 'compile',
            code: code,
            lang: lang,
            compiler: compiler,
            optimization: optimization
          });
        } catch (error) {
          console.error('WebSocket operation failed:', error);
          if (domElements.output) {
            domElements.output.innerHTML = '<div class="error-output">Error: WebSocket connection failed. Please try again.</div>';
          }
          
          // Ensure connection is closed on error
          try {
            (window as any).CinCoutSocket.disconnect();
          } catch (e) {
            console.error('Error disconnecting after failure:', e);
          }
        }
      });
    }
    
    // Close output panel event - send cleanup signal to backend
    if (domElements.closeOutput) {
      domElements.closeOutput.addEventListener('click', async function() {
        try {
          // Check if there's an active session to clean up
          const sessionId = (window as any).CinCoutSocket.getSessionId();
          if (sessionId && (window as any).CinCoutSocket.isConnected()) {
            console.log(`Sending cleanup request for session ${sessionId} and disconnecting...`);
            
            try {
              // Send cleanup request
              await (window as any).CinCoutSocket.sendData({
                type: 'cleanup',
                sessionId: sessionId
              });
            } catch (e) {
              console.error('Error sending cleanup message:', e);
            }
            
            // Disconnect regardless of cleanup success
            (window as any).CinCoutSocket.disconnect();
          }
          
          // Reset state
          isRunning = false;
          isCompiling = false;
        } catch (error) {
          console.error('Failed to handle cleanup:', error);
        }
      });
    }
    
    // View Assembly button click handler
    if (domElements.viewAssembly) {
      domElements.viewAssembly.addEventListener('click', function() {
        const code = (window as any).editor.getValue();
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
        const code = (window as any).editor.getValue();
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
        const code = (window as any).editor.getValue();
        const cursor = (window as any).editor.getCursor();
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
          const scrollInfo = (window as any).editor.getScrollInfo();
          (window as any).editor.setValue(formattedData);
          (window as any).editor.setCursor(cursor);
          (window as any).editor.scrollTo(scrollInfo.left, scrollInfo.top);
          (window as any).editor.refresh();
        })
        .catch(error => {
          console.error("Format error:", error);
        });
      });
    }

    // Style check button click handler
    if (domElements.styleCheck) {
      domElements.styleCheck.addEventListener('click', function() {
        const code = (window as any).editor.getValue();
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
        if ((window as any).editor) {
          (window as any).editor.setOption('theme', theme);
        }
        if (window.assemblyView) {
          window.assemblyView.setOption('theme', theme);
        }
      });
    }
    
    // Initialize Vim mode toggle
    if (domElements.vimMode) {
      domElements.vimMode.addEventListener('change', function(this: HTMLInputElement) {
        if ((window as any).editor) {
          (window as any).editor.setOption('keyMap', this.checked ? 'vim' : 'default');
        }
      });
    }

    // Initialize CodeSnap button
    if (domElements.codesnap) {
      domElements.codesnap.addEventListener('click', takeCodeSnap);
    }
  }
  
  /**
   * Initialize all components
   */
  function init(): void {
    // Initialize WebSocket handler but don't connect yet
    (window as any).CinCoutSocket.init(handleWebSocketMessage);
    
    // Initialize event handlers
    initEventHandlers();
  }
  
  // Public API
  return {
    init: init
  };
})();

// Initialize the UI when the DOM is ready
document.addEventListener('DOMContentLoaded', CinCoutUI.init);