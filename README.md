# CinCout

This project is a web IDE (integrated development environment) for _C/C++_ language. It allows users to write code, compile, analyze, and run C/C++ programs directly in their web browser. The application is built using TypeScript/Node.js for the backend and HTML/CSS/JavaScript for the frontend.

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

Then you can access the application at http://localhost:9527

### Using Nginx as a Reverse Proxy (Optional)

1. Install Nginx:

```bash
sudo apt update
sudo apt install nginx
```

2. Create an Nginx configuration file:

```bash
sudo vi /etc/nginx/sites-available/CinCout
```

3. Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or server IP

    location / {
        proxy_pass http://localhost:9527;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/CinCout /etc/nginx/sites-enabled/
sudo nginx -t  # Test if the configuration is valid
sudo systemctl restart nginx
```

5. Configure firewall to only allow Nginx and block direct access to port 9527:

```bash
sudo ufw allow 'Nginx Full'  # Allow HTTP and HTTPS through Nginx
sudo ufw deny 9527           # Block direct access to the application port
```

6. Optional: Configure the application to only listen on localhost (127.0.0.1)

For added security, you can modify the server.ts file to only listen on localhost instead of all interfaces:

```typescript
// Find the server.listen line in backend/src/server.ts
// Change from:
// server.listen(port, () => { ... });
// To:
server.listen(port, "127.0.0.1", () => {
  console.log(`Server running at http://localhost:${port}`);
});
```

This ensures application is only accessible through Nginx and not directly via port 9527 from the internet, adding an extra layer of security to deployment.

---

# Contributing 🤝

Welcome contributions! Please feel free to fork to make any creative changes you want and make a pull request.
