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

// Import React and ReactDOM for rendering the app
import React from "react";
import { createRoot } from "react-dom/client";

// Import our main App component
import App from "./App";

// Import required core modules that might be needed for compatibility

// Initialize the React app
document.addEventListener("DOMContentLoaded", () => {
  const rootElement = document.getElementById("app");

  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } else {
    console.error("Root element #app not found");
  }
});
