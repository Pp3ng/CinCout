/**
 * Memory checking router
 */
import express, { Request, Response } from "express";
import fs from "fs-extra";
import path from "path";
import {
  validateCode,
  createTempDirectory,
  writeCodeToFile,
  executeCommand,
  getCompilerCommand,
  getStandardOption,
  sanitizeOutput,
  formatOutput,
} from "../utils/helpers";

const router = express.Router();

interface MemcheckRequest {
  code: string;
  lang: string;
  compiler?: string;
  optimization?: string;
}

router.post("/", async (req: Request, res: Response) => {
  const {
    code,
    lang,
    compiler: selectedCompiler,
    optimization,
  } = req.body as MemcheckRequest;

  // Validate code
  const validation = validateCode(code);
  if (!validation.valid) {
    return res.status(400).send(validation.message);
  }

  try {
    // Create temporary directory
    const tmpDir = createTempDirectory();
    const sourceExtension = lang === "cpp" ? "cpp" : "c";
    const sourceFile = writeCodeToFile(
      tmpDir.name,
      `program.${sourceExtension}`,
      code
    );
    const outputFile = path.join(tmpDir.name, "program.out");
    const valgrindLog = path.join(tmpDir.name, "valgrind.log");

    try {
      // Determine compiler and options
      const compiler = getCompilerCommand(lang, selectedCompiler);
      const standardOption = getStandardOption(lang);
      const optimizationOption = optimization || "-O0";

      // Compile code
      const compileCmd = `${compiler} -g ${standardOption} ${optimizationOption} "${sourceFile}" -o "${outputFile}"`;

      try {
        await executeCommand(compileCmd);
      } catch (stderr) {
        const sanitizedError = sanitizeOutput(stderr as string);
        const formattedError = formatOutput(sanitizedError);
        return res.status(400).send(`Compilation Error:\n${formattedError}`);
      }

      // Run Valgrind
      const valgrindCmd = `valgrind --tool=memcheck --leak-check=full --show-leak-kinds=all --track-origins=yes --log-file="${valgrindLog}" "${outputFile}"`;

      await executeCommand(valgrindCmd, { failOnError: false });

      // Read Valgrind log
      const valgrindOutput = fs.readFileSync(valgrindLog, "utf8");

      // Extract important information
      let report = "";
      const lines = valgrindOutput.split("\n");
      let startReading = false;

      for (const line of lines) {
        if (line.includes("HEAP SUMMARY:")) {
          startReading = true;
        }

        if (
          startReading &&
          line.trim() !== "" &&
          !line.includes("For lists of")
        ) {
          report += line + "\n";
        }
      }

      // Format and prepare the result with the new unified formatter
      const formattedReport = formatOutput(report, "memcheck");
      res.send(formattedReport);
    } finally {
      // Clean up temporary files
      tmpDir.removeCallback();
    }
  } catch (error) {
    res.status(500).send(`Error: ${(error as Error).message || error}`);
  }
});

export default router;
