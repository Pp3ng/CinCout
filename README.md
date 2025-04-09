# WEB C/C++ Code Editor and Compiler

This project is a web IDE (integrated development environment) for _C/C++_ language. It allows users to write code, compile, analyze, and run C/C++ programs directly in their web browser. The application is built using TypeScript/Node.js for the backend and HTML/CSS/JavaScript for the frontend.

# Screenshots 📷

![sample](README/sample.png)

# Try it (no guarantee always available due to myself's server)

http://39.105.45.170

---

# Architecture

This is the architecture diagram of the project.
![architecture](README/Architecture.png)

---

# Features ✨

## Frontend Features

| Category         | Feature              | Description                                 | Implementation                |
| ---------------- | -------------------- | ------------------------------------------- | ----------------------------- |
| **Editor**       | Syntax Highlighting  | Language-specific highlighting for C/C++    | `frontend/ts/editor.ts`       |
|                  | Code Folding         | Collapsible code blocks                     | `frontend/ts/editor.ts`       |
|                  | Auto Brackets        | Automatic closing of brackets               | `frontend/ts/editor.ts`       |
|                  | Font Size Control    | Ctrl + Mouse Wheel to adjust font size      | `frontend/ts/editor.ts`       |
|                  | Code Snapshot        | Save code as image with syntax highlighting | `frontend/ts/handlers.ts`     |
| **UI/UX**        | Multiple Themes      | Different color themes                      | `frontend/ts/themes.ts`       |
|                  | Responsive Design    | Mobile-friendly layout                      | `frontend/css/responsive.css` |
|                  | Custom Scrollbars    | Themed scrollbar design                     | `frontend/css/utilities.css`  |
|                  | Terminal Emulation   | Full terminal emulation with xterm.js       | `frontend/ts/handlers.ts`     |
| **Connectivity** | WebSocket Heartbeat  | Keep-alive ping/pong mechanism              | `frontend/ts/handlers.ts`     |
|                  | Auto-Reconnection    | Reconnect when connection drops             | `frontend/ts/websocket.ts`    |
|                  | Visibility Detection | Resume connections on tab focus             | `frontend/ts/handlers.ts`     |
| **Templates**    | Code Examples        | Built-in code templates                     | `frontend/ts/templates.ts`    |
|                  | Template Selection   | Quick-access template dropdown              | `frontend/index.html`         |

## Backend Features

| Category               | Feature              | Description                         | Implementation                        |
| ---------------------- | -------------------- | ----------------------------------- | ------------------------------------- |
| **Compilation**        | Multiple Compilers   | Support for GCC and Clang           | `backend/src/routes/compile.ts`       |
|                        | Optimization Levels  | -O0 to -O3 and -Os options          | `backend/src/routes/compile.ts`       |
|                        | Assembly View        | View generated assembly code        | `backend/src/routes/compile.ts`       |
|                        | Interactive Terminal | Real-time program interaction       | `backend/src/utils/sessionManager.ts` |
| **Code Analysis**      | Style Checking       | Static code analysis with cppcheck  | `backend/src/routes/styleCheck.ts`    |
|                        | Memory Check         | Memory leak detection with valgrind | `backend/src/routes/memcheck.ts`      |
|                        | Code Formatting      | Automatic code formatting           | `backend/src/routes/format.ts`        |
| **Connection**         | WebSocket Management | Server-side connection monitoring   | `backend/src/server.ts`               |
|                        | Ping/Pong Protocol   | Keep-alive detection system         | `backend/src/routes/compile.ts`       |
|                        | Resource Limits      | Memory, CPU and timeout controls    | `backend/src/utils/sessionManager.ts` |
| **Session Management** | Temporary Files      | Secure creation and cleanup         | `backend/src/utils/helpers.ts`        |
|                        | Process Isolation    | Session-based process management    | `backend/src/utils/sessionManager.ts` |

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
```

2. build

```bash
# install dependencies
npm install
# build frontend and backend
npm run build
# start the server
npm start
```

3. Access the application at http://localhost:9527

---

## Run as a Background Service (Optional)

### Using PM2 to Manage the Application

1. Install PM2:

```bash
# Install PM2 globally
npm install pm2 -g
```

2. Start the application with PM2:

```bash
# Build the TypeScript code
npm run build

# Start the application
pm2 start dist/server.js --name "webCpp"

# Set up startup script to run on server boot
pm2 startup
pm2 save
```

3. Common PM2 commands:

```bash
# Check application status
pm2 status

# Restart application
pm2 restart webCpp

# View logs
pm2 logs webCpp

# Stop application
pm2 stop webCpp

# Delete application from PM2
pm2 delete webCpp
```

### Using Nginx as a Reverse Proxy (Recommended)

1. Install Nginx:

```bash
sudo apt update
sudo apt install nginx
```

2. Create an Nginx configuration file:

```bash
sudo vi /etc/nginx/sites-available/webcpp
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
sudo ln -s /etc/nginx/sites-available/webcpp /etc/nginx/sites-enabled/
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
