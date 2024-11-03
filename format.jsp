<%@ page language="java" contentType="text/plain; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="java.io.*,java.util.*" %>
<%
    String code = request.getParameter("code");
    if (code == null || code.trim().isEmpty()) {
        out.println("Error: No code provided");
        return;
    }

    String tmpDir = application.getRealPath("/") + "tmp/";
    new File(tmpDir).mkdir();
    String inFile = tmpDir + "input.c";
    String outFile = tmpDir + "output.c";

    try {
        FileWriter writer = new FileWriter(inFile);
        writer.write(code);
        writer.close();

        Process format = Runtime.getRuntime().exec(new String[]{
            "clang-format",
            "-style=LLVM",
            inFile,
            "-i"
        });
        format.waitFor();

        BufferedReader reader = new BufferedReader(new FileReader(inFile));
        StringBuilder formatted = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            formatted.append(line).append("\n");
        }
        reader.close();

        out.println(formatted.toString());

    } catch (Exception e) {
        out.println("Error: " + e.getMessage());
    } finally {
        new File(inFile).delete();
        new File(outFile).delete();
    }
%>