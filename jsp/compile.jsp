<%@ page language="java" contentType="text/plain; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="java.io.*,java.util.*,java.util.concurrent.TimeUnit" %>

<%!
    private String sanitizeOutput(String output){
        if (output == null) {
            return "";
        }
        return output.replaceAll("[^:\\s]+\\.(cpp|c|h|hpp):", "");
    }
%>
<%
    // Get submitted code, language and action type
    String code = request.getParameter("code");
    String lang = request.getParameter("lang");
    String action = request.getParameter("action"); // compile, assembly, or both
    
    if (code == null || code.trim().isEmpty()) {
        out.println("Error: No code provided");
        return;
    }
    // Security check for dangerous system calls and operations
    String[] dangerousCalls = {
        // Process manipulation
        "fork", "vfork", "clone", "exec", "system", "popen", 
        "spawn", "posix_spawn", "daemon", "setpgrp", "setsid",
    
        // Network operations
        "socket", "connect", "bind", "listen", "accept", 
        "recv", "send", "sendto", "recvfrom", "gethostbyname",
        "getaddrinfo", "inet_addr", "inet_ntoa", "socketpair",
        "setsockopt", "getsockopt", "shutdown",
    
        // File system operations
        "unlink", "remove", "rename", "symlink", "link",
        "mkdir", "rmdir", "chmod", "chown", "truncate",
        "open", "creat", "mknod", "mkfifo", "mount", "umount",
        "chroot", "pivot_root", "sync", "fsync",
    
        // Process control and signals
        "ptrace", "kill", "raise", "abort", "signal",
        "sigaction", "sigsuspend", "sigwait", "setuid",
        "setgid", "setgroups", "capabilities", "reboot",
        "sysctl", "nice", "setpriority", "setrlimit",
    
        // Shell commands
        "system", "popen", "execl", "execlp", "execle",
        "execv", "execvp", "execvpe", "`", "shell",
        "dlopen", "dlsym", "dlclose",
    
        // Memory manipulation
        "asm", "__asm", "__asm__", "inline", "__builtin",
        "mmap", "mprotect", "shmat", "shmctl", "shmget",
        "semget", "semctl", "semop", "msgget", "msgsnd",
        "msgrcv", "msgctl",
    
        // Dangerous standard library functions
        "gets", "scanf", "getwd", "mktemp", "tmpnam",
        "setenv", "putenv", "alloca", "longjmp", "setjmp",
        "atexit", "_exit", "quick_exit", "at_quick_exit"
    };

    // Check for dangerous function calls
    for (String call : dangerousCalls) {
        if (code.contains(call + "(")) {
            out.println("Error: Restricted function call: " + call);
            return;
        }
    }

    // Check maximum code length
    if (code.length() > 50000) {
        out.println("Error: Code exceeds maximum length of 50,000 characters");
        return;
    }

    // Check for maximum number of lines
    int lineCount = code.split("\n").length;
    if (lineCount > 1000) {
        out.println("Error: Code exceeds maximum of 1,000 lines");
        return;
    }

    // Get user session ID
    String sessionId = request.getSession().getId();

    // Create user-specific temporary directory
    String tmpDir = application.getRealPath("/") + "tmp/" + sessionId + "/";
    File tmpDirFile = new File(tmpDir);
    if (!tmpDirFile.exists()) {
        if (!tmpDirFile.mkdirs()) {
            out.println("Error: Failed to create temporary directory");
            return;
        }
    }

    // Set permissions for temporary directory
    tmpDirFile.setWritable(true, false);
    tmpDirFile.setReadable(true, false);
    tmpDirFile.setExecutable(true, false);
    
    // Set file names based on language
    String sourceFile = tmpDir + "program." + (lang.equals("cpp") ? "cpp" : "c");
    String outputFile = tmpDir + "program.out";
    String asmFile = tmpDir + "program.s";
    
    try {
        // Create and write source code file
        File srcFile = new File(sourceFile);
        if (!srcFile.createNewFile()) {
            out.println("Error: Failed to create source file");
            return;
        }

        // Write source code to file
        FileWriter writer = new FileWriter(srcFile);
        writer.write(code);
        writer.close();

        // Choose compiler based on language and selected compiler
        String compiler = "gcc"; // Default compiler
        if (request.getParameter("compiler") != null) {
            String selectedCompiler = request.getParameter("compiler");
            if (lang.equals("cpp")) {
                compiler = selectedCompiler.equals("clang") ? "clang++" : "g++";
            } else {
                compiler = selectedCompiler.equals("clang") ? "clang" : "gcc";
            }
        }
        
        String standarOption = lang.equals("cpp") ? "-std=c++20" : "-std=c11"; // Default standard
        String optimizationOption = "-O0"; // Default optimization level

        // Choose optimization level
        if(request.getParameter("optimization") != null){
            optimizationOption = request.getParameter("optimization");
        }


        if (action.equals("assembly") || action.equals("both")) {
            // Generate assembly code
            Process asmGen = Runtime.getRuntime().exec(new String[]{
                compiler,
                "-S",                // Generate assembly
                "-masm=intel",       // Use Intel syntax
                "-fno-asynchronous-unwind-tables", // Cleaner assembly output
                optimizationOption,  // Optimization level
                standarOption,
                sourceFile,
                "-o",
                asmFile
            });

            // Error output
            BufferedReader errorReader = new BufferedReader(new InputStreamReader(asmGen.getErrorStream()));
            StringBuilder errorOutput = new StringBuilder();
            String line1;
            while ((line1 = errorReader.readLine()) != null) {
                errorOutput.append(line1).append("\n");
            }

            int exitCode = asmGen.waitFor();
            if (exitCode != 0) {
                out.println("Compilation Error:\n" + sanitizeOutput(errorOutput.toString()));
                return;
            }
        }

        if (action.equals("compile") || action.equals("both")) {
            // Compile source code
            Process compile = Runtime.getRuntime().exec(new String[]{
                compiler,
                standarOption,
                optimizationOption,
                sourceFile,
                "-o",
                outputFile
            });
            
            // Error output
            BufferedReader errorReader = new BufferedReader(new InputStreamReader(compile.getErrorStream()));
            StringBuilder errorOutput = new StringBuilder();
            String line2;
            while ((line2 = errorReader.readLine()) != null) {
                errorOutput.append(line2).append("\n");
            }
            
            int exitCode = compile.waitFor();
            if (exitCode != 0) {
                out.println("Compilation Error:\n" + sanitizeOutput(errorOutput.toString()));
                return;
            }

            // Execute the compiled program with resource limits
            if (exitCode == 0) {
                String[] command = {
                    "/bin/bash",
                    "-c",
                    String.format(
                        "ulimit -v 102400 && " +    // Virtual memory limit (100MB)
                        "ulimit -m 102400 && " +    // Max memory limit (100MB)
                        "ulimit -t 10 && " +        // CPU time limit (10 seconds)
                        "ulimit -s 8192 && " +      // Stack size limit (8MB)
                        "%s 2>&1",                  // Execute program and redirect stderr to stdout
                        outputFile
                    )
                };

                ProcessBuilder processBuilder = new ProcessBuilder(command);
                processBuilder.redirectErrorStream(true);
                Process execute = processBuilder.start();

                // Read program output with timeout
                BufferedReader outputReader = new BufferedReader(
                    new InputStreamReader(execute.getInputStream())
                );
                StringBuilder programOutput = new StringBuilder();
                String line3;
                
                boolean completed = execute.waitFor(10, TimeUnit.SECONDS);
                if (!completed) {
                    execute.destroyForcibly();
                    out.println("Error: Program execution timed out (10 seconds)");
                    return;
                }

                while ((line3 = outputReader.readLine()) != null) {
                    programOutput.append(line3).append("\n");
                }

                int exitValue = execute.exitValue();
                String output = programOutput.toString();

                if (exitValue != 0) {
                    if (output.contains("bad_alloc") || output.contains("out of memory")) {
                        out.println("Error: Program exceeded memory limit (100MB)");
                    } else if (output.contains("Killed") || exitValue == 137 || exitValue == 9) {
                        out.println("Error: Program killed (exceeded memory limit)");
                    } else if (exitValue == 124 || exitValue == 142) {
                        out.println("Error: Program execution timed out (10 seconds)");
                    } else {
                        out.println("Program output (exit code " + exitValue + "):\n" + output);
                    }
                } else {
                    out.println(output);
                }
            }
        }

        // Output assembly if requested
        if (action.equals("assembly") || action.equals("both")) {
            File asmFileObj = new File(asmFile);
            if (asmFileObj.exists()) {
                BufferedReader asmReader = new BufferedReader(new FileReader(asmFile));
                StringBuilder asmOutput = new StringBuilder();
                String line4;
                while ((line4 = asmReader.readLine()) != null) {
                    asmOutput.append(line4).append("\n");
                }
                asmReader.close();
                out.println(asmOutput.toString());
            }
        }

    } catch (Exception e) {
        out.println("Error: " + e.getMessage());
        e.printStackTrace(new PrintWriter(out));
    } finally {
        // Clean up
        try {
            new File(sourceFile).delete();
            new File(outputFile).delete();
            new File(asmFile).delete();

            File temDirFile = new File(application.getRealPath("/") + "tmp/" +
            request.getSession().getId() + "/");
            if(temDirFile.exists()){
                temDirFile.delete();
            }
        } catch (Exception e) {
            // Ignore cleanup errors
        }
    }
%>