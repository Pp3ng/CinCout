/**
 * WebCpp IDE Keyboard Shortcuts Manager
 * 
 * This module handles all keyboard shortcuts for the WebCpp IDE, providing:
 * - Platform-aware shortcuts (Mac/non-Mac)
 * - Special handling for terminal focus states
 * - Support for file operations, code compilation, and tool shortcuts
 */
(() => {
  //=============================================================================
  // Constants and Configuration
  //=============================================================================
  
  // Platform detection (Mac or other platforms)
  const IS_MAC = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  
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
    LANGUAGE: "language"
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
        description: "Compile and run code"
      },
      [`${CMD_KEY}+l`]: {
        action: () => triggerButton(DOM_IDS.CLEAR),
        description: "Clear terminal output"
      },
      [`${CMD_KEY}+s`]: {
        action: saveCodeToFile,
        description: "Save code to file"
      },
      [`${CMD_KEY}+o`]: {
        action: openCodeFromFile,
        description: "Open code from file"
      },
      [`${CMD_KEY}+k`]: {
        action: toggleCodeFolding,
        description: "Toggle code folding"
      }
    },
    
    // Mac-specific shortcuts
    mac: {
      'ctrl+1': {
        action: () => triggerButton(DOM_IDS.VIEW_ASSEMBLY),
        description: "View assembly code"
      },
      'ctrl+2': {
        action: () => triggerButton(DOM_IDS.FORMAT),
        description: "Format code"
      },
      'ctrl+3': {
        action: () => triggerButton(DOM_IDS.STYLE_CHECK),
        description: "Style check"
      },
      'ctrl+4': {
        action: () => triggerButton(DOM_IDS.MEMORY_CHECK),
        description: "Memory check"
      }
    },
    
    // Other platforms (Windows/Linux) shortcuts
    other: {
      'alt+1': {
        action: () => triggerButton(DOM_IDS.VIEW_ASSEMBLY),
        description: "View assembly code"
      },
      'alt+2': {
        action: () => triggerButton(DOM_IDS.FORMAT),
        description: "Format code"
      },
      'alt+3': {
        action: () => triggerButton(DOM_IDS.STYLE_CHECK),
        description: "Style check"
      },
      'alt+4': {
        action: () => triggerButton(DOM_IDS.MEMORY_CHECK),
        description: "Memory check"
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
    
    // Optional: Log available shortcuts for debugging
    // console.table(getShortcutList());
  }
  
  /**
   * Get a list of all shortcuts for debugging
   * @returns {Array} List of shortcuts
   */
  function getShortcutList() {
    const shortcutList = [];
    
    // Add common shortcuts
    Object.entries(SHORTCUTS.common).forEach(([key, value]) => {
      shortcutList.push({
        key: key,
        description: value.description,
        platform: 'All platforms'
      });
    });
    
    // Add Mac shortcuts
    Object.entries(SHORTCUTS.mac).forEach(([key, value]) => {
      shortcutList.push({
        key: key,
        description: value.description,
        platform: 'Mac'
      });
    });
    
    // Add other platform shortcuts
    Object.entries(SHORTCUTS.other).forEach(([key, value]) => {
      shortcutList.push({
        key: key,
        description: value.description,
        platform: 'Other'
      });
    });
    
    return shortcutList;
  }
  
  // Initialize the shortcuts system
  initializeShortcuts();
})();