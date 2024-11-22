<%@ page language="java" contentType="text/plain; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="java.io.*,java.util.*" %>
<%!
    private String formatMemcheckOutput(String text) {
        if (text == null) return "";
        //Remove valgrind prefix and extra spaces
        text = text.replaceAll("==\\d+== ", "")
                  .replaceAll("\\s+from\\s+", " from ")
                  .replaceAll("in \\/.*?\\/([^\\/]+)\\)", "in $1)")
                  .replaceAll("^\\s*\\n", "")
                  .replaceAll("\\n\\s*\\n", "\n")
        //program.c:10 -> ###LINE:10###
                  .replaceAll("\\((?:program\\.c|program\\.cpp):(\\d+)\\)", 
                             "###LINE:$1###")
        //Mark memory leaks
                  .replaceAll("(\\d+ bytes? in \\d+ blocks? are definitely lost.*?)(?=\\s*at|$)",
                             "###LEAK:$1###");
        return text;
    }
%>
<%!
    private String sanitizeOutput(String output){
        if (output == null) {
            return "";
        }
        return output.replaceAll("[^:\\s]+\\.(cpp|c|h|hpp):", "");
    }
%>
<%
    String code = request.getParameter("code");
    String lang = request.getParameter("lang");
    
    if (code == null || code.trim().isEmpty()) {
        out.println("Error: No code provided");
        return;
    }

    String sessionId = request.getSession().getId();
    String tmpDir = application.getRealPath("/") + "tmp/" + sessionId + "/";
    File tmpDirFile = new File(tmpDir);
    if (!tmpDirFile.exists()) {
        if (!tmpDirFile.mkdirs()) {
            out.println("Error: Failed to create temporary directory");
            return;
        }
    }

    String sourceFile = tmpDir + "program." + (lang.equals("cpp") ? "cpp" : "c");
    String outputFile = tmpDir + "program.out";
    String valgrindLog = tmpDir + "valgrind.log";

    try {
        File srcFile = new File(sourceFile);
        FileWriter writer = new FileWriter(srcFile);
        writer.write(code);
        writer.close();

        String compiler = lang.equals("cpp") ? "g++" : "gcc";
        String standardOption = lang.equals("cpp") ? "-std=c++20" : "-std=c11";

        Process compile = Runtime.getRuntime().exec(new String[]{
            compiler,
            "-g",
            standardOption,
            sourceFile,
            "-o",
            outputFile
        });

        BufferedReader errorReader = new BufferedReader(new InputStreamReader(compile.getErrorStream()));
        StringBuilder errorOutput = new StringBuilder();
        String line;
        while ((line = errorReader.readLine()) != null) {
            errorOutput.append(line).append("\n");
        }

        int exitCode = compile.waitFor();
        if (exitCode != 0) {
            out.println("Compilation Error:\n" + sanitizeOutput(errorOutput.toString()));
            return;
        }

        Process valgrind = Runtime.getRuntime().exec(new String[]{
            "valgrind",
            "--tool=memcheck",  // Use memcheck tool
            "--leak-check=full",// Enable full leak check
            "--show-leak-kinds=all",// Show all kinds of leaks
            "--track-origins=yes",// Enable origin tracking
            "--log-file=" + valgrindLog,
            outputFile
        });

        valgrind.waitFor();

        BufferedReader logReader = new BufferedReader(new FileReader(valgrindLog));
        StringBuilder report = new StringBuilder();
        boolean startReading = false;

        while((line = logReader.readLine()) != null) {
            if (line.contains("HEAP SUMMARY:")) {
                startReading = true;
            }

            if(startReading && !line.trim().isEmpty() && !line.contains("For lists of")) {
                if (report.length() > 0) {
                    report.append("\n");
                }
                report.append(line);
            }
        }
        logReader.close();
        out.println(formatMemcheckOutput((report.toString())));
    } catch (Exception e) {
        out.println("Error: " + e.getMessage());
        e.printStackTrace(new PrintWriter(out));
    } finally {

        new File(sourceFile).delete();
        new File(outputFile).delete();
        new File(valgrindLog).delete();
        new File(tmpDir).delete();
    }
%>