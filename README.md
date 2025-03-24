# WEB C/C++ Code Editor and Compiler

This project is a web-based code editor and compiler for C/C++ programs. It allows users to write, compile, and run code directly in the browser. The application is built using Node.js and Express.

---

# Screenshots 📷

![sample](RM-assets/sample.png)

# Try it (no guarantee always available due to myself's server)

http://39.105.45.170:9527/

---

# Features ✨

| Category              | Feature             | Description                              | Implementation                 |
| --------------------- | ------------------- | ---------------------------------------- | ------------------------------ |
| **Editor Core**       | Syntax Highlighting | Language-specific highlighting for C/C++ | `frontend/js/editor.js`        |
|                       | Code Folding        | Collapsible code blocks                  | `frontend/js/editor.js`        |
|                       | Auto Brackets       | Automatic closing of brackets            | `frontend/js/editor.js`        |
|                       | Font Size Control   | Ctrl + Mouse Wheel to adjust             | `frontend/js/editor.js`        |
| **Compilation**       | Multiple Compilers  | Support for GCC and Clang                | `backend/routes/compile.js`    |
|                       | Optimization Levels | -O0 to -O3 and -Os options               | `backend/routes/compile.js`    |
|                       | Assembly View       | View generated assembly code             | `backend/routes/compile.js`    |
| **Code Analysis**     | Style Checking      | Static code analysis with cppcheck       | `backend/routes/styleCheck.js` |
|                       | Memory Check        | Memory leak detection                    | `backend/routes/memcheck.js`   |
|                       | Code Formatting     | Automatic code formatting                | `backend/routes/format.js`     |
| **UI/UX**             | Multiple Themes     | 8 different color themes                 | `frontend/css/style.css`       |
|                       | Responsive Design   | Mobile-friendly layout                   | `frontend/css/style.css`       |
|                       | Custom Scrollbars   | Themed scrollbar design                  | `frontend/css/style.css`       |
| **Templates**         | Code Examples       | Built-in code templates                  | `frontend/js/templates.js`     |
|                       | Language Support    | Both C and C++ templates                 | `frontend/js/templates.js`     |
| **Development Tools** | External Resources  | Links to documentation                   | `frontend/index.html`          |
|                       | GitHub Integration  | Source code access                       | `frontend/index.html`          |

---

# Shortcut Keys 🔑

| Action           | Windows/Linux | macOS      |
| ---------------- | ------------- | ---------- |
| Compile and Run  | Ctrl + Enter  | ⌘ + Return |
| Clear Output     | Ctrl + L      | ⌘ + L      |
| Save Code        | Ctrl + S      | ⌘ + S      |
| Open Code File   | Ctrl + O      | ⌘ + O      |
| Toggle Code Fold | Ctrl + K      | ⌘ + K      |
| View Assembly    | Alt + 1       | ^ + 1      |
| Format Code      | Alt + 2       | ^ + 2      |
| Style Check      | Alt + 3       | ^ + 3      |
| Memory Check     | Alt + 4       | ^ + 4      |

---

# Themes 🎨

| Theme        | Description                                            |
| ------------ | ------------------------------------------------------ |
| Default      | Clean and minimalist design with balanced contrast     |
| Nord         | Arctic-inspired color scheme with cool, soothing tones |
| Dracula      | Dark theme with vivid, high-contrast colors            |
| Monokai      | Classic dark theme favored by developers               |
| Material     | Modern design following Material guidelines            |
| Ayu Dark     | Soft dark theme with warm accents                      |
| Gruvbox Dark | Retro-style theme with earthy colors                   |
| Seti         | Modern dark theme with bright accent colors            |
| Panda Syntax | Friendly dark theme with pastel accents                |

---

# Architecture

![architecture](RM-assets/Architecture.png)

---

# Setup Guide

## Prerequisites

First, install the required packages:

```bash
# For Debian/Ubuntu
sudo apt update
sudo apt install nodejs npm gcc g++ clang clang-format valgrind cppcheck
```

## Project Setup

1. Clone the repository and install dependencies:

```bash
# Clone the repository
git clone https://github.com/Pp3ng/webCpp.git

# Change directory
cd webCpp

# Install dependencies
npm install
```

2. Start the application:

```bash
# Start the server
node backend/server.js
```

3. Access the application at http://localhost:9527

## Run as a Background Service (Optional)

To keep the application running in the background:

```bash
# Run in background
nohup node backend/server.js > output.log 2>&1 &
```

To check the running process:

```bash
ps aux | grep node
```

To stop the application:

```bash
# Replace <process_id> with the actual process ID
kill <process_id>
```
