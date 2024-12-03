# WEB c/c++ code editor and compiler

This project is a web-based code editor and compiler for C/C++ programs. It allows users to write, compile, and run code directly in the browser. The application is built using JavaServer Pages (JSP) and runs on Apache Tomcat.

# sample

![sample](sample.png)

# Try it(no guarantee always available due to myself's server)

http://121.41.94.212:8080

---

# Features ✨

| Category              | Feature             | Description                              | Implementation  |
| --------------------- | ------------------- | ---------------------------------------- | --------------- |
| **Editor Core**       | Syntax Highlighting | Language-specific highlighting for C/C++ | `editor.js`     |
|                       | Code Folding        | Collapsible code blocks                  | `editor.js`     |
|                       | Auto Brackets       | Automatic closing of brackets            | `editor.js`     |
|                       | Font Size Control   | Ctrl + Mouse Wheel to adjust             | `editor.js`     |
| **Compilation**       | Multiple Compilers  | Support for GCC and Clang                | `compile.jsp`   |
|                       | Optimization Levels | -O0 to -O3 and -Os options               | `memcheck.jsp`  |
|                       | Assembly View       | View generated assembly code             | `editor.js`     |
| **Code Analysis**     | Style Checking      | Static code analysis with cppcheck       | `handlers.js`   |
|                       | Memory Check        | Memory leak detection                    | `memcheck.jsp`  |
|                       | Code Formatting     | Automatic code formatting                | `format.jsp`    |
| **UI/UX**             | Multiple Themes     | 8 different color themes                 | `css/style.css` |
|                       | Responsive Design   | Mobile-friendly layout                   | `css/style.css` |
|                       | Custom Scrollbars   | Themed scrollbar design                  | `css/style.css` |
| **Templates**         | Code Examples       | Built-in code templates                  | `templates.js`  |
|                       | Language Support    | Both C and C++ templates                 | `templates.js`  |
| **Development Tools** | External Resources  | Links to documentation                   | `index.html`    |
|                       | GitHub Integration  | Source code access                       | `index.html`    |

# Shortcut Keys 🔑

| Action             | Windows/Linux    | macOS           |
| ------------------ | ---------------- | --------------- |
| Compile and Run    | Ctrl + Enter     | Cmd + Enter     |
| Show Assembly Code | Ctrl + Shift + A | Cmd + Shift + A |
| Clear Output       | Ctrl + L         | Cmd + L         |
| Save Code          | Ctrl + S         | Cmd + S         |
| Load Code          | Ctrl + O         | Cmd + O         |
| Format Code        | Ctrl + Alt + F   | Cmd + Alt + F   |
| Style Check        | Ctrl + Alt + C   | Cmd + Alt + C   |
| Memory Check       | Ctrl + Alt + L   | Cmd + Alt + L   |

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

---

## Architecture

The following diagram illustrates the architecture of the project:

