<div align="center">

# 🎯 CINCOUT

<p align="center">
  <img src="frontend/assets/cincout.png" alt="CinCout Logo" width="200" />
</p>

<p align="center">
  <a href="https://cincout.fly.dev/">
    <img src="https://img.shields.io/badge/🌐_Live_Demo-Visit_Site-blue?" alt="Live Demo"/>
  </a>
  <a href="https://wakatime.com/badge/github/Pp3ng/CinCout">
    <img src="https://wakatime.com/badge/github/Pp3ng/CinCout.svg" alt="wakatime"/>
  </a>
</p>

---

### 🛠️ Built with

<p align="center">
  <img src="https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/-Node.js-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/-Socket.IO-010101?style=flat-square&logo=socket.io&logoColor=white" alt="Socket.IO"/>
  <img src="https://img.shields.io/badge/-Koa-33333D?style=flat-square&logo=koa&logoColor=white" alt="Koa"/>
  <img src="https://img.shields.io/badge/-Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/-Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"/>
  <img src="https://img.shields.io/badge/-CodeMirror-d30707?style=flat-square&logo=codemirror&logoColor=white" alt="CodeMirror"/>
  <img src="https://img.shields.io/badge/-Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker"/>
</p>

</div>

## 📖 About

CinCout is a powerful web-based integrated development environment(IDE) designed specifically for **C/C++** programming, enabling seamless coding, compilation, execution, debugging, and analysis directly in browser. providing a rich set of features, and a user-friendly interface. Main purpose is to provide a platform for learning and practicing C/C++ programming.

## Inspiration

CinCout draws inspiration from following sites:

- **[cpp.sh](https://cpp.sh/)**
- **[wandbox](https://wandbox.org/)**
- **[compiler explorer](https://godbolt.org/)**

## 📷 Screenshots

<div align="center">
  <img src="README/sample.png" alt="CinCout Interface" width="80%"/>
</div>

## 🏗️ Architecture

The project follows a clean separation between frontend and backend:

<div align="center">
  <img src="README/Architecture.png" alt="Architecture Diagram" width="70%"/>
</div>

- **Frontend**: Browser-based editor with TypeScript and modern APIs
- **Backend**: Node.js server handling compilation, execution, and analysis
- **Communication**: WebSockets for real-time interaction between client and server

## 🔧 Technical Stack

<div align="center">

|   🎨 **Frontend**   |    🔧 **Backend**    |  🛠️ **Tools**  |
| :-----------------: | :------------------: | :------------: |
| HTML/CSS/TypeScript | Node.js + TypeScript |     Docker     |
|  CodeMirror Editor  |      Koa.js API      | GitHub Actions |
|  Xterm.js Terminal  |      Socket.IO       |      Vite      |
|  Socket.IO Client   |       Node-PTY       |       -        |

</div>

### Frontend Technologies

- **Core**: HTML/CSS/TypeScript
- **Editor**: CodeMirror as main code editor
- **Terminal**: Xterm.js for interactive program execution
- **Build Tool**: Vite for fast development and optimized production builds
- **Communication**: Socket.IO client for real-time communication

### Backend Technologies

- **Runtime**: Node.js with TypeScript
- **API**: Koa.js for HTTP endpoints
- **WebSockets**: Socket.IO for real-time communication
- **Process Management**: Node-PTY for spawning and managing compiler and program processes
- **Containerization**: Docker for consistent deployment

## ✨ Features

<div align="center">

| 🎨 **Code Editor**     | ⚙️ **Compilation**                  | 🚀 **Execution**               | 🔍 **Code Analysis**                | 🎯 **UI/UX**            |
| :--------------------- | :---------------------------------- | :----------------------------- | :---------------------------------- | :---------------------- |
| ✅ Syntax Highlighting | ✅ Multiple Compilers (GCC/Clang)   | ✅ Real-time Program Execution | ✅ Static Code Analysis (cppcheck)  | ✅ Multiple Themes      |
| ✅ Code Folding        | ✅ Optimization Levels (-O0 to -O3) | ✅ Interactive Debugging (GDB) | ✅ Memory Leak Detection (Valgrind) | ✅ Responsive Design    |
| ✅ Vim Mode Support    | ✅ Assembly Generation              | ✅ WebSocket Communication     | ✅ Code Formatting (clang-format)   | ✅ Keyboard Shortcuts   |
| ✅ Code Snapshot       | ✅ Cross-platform Support           | ✅ PTY-based Terminal          | ✅ System Calls Detection           | ✅ Zen Mode             |
| ✅ Template Library    | -                                   | -                              | -                                   | ✅ File Upload/Download |

</div>

## ⌨️ Keyboard Shortcuts

<div align="center">

| 🎯 **Action**         | ️ **Windows/Linux** |  **macOS**   |
| :-------------------- | :-----------------: | :----------: |
| **Compile and Run**   |   `Ctrl + Enter`    | `⌘ + Return` |
| **Save Code**         |     `Ctrl + S`      |   `⌘ + S`    |
| **Code Snapshot**     |     `Ctrl + P`      |   `⌘ + P`    |
| **Open Code File**    |     `Ctrl + O`      |   `⌘ + O`    |
| **Toggle Code Fold**  |     `Ctrl + K`      |   `⌘ + K`    |
| **Zen Mode**          | `Ctrl + Shift + Z`  | `⌘ + ⇧ + Z`  |
| **View Assembly**     |      `Alt + 1`      |   `^ + 1`    |
| **Format Code**       |      `Alt + 2`      |   `^ + 2`    |
| **Lint Code**         |      `Alt + 3`      |   `^ + 3`    |
| **Memory Check**      |      `Alt + 4`      |   `^ + 4`    |
| **Debug with GDB**    |      `Alt + 5`      |   `^ + 5`    |
| **View System Calls** |      `Alt + 6`      |   `^ + 6`    |
| **Close Output**      |        `ESC`        |    `ESC`     |

## 🤝 Contributing

<div align="center">

**welcome contributions!** 🎉

Feel free to fork the repository, make your creative changes, and submit a pull request.

<p>
  <a href="https://github.com/Pp3ng/CinCout/fork">
    <img src="https://img.shields.io/badge/🍴_Fork-Repository-orange" alt="Fork Repository"/>
  </a>
  <a href="https://github.com/Pp3ng/CinCout/issues">
    <img src="https://img.shields.io/badge/🐛_Report-Issues-red" alt="Report Issues"/>
  </a>
</p>

</div>

---

<div align="center">
⭐ Star this repository if you find it helpful! ⭐
</div>
