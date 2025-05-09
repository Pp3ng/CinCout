import "codemirror/lib/codemirror.css";
import "codemirror/addon/hint/show-hint.css";
import "codemirror/addon/fold/foldgutter.css";
import "@xterm/xterm/css/xterm.css";

import "../styles/main.css";

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

import { showNotification } from "./service/notification";

import "./ui/themes";
import "./ui/layout";
import "./ui/selector";
import "./app";

document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("title-easter-egg");
  if (!el) return;

  let clicks = 0,
    lastClick = 0,
    timer: number | null = null;

  el.addEventListener("click", () => {
    const now = Date.now();

    if (now - lastClick > 1500) clicks = 0;
    if (timer) clearTimeout(timer);

    clicks++;
    lastClick = now;

    if (clicks === 3) {
      showNotification(
        "info",
        "🌌 The Answer to the Ultimate Question of Life, the Universe, and Everything is 42 🤓",
        4000,
        { top: "50%", left: "50%" }
      );
      timer = window.setTimeout(() => (clicks = 0), 4000);
    }
  });
});
