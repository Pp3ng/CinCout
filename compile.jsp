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

    // Create temporary directory
    String tmpDir = application.getRealPath("/") + "tmp/";
    new File(tmpDir).mkdir();
    
    // Set file names based on language
    String sourceFile = tmpDir + "program." + (lang.equals("cpp") ? "cpp" : "c");
    String outputFile = tmpDir + "program.out";
    String asmFile = tmpDir + "program.s";
    
    try {
        // Write source code to file
        FileWriter writer = new FileWriter(sourceFile);
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
            
            asmGen.waitFor();
            
            // Read assembly file
            BufferedReader asmReader = new BufferedReader(new FileReader(asmFile));
            StringBuilder asmOutput = new StringBuilder();
            String line;
            while ((line = asmReader.readLine()) != null) {
                asmOutput.append(line).append("\n");
            }
            asmReader.close();
            
            if (action.equals("assembly")) {
                out.println(asmOutput.toString());
                return;
            }
        }

        if (action.equals("compile") || action.equals("both")) {
            // Compile code
            Process compile = Runtime.getRuntime().exec(new String[]{
                compiler,
                sourceFile,
                "-o",
                outputFile,
                "-Wall"
            });
            
            compile.waitFor();

            // Check for compilation errors
            BufferedReader errorReader = new BufferedReader(new InputStreamReader(compile.getErrorStream()));
            StringBuilder errors = new StringBuilder();
            String line;
            while ((line = errorReader.readLine()) != null) {
                errors.append(line).append("\n");
            }

            if (errors.length() > 0) {
                out.println("Compilation Error:\n" + errors.toString());
                return;
            }

            // Run the compiled program
            final Process run = Runtime.getRuntime().exec(outputFile);
            
            // Create a timer for timeout
            Timer timer = new Timer();
            timer.schedule(new TimerTask() {
                @Override
                public void run() {
                    run.destroy();
                }
            }, 5000);

            // Get program output
            BufferedReader outputReader = new BufferedReader(new InputStreamReader(run.getInputStream()));
            StringBuilder output = new StringBuilder();
            while ((line = outputReader.readLine()) != null) {
                output.append(line).append("\n");
            }

            // Get program errors
            errorReader = new BufferedReader(new InputStreamReader(run.getErrorStream()));
            while ((line = errorReader.readLine()) != null) {
                output.append("Error: ").append(line).append("\n");
            }

            timer.cancel();
            
            int exitCode = run.waitFor();
            if (exitCode == 143) {
                out.println("Error: Program execution timed out");
            } else {
                out.println(output.toString());
            }
        }

    } catch (Exception e) {
        out.println("System Error: " + e.getMessage());
    } finally {
        // Cleanup temporary files
        new File(sourceFile).delete();
        new File(outputFile).delete();
        new File(asmFile).delete();
    }
%>
