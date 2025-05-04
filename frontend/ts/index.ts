// 1. Import base CSS
import "codemirror/lib/codemirror.css";
import "codemirror/addon/hint/show-hint.css";
import "codemirror/addon/fold/foldgutter.css";
import "@xterm/xterm/css/xterm.css";

// 2. Import main CSS
import "../styles/main.css";

// 3. Import CodeMirror core functionality and plugins
import CodeMirror from "codemirror";
window.CodeMirror = CodeMirror;

import "codemirror/mode/clike/clike";
import "codemirror/mode/gas/gas";
import "codemirror/keymap/vim";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/edit/matchbrackets";
import "codemirror/addon/fold/foldcode";
import "codemirror/addon/fold/foldgutter";
import "codemirror/addon/fold/brace-fold";
import "codemirror/addon/fold/comment-fold";
import "codemirror/addon/hint/show-hint";

// Import utility functions
import { initializeReactHeader } from "./react-integration";

// 5. Import all application modules (in dependency order)
// Core modules first
import "./layout"; // Layout management
import "./shortcuts"; // Keyboard shortcuts
import "./websocket"; // WebSocket communication
import "./compileSocket"; // Compilation WebSocket handling
import "./terminal"; // Terminal functionality
import "./handlers"; // Event handlers
import "./editor"; // Main editor functionality (depends on most other modules)

// Initialize React components after DOM content loaded
document.addEventListener("DOMContentLoaded", () => {
  // Initialize React Header
  initializeReactHeader();

  // Setup event listeners for React-to-vanilla communication
  setupReactEventListeners();
});

// Setup event listeners for React component events
function setupReactEventListeners() {
  // Theme change event from React - we'll keep this one for now
  document.addEventListener("react:themeChange", (event: any) => {
    const themeSelect = document.getElementById(
      "theme-select"
    ) as HTMLSelectElement;
    if (themeSelect && event.detail?.theme) {
      themeSelect.value = event.detail.theme;
      themeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
}
