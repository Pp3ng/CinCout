/**
 * Style checking router
 */
import express, { Request, Response } from "express";
import {
  validateCode,
  createTempDirectory,
  writeCodeToFile,
  executeCommand,
  formatOutput,
} from "../utils/helpers";

const router = express.Router();

interface StyleCheckRequest {
  code: string;
  lang: string;
}

router.post("/", async (req: Request, res: Response) => {
  const { code, lang } = req.body as StyleCheckRequest;

  // Validate code
  const validation = validateCode(code);
  if (!validation.valid) {
    return res.status(400).send(validation.message);
  }

  try {
    // Create temporary directory
    const tmpDir = createTempDirectory();
    const inFile = writeCodeToFile(tmpDir.name, "input.cpp", code);

    try {
      // Run cppcheck
      const cppcheckCmd = `cppcheck --enable=all --suppress=missingInclude --suppress=missingIncludeSystem --suppress=unmatchedSuppression --suppress=checkersReport --inline-suppr --verbose "${inFile}" 2>&1`;

      const { stdout } = await executeCommand(cppcheckCmd, {
        shell: true as unknown as string, // Type assertion to fix the error
        failOnError: false,
      });

      let output = "";
      let hasOutput = false;

      const lines = stdout.split("\n");
      for (const line of lines) {
        // Skip specific warnings
        if (
          line.includes("[checkersReport]") ||
          line.includes("missingIncludeSystem") ||
          line.includes("unmatchedSuppression")
        ) {
          continue;
        }

        // Remove file paths
        if (line.includes(":")) {
          const parts = line.split(":");
          if (parts.length >= 4) {
            let newLine = `${parts[1]}:${parts[2]}: `;
            // Error message
            for (let i = 3; i < parts.length; i++) {
              newLine += parts[i];
              if (i < parts.length - 1) {
                newLine += ":";
              }
            }
            output += newLine + "\n";
            hasOutput = true;
          }
        }
      }

      if (!hasOutput) {
        res.send("No issues found.");
      } else {
        // Apply formatting to style check output
        const formattedOutput = formatOutput(output, "style");
        res.send(formattedOutput);
      }
    } finally {
      // Clean up temporary files
      tmpDir.removeCallback();
    }
  } catch (error) {
    res.status(500).send(`Error: ${(error as Error).message || error}`);
  }
});

export default router;
