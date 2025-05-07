import "codemirror/lib/codemirror.css";
import "codemirror/addon/hint/show-hint.css";
import "codemirror/addon/fold/foldgutter.css";
import "@xterm/xterm/css/xterm.css";

import "../styles/main.css";

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

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const rootElement = document.getElementById("root");

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
