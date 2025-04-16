# CinCout

This project is a web IDE (integrated development environment) for _C/C++_ language. It allows users to write code, compile, analyze, and run C/C++ programs directly in their web browser. The application is built using TypeScript/Node.js for the backend and HTML/CSS/TypeScript for the frontend. It provides a user-friendly interface with rich features.

<div align="center">
<img src="frontend/assets/cincout.png" alt="logo" width="400" />

[![wakatime](https://wakatime.com/badge/user/018b0b2d-ab3f-4d4d-941c-c52b8275e363/project/8f5d92a6-21a5-4e54-9636-bc466e78d86f.svg)](https://wakatime.com/badge/user/018b0b2d-ab3f-4d4d-941c-c52b8275e363/project/8f5d92a6-21a5-4e54-9636-bc466e78d86f)

</div>

# Screenshots 📷

![sample](README/sample.png)

# Try it (no guarantee always available due to myself's server)

http://39.105.45.170

---

# Architecture

This is the architecture diagram of the project.Following frontend and backend isolated architecture.
![architecture](README/Architecture.png)

---

# Features ✨

| Category          | Feature                 | Description                                  | Implementation                        |
| ----------------- | ----------------------- | -------------------------------------------- | ------------------------------------- |
| **Code Editor**   | Syntax Highlighting     | Language-specific highlighting for C/C++     | `frontend/ts/editor.ts`               |
|                   | Code Folding            | Collapsible code blocks and sections         | `frontend/ts/editor.ts`               |
|                   | Vim Mode                | Optional Vim keybindings for editor          | `frontend/ts/editor.ts`               |
|                   | Code Snapshot           | Save code as image with syntax highlighting  | `frontend/ts/handlers.ts`             |
| **Compilation**   | Multiple Compilers      | Support for GCC and Clang                    | `backend/src/routes/compile.ts`       |
|                   | Optimization Levels     | Various optimization flags (-O0 to -O3, -Os) | `backend/src/routes/compile.ts`       |
|                   | Assembly Generation     | View generated assembly code                 | `backend/src/routes/compile.ts`       |
| **Execution**     | Real-time Output        | Live program output via terminal             | `frontend/ts/handlers.ts`             |
|                   | Interactive Terminal    | PTY-based terminal for interactive programs  | `backend/src/utils/sessionManager.ts` |
|                   | WebSocket Communication | Bidirectional real-time communication        | `frontend/ts/websocket.ts`            |
|                   | Session Management      | Isolated execution environments per session  | `backend/src/utils/sessionManager.ts` |
| **Code Analysis** | Style Checking          | Static code analysis with cppcheck           | `backend/src/routes/styleCheck.ts`    |
|                   | Memory Analysis         | Memory leak detection with Valgrind          | `backend/src/routes/memcheck.ts`      |
|                   | Code Formatting         | Automatic code formatting with clang-format  | `backend/src/routes/format.ts`        |
| **UI/UX**         | Multiple Themes         | Various editor and terminal color schemes    | `frontend/ts/themes.ts`               |
|                   | Responsive Design       | Mobile-friendly interface and layout         | `frontend/css/responsive.css`         |
|                   | Tab System              | Tabbed interface for outputs and assembly    | `frontend/css/layout.css`             |
|                   | Keyboard Shortcuts      | Customized shortcuts for common actions      | `frontend/ts/shortcuts.ts`            |

---

# Shortcut Keys 🔑

| Action           | Windows/Linux | macOS      |
| ---------------- | ------------- | ---------- |
| Compile and Run  | Ctrl + Enter  | ⌘ + Return |
| Clear Output     | Ctrl + L      | ⌘ + L      |
| Save Code        | Ctrl + S      | ⌘ + S      |
| Code Snapshot    | Ctrl + P      | ⌘ + P      |
| Open Code File   | Ctrl + O      | ⌘ + O      |
| Toggle Code Fold | Ctrl + K      | ⌘ + K      |
| Close Output     | ESC           | ESC        |
| View Assembly    | Alt + 1       | ^ + 1      |
| Format Code      | Alt + 2       | ^ + 2      |
| Style Check      | Alt + 3       | ^ + 3      |
| Memory Check     | Alt + 4       | ^ + 4      |

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
git clone https://github.com/Pp3ng/CinCout.git
```

2. Build and start the application:

```bash
# Install dependencies and build both frontend and backend
npm install
npm run build

# Start the server
npm start
```

3. Access the application at http://localhost:9527

---

## Run with Docker (Recommended)

Docker provides an isolated environment with all dependencies pre-installed, making deployment simple and ensures safety and security.

please make sure you have Docker installed on your system. You can follow the official [Docker installation guide](https://docs.docker.com/get-docker/) for your operating system.

This project provides a Dockerfile that allows you to run the application in a Docker container.

### Build and Run the Docker Image

```bash
# Navigate to project directory
cd CinCout
# Build and run
docker-compose up --build -d

```

#### or

pull the pre-built image from Docker Hub:

```bash
docker pull pp3ng/cincout:latest
docker run -d -p 9527:9527 pp3ng/cincout:latest
```

Then you can access the application at http://localhost:9527

---

# Contributing 🤝

Welcome contributions! Please feel free to fork to make any creative changes you want and make a pull request.
