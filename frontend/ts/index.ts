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
import { showNotification } from "./utils";

// 5. Import all application modules (in dependency order)
// Core modules first
import "./themes"; // Theme functionality
import "./templates"; // Code templates
import "./layout"; // Layout management
import "./selector"; // UI selection handling
import "./shortcuts"; // Keyboard shortcuts
import "./websocket"; // WebSocket communication
import "./compileSocket"; // Compilation WebSocket handling
import "./terminal"; // Terminal functionality
import "./handlers"; // Event handlers
import "./editor"; // Main editor functionality (depends on most other modules)

// Easter Egg functionality
document.addEventListener("DOMContentLoaded", () => {
  const titleElement = document.getElementById("title-easter-egg");

  if (titleElement) {
    let clickCount = 0;
    let lastClickTime = 0;

    titleElement.addEventListener("click", () => {
      const currentTime = new Date().getTime();

      // Reset count if more than 1.5 seconds between clicks
      if (currentTime - lastClickTime > 1500) {
        clickCount = 0;
      }

      clickCount++;
      lastClickTime = currentTime;

      // Show message on third click
      if (clickCount === 3) {
        // Show the easter egg message using showNotification only
        showNotification(
          "info",
          "🌌 The Answer to the Ultimate Question of Life, the Universe, and Everything is 42 🚀",
          4000,
          { top: "50%", left: "50%" }
        );

        // Reset click count
        setTimeout(() => {
          clickCount = 0;
        }, 4000);
      }
    });
  }
});
