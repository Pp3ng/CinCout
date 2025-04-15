/**
 * Code formatting router
 */
import express, { Request, Response } from "express";
import fs from "fs-extra";
import {
  validateCode,
  createTempDirectory,
  writeCodeToFile,
  executeCommand,
} from "../utils/helpers";

const router = express.Router();

interface FormatRequest {
  code: string;
  lang: string;
}

router.post("/", async (req: Request, res: Response) => {
  const { code, lang } = req.body as FormatRequest;

  // Validate code
  const validation = validateCode(code);
  if (!validation.valid) {
    return res.status(400).send(validation.message);
  }

  try {
    // Create temporary directory
    const tmpDir = createTempDirectory();
    const inFile = writeCodeToFile(tmpDir.name, "input.c", code);

    try {
      // Run clang-format
      const formatCmd = `clang-format -style=WebKit "${inFile}" -i`;
      await executeCommand(formatCmd);

      // Read formatted code
      const formattedCode = fs.readFileSync(inFile, "utf8");
      res.send(formattedCode);
    } finally {
      // Clean up temporary files
      tmpDir.removeCallback();
    }
  } catch (error) {
    res.status(500).send(`Error: ${(error as Error).message || error}`);
  }
});

export default router;
