<%@ page language="java" contentType="text/plain; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="java.io.*,java.util.*" %>
<%
    String code = request.getParameter("code");
    if (code == null || code.trim().isEmpty()) {
        out.println("Error: No code provided");
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

    String inFile = tmpDir + "input.cpp";

    try {
        // Create input file
        File srcFile = new File(inFile);
        if (!srcFile.createNewFile()) {
            out.println("Error: Failed to create input file");
            return;
        }

        // Write code to file
        FileWriter writer = new FileWriter(srcFile);
        writer.write(code);
        writer.close();

        // Run cppcheck with text output and suppress missing includes
        Process cppcheck = Runtime.getRuntime().exec(new String[]{
            "cppcheck",
            "--enable=all",           // Enable all checks
            "--suppress=missingInclude", // Suppress missing header file warnings
            inFile
        });

        // Read cppcheck output (plain text)
        BufferedReader reader = new BufferedReader(new InputStreamReader(cppcheck.getErrorStream()));
        StringBuilder output = new StringBuilder();
        String line;
        boolean hasOutput = false;
        while ((line = reader.readLine()) != null) {
            // Remove file path
            if (line.contains(":")) {
                String[] parts = line.split(":");
                if (parts.length >= 4) {
                    StringBuilder newLine = new StringBuilder();
                    newLine.append(parts[1]).append(":"); // Row
                    newLine.append(parts[2]).append(": "); // Col
                    // Error message
                    for (int i = 3; i < parts.length; i++) {
                        newLine.append(parts[i]);
                        if (i < parts.length - 1) {
                            newLine.append(":");
                        }
                    }
                    output.append(newLine).append("\n");
                    hasOutput = true;
                }
            }
        }
        reader.close();

        int exitCode = cppcheck.waitFor();

        if (!hasOutput) {
            out.println("No issues found.");
        } else {
            out.println(output.toString());
        }

    } catch (Exception e) {
        out.println("Error: " + e.getMessage());
        e.printStackTrace(new PrintWriter(out));
    } finally {
        // Clean up
        try {
            new File(inFile).delete();

            File temDirFile = new File(application.getRealPath("/") + "tmp/" +
            request.getSession().getId() + "/");
            if (temDirFile.exists()) {
                temDirFile.delete();
            }
        } catch (Exception e) {
            // Ignore cleanup errors
        }
    }
%>