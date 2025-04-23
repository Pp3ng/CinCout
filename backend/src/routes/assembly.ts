/**
 * Assembly code generation router
 */
import express, { Request, Response } from "express";
import fs from "fs-extra";
import {
  sanitizeOutput,
  getCompilerCommand,
  getStandardOption,
  executeCommand,
  formatOutput,
  createCompilationEnvironment,
  asyncRouteHandler,
  CodeRequest,
} from "../utils/routeHandler";

const router = express.Router();

interface AssemblyRequest extends CodeRequest {}

router.post(
  "/",
  asyncRouteHandler(async (req: Request, res: Response) => {
    const {
      code,
      lang,
      compiler: selectedCompiler,
      optimization,
    } = req.body as AssemblyRequest;
    
    // Create compilation environment
    const { tmpDir, sourceFile, asmFile } = createCompilationEnvironment(lang);

    // Write code to temporary file
    fs.writeFileSync(sourceFile, code);

    try {
      // Determine compiler and options
      const compiler = getCompilerCommand(lang, selectedCompiler);
      const standardOption = getStandardOption(lang);
      const optimizationOption = optimization || "-O0";

      // Generate assembly code
      const asmCmd = `${compiler} -S -fno-asynchronous-unwind-tables ${optimizationOption} ${standardOption} "${sourceFile}" -o "${asmFile}"`;

      try {
        await executeCommand(asmCmd);
      } catch (error) {
        const sanitizedError = sanitizeOutput(error as string);
        // Apply formatting for compiler errors
        const formattedError = formatOutput(sanitizedError, "default");
        return res.status(400).send(`Compilation Error:\n${formattedError}`);
      }

      // Return assembly code
      if (!asmFile) {
        return res.status(500).send("Assembly file path is undefined");
      }
      const assemblyCode = fs.readFileSync(asmFile, "utf8");
      res.send(assemblyCode);
    } finally {
      // Clean up temporary files
      tmpDir.removeCallback();
    }
  })
);

export default router;