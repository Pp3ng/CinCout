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
  asyncRouteHandler,
  CodeRequest,
} from "../utils/routeHandler";

const router = express.Router();

interface FormatRequest extends CodeRequest {}

router.post(
  "/",
  asyncRouteHandler(async (req: Request, res: Response) => {
    const { code, lang } = req.body as FormatRequest;

    // Validate code
    const validation = validateCode(code);
    if (!validation.valid) {
      return res.status(400).send(validation.message);
    }

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
  })
);

export default router;
