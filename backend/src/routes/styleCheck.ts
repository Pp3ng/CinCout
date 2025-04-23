/**
 * Style checking router
 */
import express, { Request, Response } from "express";
import {
  createTempDirectory,
  writeCodeToFile,
  executeCommand,
  formatOutput,
  asyncRouteHandler,
  CodeRequest,
} from "../utils/routeHandler";

const router = express.Router();

interface StyleCheckRequest extends CodeRequest {}

router.post(
  "/",
  asyncRouteHandler(async (req: Request, res: Response) => {
    const { code } = req.body as StyleCheckRequest;

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
        res.send(
          "<div class='output-block'><span style='color: #50fa7b; font-weight: bold;'><i class='fas fa-check-circle'></i> No issues found. Your code looks good!</span></div>"
        );
      } else {
        // Apply formatting to style check output
        const formattedOutput = formatOutput(output, "style");
        res.send(formattedOutput);
      }
    } finally {
      // Clean up temporary files
      tmpDir.removeCallback();
    }
  })
);

export default router;