```
[Browser]                                              [Server]
   |                                                      |
   |  HTTP/HTTPS Request                                  |
   | ------------------------------------------------>    |
   |  POST /compile.jsp                                   |
   |  Content-Type: application/x-www-form-urlencoded     |
   |  code=...&lang=...&compiler=...&optimization=...     |
   |                                                      |
   |                                                      |
   |  HTTP/HTTPS Response                                 |
   | <------------------------------------------------    |
   |  Content-Type: text/plain                            |
   |  Compilation output / Error messages                 |
   |                                                      |
+------------+     +-----------------+     +---------------+
|            |     |                 |     |               |
| CodeMirror |<--->| JavaScript API  |<--->| JSP Backend   |
|   Editor   |     | Processing Layer|     | Services      |
|            |     |                 |     |               |
+------------+     +-----------------+     +---------------+
     |                    |                        |
     |                    |                        |
     v                    v                        v
+------------+     +-----------------+     +-----------------+
| Code Input |     | Request Router  |     | Session Manager |
| Syntax     |     | Parameter       |     | Temp File       |
| Highlight  |     | Processing      |     | Creation        |
+------------+     +-----------------+     +-----------------+
                           |                        |
                           v                        v
                   +-----------------+     +-----------------+
                   | Compile Request |     | GCC/Clang       |
                   | Format Request  |     | clang-format    |
                   | Memory Check    |     | Valgrind        |
                   | Style Check     |     | cppcheck        |
                   +-----------------+     +-----------------+
                           |                        |
                           v                        v
                   +-----------------+     +-----------------+
                   | Result Parser   |     | Output Handler  |
                   | Error Formatter |     | Temp File       |
                   | HTML Renderer   |     | Cleanup         |
                   +-----------------+     +-----------------+
                           |                        |
                           v                        v
                   +------------------------------------- ---+
                   |           Result Display                |
                   | +----------------+  +----------------+  |
                   | | Program Output |  | Assembly Code  |  |
                   | +----------------+  +----------------+  |
                   | | Error Messages |  | Memory Check   |  |
                   | +----------------+  +----------------+  |
                   +------------------------------------- ---+

Data Flow:
code/params -----> Frontend API -----> JSP Processing -----> Compile/Analysis Tools
                                                                |
Result Display <---- Frontend Render <---- Result Parse <------ +
```

# setup guide

## Prerequisites

First, install the required packages:

```bash
sudo apt update
sudo apt install openjdk-11-jdk tomcat9 gcc g++ clang clang-format valgrind cppcheck
```

## Project Setup

Create the necessary directories in Tomcat's webapps folder:

```bash
# Clone the repository
git clone https://github.com/Pp3ng/webCpp.git

# Move the project to Tomcat's webapps folder
mv webCpp /var/lib/tomcat9/webapps/webCpp

# Change directory
cd /var/lib/tomcat9/webapps/webCpp

# Create required subdirectories
sudo mkdir tmp
```

### 2. Set File Permissions

Configure the correct permissions for the project:

```bash
# Change ownership
sudo chown -R tomcat:tomcat /var/lib/tomcat9/webapps/webCpp
# Change permissions
sudo chmod -R 755 /var/lib/tomcat9/webapps/webCpp
# Create tmp directory
sudo mkdir -p /var/lib/tomcat9/webapps/webCpp/tmp
# Change ownership and permissions
sudo chown -R tomcat:tomcat /var/lib/tomcat9/webapps/webCpp/tmp
# Change permissions
sudo chmod -R 777 /var/lib/tomcat9/webapps/webCpp/tmp
```

### 3. Configure Tomcat Security

Add necessary permissions to Tomcat's security policy:

```bash
# Edit the policy file
sudo vim /var/lib/tomcat9/conf/catalina.properties
```

Add these lines at the end of the file:

```
grant codeBase "file:${catalina.home}/webapps/code-editor/-" {
    permission java.io.FilePermission "/var/lib/tomcat9/webapps/code-editor/tmp/*", "read,write,delete,execute";
    permission java.io.FilePermission "/usr/bin/gcc", "execute";
    permission java.io.FilePermission "/usr/bin/g++", "execute";
    permission java.io.FilePermission "/usr/bin/clang", "execute";
    permission java.io.FilePermission "/usr/bin/clang++", "execute";
    permission java.io.FilePermission "/usr/bin/clang-format", "execute";
    permission java.io.FilePermission "/usr/bin/valgrind", "execute";
    permission java.lang.RuntimePermission "createClassLoader";
    permission java.lang.RuntimePermission "getClassLoader";
    permission java.lang.RuntimePermission "setContextClassLoader";
    permission java.lang.RuntimePermission "exitVM.0";
};
```

### 4. Start the Service

Restart Tomcat to apply changes:

```bash
sudo systemctl restart tomcat9
```

then you can visit http://localhost:8080/webCpp/ and enjoy it.
