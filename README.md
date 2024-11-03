# WEB c/c++ code editor and compiler

This project is a web-based code editor and compiler for C/C++ programs. It allows users to write, compile, and run code directly in the browser. The application is built using JavaServer Pages (JSP) and runs on Apache Tomcat.

# sample

![sample](sample.png)

## Features

- Syntax highlighting
- vim keybindings for the editor
- Show assembly code
- Save and load code from local storage
- shortcut keys for compiling and running code

  - ctrl/cmd + enter to compile and run
  - ctrl/cmd + shift + A to show assembly code
  - ctrl/cmd + L to clear the output
  - ctrl/cmd + S to save to local storage
  - ctrl/cmd + O to load from local storage
  - ctrl/cmd + Alt + F to format code

- Multiple themes
- Nord
- Dracula
- Monokai
- Material
- Ayu-dark
- Gruvbox-dark

# setup guide

## Prerequisites

First, install the required packages:

```bash
sudo apt update
sudo apt install openjdk-11-jdk tomcat9 gcc g++ clang-format
```

## Project Setup

Create the necessary directories in Tomcat's webapps folder:

```bash
# Navigate to webapps directory
cd /var/lib/tomcat9/webapps/

# Create project directory
sudo mkdir code-editor
cd code-editor

# Create required subdirectories
sudo mkdir WEB-INF
sudo mkdir tmp
```

### 2. Set File Permissions

Configure the correct permissions for the project:

```bash
# Set directory ownership
sudo chown -R tomcat:tomcat /var/lib/tomcat9/webapps/code-editor

# Set directory permissions
sudo chmod -R 755 /var/lib/tomcat9/webapps/code-editor

# Set tmp directory permissions
sudo chmod 777 /var/lib/tomcat9/webapps/code-editor/tmp
```

### 3. Configure Tomcat Security

Add necessary permissions to Tomcat's security policy:

```bash
# Edit the policy file
sudo vim /var/lib/tomcat9/conf/catalina.policy
```

Add these lines at the end of the file:

```
grant codeBase "file:${catalina.home}/webapps/code-editor/-" {
    permission java.io.FilePermission "/var/lib/tomcat9/webapps/code-editor/tmp/*", "read,write,delete,execute";
    permission java.io.FilePermission "/usr/bin/gcc", "execute";
    permission java.io.FilePermission "/usr/bin/g++", "execute";
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

## Verification

### 1. Check Service Status

```bash
# Check Tomcat status
sudo systemctl status tomcat9

# View logs
sudo tail -f /var/lib/tomcat9/logs/catalina.out
```

### 2. Test Access

Open in web browser:

```
http://your_server_ip:8080/code-editor/
```

### Debugging Commands

```bash
# Check Tomcat process
ps aux | grep tomcat

# Verify file permissions
ls -la /var/lib/tomcat9/webapps/code-editor/

# Test compilers
sudo -u tomcat gcc --version
sudo -u tomcat g++ --version

# Check logs
tail -f /var/lib/tomcat9/logs/catalina.out
```

## Maintenance

Regular maintenance tasks:

1. Update system packages:

```bash
sudo apt update
sudo apt upgrade
```

2. Monitor disk usage:

```bash
df -h /var/lib/tomcat9/webapps/code-editor/tmp
```

3. Check logs periodically:

```bash
sudo tail -f /var/lib/tomcat9/logs/catalina.out
```

4. Clear temporary files:

```bash
sudo rm -rf /var/lib/tomcat9/webapps/code-editor/tmp/*
```
