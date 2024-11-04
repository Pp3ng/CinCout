<%@ page language="java" contentType="text/plain; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="java.io.*,java.util.*" %>
<%
    // Get submitted code, language and action type
    String code = request.getParameter("code");
    String lang = request.getParameter("lang");
    String action = request.getParameter("action"); // compile, assembly, or both
    
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

        // Choose compiler based on language
        String compiler = lang.equals("cpp") ? "g++" : "gcc";
        
        if (action.equals("assembly") || action.equals("both")) {
            // Generate assembly code
            Process asmGen = Runtime.getRuntime().exec(new String[]{
                compiler,
                "-S",                // Generate assembly
                "-masm=intel",       // Use Intel syntax
                "-fno-asynchronous-unwind-tables", // Cleaner assembly output
                "-O0",              // No optimization for clearer output
                sourceFile,
                "-o",
                asmFile
            });
            
            //Error output
            BufferedReader errorReader = new BufferedReader(new InputStreamReader(asmGen.getErrorStream()));
            StringBuilder errorOutput = new StringBuilder();
            String line;
            while ((line = errorReader.readLine()) != null) {
                errorOutput.append(line).append("\n");
            }
            
            int exitCode = asmGen.waitFor();
            if (exitCode != 0) {
                out.println("Compilation Error:\n" + errorOutput.toString());
                return;
            }
        }

        if (action.equals("compile") || action.equals("both")) {
            // Compile source code
            Process compile = Runtime.getRuntime().exec(new String[]{
                compiler,
                sourceFile,
                "-o",
                outputFile
            });
            
            // Error output
            BufferedReader errorReader = new BufferedReader(new InputStreamReader(compile.getErrorStream()));
            StringBuilder errorOutput = new StringBuilder();
            String line;
            while ((line = errorReader.readLine()) != null) {
                errorOutput.append(line).append("\n");
            }
            
            int exitCode = compile.waitFor();
            if (exitCode != 0) {
                out.println("Compilation Error:\n" + errorOutput.toString());
                return;
            }

            // Execute the compiled program and output the result
            if (exitCode == 0) {
                Process execute = Runtime.getRuntime().exec(outputFile);
                BufferedReader outputReader = new BufferedReader(new InputStreamReader(execute.getInputStream()));
                StringBuilder programOutput = new StringBuilder();
                while ((line = outputReader.readLine()) != null) {
                    programOutput.append(line).append("\n");
                }
                out.println(programOutput.toString());
            }
        }

        // Output assembly if requested
        if (action.equals("assembly") || action.equals("both")) {
            File asmFileObj = new File(asmFile);
            if (asmFileObj.exists()) {
                BufferedReader asmReader = new BufferedReader(new FileReader(asmFile));
                StringBuilder asmOutput = new StringBuilder();
                String line;
                while ((line = asmReader.readLine()) != null) {
                    asmOutput.append(line).append("\n");
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
        } catch (Exception e) {
            // Ignore cleanup errors
        }
    }
%>