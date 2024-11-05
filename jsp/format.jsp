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

    String inFile = tmpDir + "input.c";
    String outFile = tmpDir + "output.c";

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

        // Run clang-format
        Process format = Runtime.getRuntime().exec(new String[]{
            "clang-format",
            "-style=WebKit",
            inFile,
            "-i"
        });
        
        // Check for errors
        BufferedReader errorReader = new BufferedReader(new InputStreamReader(format.getErrorStream()));
        StringBuilder errorOutput = new StringBuilder();
        String line;
        while ((line = errorReader.readLine()) != null) {
            errorOutput.append(line).append("\n");
        }
        
        int exitCode = format.waitFor();
        if (exitCode != 0) {
            out.println("Format Error:\n" + errorOutput.toString());
            return;
        }

        // Read formatted code
        BufferedReader reader = new BufferedReader(new FileReader(inFile));
        StringBuilder formatted = new StringBuilder();
        while ((line = reader.readLine()) != null) {
            formatted.append(line).append("\n");
        }
        reader.close();

        out.println(formatted.toString());

    } catch (Exception e) {
        out.println("Error: " + e.getMessage());
        e.printStackTrace(new PrintWriter(out));
    } finally {
        // Clean up
        try {
            new File(inFile).delete();
            new File(outFile).delete();

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