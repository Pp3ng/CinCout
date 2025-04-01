(() => {
  //=============================================================================
  // Constants and Configuration
  //=============================================================================
  
  // Detect operating system
 function detectOS() {
  const userAgent = window.navigator.userAgent;
  return /Mac/.test(userAgent) ? 'MacOS' : 'Other';
}

  // Platform detection (Mac or other platforms)
  const OS = detectOS();
  const IS_MAC = OS === 'MacOS';
  
  // Get primary command key (Command for Mac, Ctrl for others)
  const CMD_KEY = IS_MAC ? 'meta' : 'ctrl';
  
  // Define DOM element ID constants for easier reference
  const DOM_IDS = {
    COMPILE: "compile",
    CLEAR: "clear",
    CLOSE_OUTPUT: "closeOutput",
    VIEW_ASSEMBLY: "viewAssembly",
    FORMAT: "format",
    STYLE_CHECK: "styleCheck",
    MEMORY_CHECK: "memcheck",
    OUTPUT_PANEL: "outputPanel",
    LANGUAGE: "language",
    SHORTCUTS_CONTENT: "shortcuts-content"
  };

  //=============================================================================
  // Shortcut Definitions
  //=============================================================================
  
  /**
   * Shortcut configuration
   * Each shortcut contains an action function and description text
   */
  const SHORTCUTS = {
    // Common shortcuts for all platforms
    common: {
      [`${CMD_KEY}+Enter`]: {
        action: () => triggerButton(DOM_IDS.COMPILE),
        description: "Compile and run code",
        displayKeys: IS_MAC ? ['⌘', 'return'] : ['Ctrl', 'Enter']
      },
      [`${CMD_KEY}+l`]: {
        action: () => triggerButton(DOM_IDS.CLEAR),
        description: "Clear terminal output",
        displayKeys: IS_MAC ? ['⌘', 'L'] : ['Ctrl', 'L']
      },
      [`${CMD_KEY}+s`]: {
        action: saveCodeToFile,
        description: "Save code to file",
        displayKeys: IS_MAC ? ['⌘', 'S'] : ['Ctrl', 'S']
      },
      [`${CMD_KEY}+o`]: {
        action: openCodeFromFile,
        description: "Open code from file",
        displayKeys: IS_MAC ? ['⌘', 'O'] : ['Ctrl', 'O']
      },
      [`${CMD_KEY}+k`]: {
        action: toggleCodeFolding,
        description: "Toggle code folding",
        displayKeys: IS_MAC ? ['⌘', 'K'] : ['Ctrl', 'K']
      }
    },
    
    // Mac-specific shortcuts
    mac: {
      'ctrl+1': {
        action: () => triggerButton(DOM_IDS.VIEW_ASSEMBLY),
        description: "View assembly code",
        displayKeys: ['^', '1']
      },
      'ctrl+2': {
        action: () => triggerButton(DOM_IDS.FORMAT),
        description: "Format code",
        displayKeys: ['^', '2']
      },
      'ctrl+3': {
        action: () => triggerButton(DOM_IDS.STYLE_CHECK),
        description: "Style check",
        displayKeys: ['^', '3']
      },
      'ctrl+4': {
        action: () => triggerButton(DOM_IDS.MEMORY_CHECK),
        description: "Memory check",
        displayKeys: ['^', '4']
      }
    },
    
    // Other platforms (Windows/Linux) shortcuts
    other: {
      'alt+1': {
        action: () => triggerButton(DOM_IDS.VIEW_ASSEMBLY),
        description: "View assembly code",
        displayKeys: ['Alt', '1']
      },
      'alt+2': {
        action: () => triggerButton(DOM_IDS.FORMAT),
        description: "Format code",
        displayKeys: ['Alt', '2']
      },
      'alt+3': {
        action: () => triggerButton(DOM_IDS.STYLE_CHECK),
        description: "Style check",
        displayKeys: ['Alt', '3']
      },
      'alt+4': {
        action: () => triggerButton(DOM_IDS.MEMORY_CHECK),
        description: "Memory check",
        displayKeys: ['Alt', '4']
      }
    },
    
    // Special keys
    special: {
      'Escape': {
        action: closeOutputPanel,
        description: "Close output panel",
        displayKeys: ['Esc']
      }
    }
  };

  /**
   * Special key handlers that need priority processing
   * These handlers execute before standard shortcut handling and work
   * even when the terminal has focus
   */
  const SPECIAL_KEY_HANDLERS = {
    // Escape key handler (works with terminal focus)
    'Escape': (e) => {
      const outputPanel = document.getElementById(DOM_IDS.OUTPUT_PANEL);
      if (outputPanel && outputPanel.style.display !== 'none') {
        e.preventDefault();
        closeOutputPanel();
        return true; // Handled
      }
      return false; // Not handled
    },
    
    // Compile shortcut (Ctrl+Enter or Cmd+Enter)
    'Enter': (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        triggerButton(DOM_IDS.COMPILE);
        return true; // Handled
      }
      return false; // Not handled
    }
  };

  //=============================================================================
  // Core Functions
  //=============================================================================
  
  /**
   * Triggers a click event on an element with the specified ID
   * @param {string} id - The ID of the element to click
   */
  function triggerButton(id) {
    const element = document.getElementById(id);
    if (element) element.click();
  }
  
  /**
   * Closes the output panel and restores focus to the editor
   */
  function closeOutputPanel() {
    const outputPanel = document.getElementById(DOM_IDS.OUTPUT_PANEL);
    if (outputPanel && outputPanel.style.display !== 'none') {
      triggerButton(DOM_IDS.CLOSE_OUTPUT);
      // Restore editor focus after closing panel
      setTimeout(() => {
        if (window.editor) window.editor.focus();
      }, 10);
    }
  }
  
  /**
   * Saves the current code to a file
   */
  function saveCodeToFile() {
    const code = editor.getValue();
    const fileType = document.getElementById(DOM_IDS.LANGUAGE).value === 'cpp' ? 'cpp' : 'c';
    const blob = new Blob([code], {type: 'text/plain'});
    const downloadLink = document.createElement('a');
    
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `code.${fileType}`;
    downloadLink.click();
  }
  
  /**
   * Opens code from a file
   */
  function openCodeFromFile() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.c,.cpp';
    
    fileInput.onchange = function() {
      const selectedFile = this.files[0];
      if (!selectedFile) return;
      
      const reader = new FileReader();
      reader.onload = function() {
        if (window.editor) {
          editor.setValue(reader.result);
        }
      };
      reader.readAsText(selectedFile);
    };
    
    fileInput.click();
  }
  
  /**
   * Toggles code folding at the cursor position
   */
  function toggleCodeFolding() {
    if (window.editor) {
      editor.foldCode(editor.getCursor());
    }
  }

  //=============================================================================
  // Keyboard Event Handling
  //=============================================================================
  
  /**
   * Normalizes a keyboard event into a format usable for shortcut lookup
   * @param {KeyboardEvent} event - The keyboard event
   * @returns {string} - Normalized key representation
   */
  function normalizeKeyCombo(event) {
    const key = event.key.toLowerCase();
    
    // Handle special keys
    if (key === 'enter') return 'Enter';
    if (key === 'escape') return 'Escape';
    
    // Build key combination prefix
    let prefix = '';
    if (event.ctrlKey) prefix += 'ctrl+';
    if (event.altKey) prefix += 'alt+';
    if (event.metaKey) prefix += 'meta+';
    if (event.shiftKey) prefix += 'shift+';
    
    // Handle letter and number keys
    if (prefix) {
      // Use lowercase for letter keys
      if (key.length === 1) return prefix + key;
      
      // Single number keys
      if (/^[0-9]$/.test(key)) return prefix + key;
    }
    
    // For keys without modifiers, return as is
    return event.key;
  }
  
  /**
   * Main keyboard event handler
   * @param {KeyboardEvent} event - The keyboard event
   */
  function handleKeyboardEvent(event) {
    // First check special keys (Enter with modifiers, Escape)
    const specialHandler = SPECIAL_KEY_HANDLERS[event.key];
    if (specialHandler && specialHandler(event)) {
      return; // Handled by special handler
    }
    
    // Normalize the key combination
    const normalizedKey = normalizeKeyCombo(event);
    
    // Get platform-specific shortcut map
    const platformMap = IS_MAC ? SHORTCUTS.mac : SHORTCUTS.other;
    
    // Check common shortcut map
    const commonShortcut = SHORTCUTS.common[normalizedKey];
    if (commonShortcut) {
      event.preventDefault();
      commonShortcut.action();
      return;
    }
    
    // Check platform-specific shortcut map
    const platformShortcut = platformMap[normalizedKey];
    if (platformShortcut) {
      event.preventDefault();
      platformShortcut.action();
      return;
    }
  }
  
  //=============================================================================
  // Shortcuts Display
  //=============================================================================
  
  /**
   * Generates the shortcuts list for display in the UI
   */
  function generateShortcutsList() {
    const shortcutsContainer = document.getElementById(DOM_IDS.SHORTCUTS_CONTENT);
    if (!shortcutsContainer) return;
    
    // Clear existing content
    shortcutsContainer.innerHTML = '';
    
    // Create list
    const ul = document.createElement('ul');
    
    // Add common shortcuts
    Object.values(SHORTCUTS.common).forEach(shortcut => {
      const li = document.createElement('li');
      const keyHtml = shortcut.displayKeys.map(key => `<kbd>${key}</kbd>`).join(' + ');
      li.innerHTML = `${keyHtml} - ${shortcut.description}`;
      ul.appendChild(li);
    });
    
    // Add platform-specific shortcuts
    const platformShortcuts = IS_MAC ? SHORTCUTS.mac : SHORTCUTS.other;
    Object.values(platformShortcuts).forEach(shortcut => {
      const li = document.createElement('li');
      const keyHtml = shortcut.displayKeys.map(key => `<kbd>${key}</kbd>`).join(' + ');
      li.innerHTML = `${keyHtml} - ${shortcut.description}`;
      ul.appendChild(li);
    });
    
    // Add special keys
    Object.values(SHORTCUTS.special).forEach(shortcut => {
      const li = document.createElement('li');
      const keyHtml = shortcut.displayKeys.map(key => `<kbd>${key}</kbd>`).join(' + ');
      li.innerHTML = `${keyHtml} - ${shortcut.description}`;
      ul.appendChild(li);
    });
    
    shortcutsContainer.appendChild(ul);
  }
  
  //=============================================================================
  // Initialization
  //=============================================================================
  
  /**
   * Initialize the keyboard shortcuts system
   */
  function initializeShortcuts() {
    // Register main shortcut handler (bubbling phase)
    document.addEventListener('keydown', handleKeyboardEvent);
    
    // Register special Escape key handler (capture phase)
    // This ensures Escape works even when terminal has focus
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        const handled = SPECIAL_KEY_HANDLERS.Escape(event);
        if (handled) return;
      }
    }, true); // true enables capture phase
    
    // Generate shortcuts list when DOM is ready
    document.addEventListener('DOMContentLoaded', generateShortcutsList);
  }
  
  // Initialize the shortcuts system
  initializeShortcuts();
})();