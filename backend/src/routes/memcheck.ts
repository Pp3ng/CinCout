/**
 * Memory checking router
 */
import express, { Request, Response } from "express";
import {
  createCompilationEnvironment,
  runMemoryCheck,
  CompilationOptions,
} from "../utils/compilationService";
import { asyncRouteHandler, CodeRequest } from "../utils/routeHandler";

const router = express.Router();

interface MemcheckRequest extends CodeRequest {}

router.post(
  "/",
  asyncRouteHandler(async (req: Request, res: Response) => {
    const { code, lang, compiler, optimization } = req.body as MemcheckRequest;

    // Create compilation environment
    const env = createCompilationEnvironment(lang);

    try {
      // Set up compilation options
      const options: CompilationOptions = {
        lang,
        compiler,
        optimization,
      };

      // Run memory check
      const result = await runMemoryCheck(env, code, options);

      if (result.success) {
        res.send(result.report);
      } else {
        res.status(400).send(`Compilation Error:\n${result.error}`);
      }
    } finally {
      // Clean up temporary files
      env.tmpDir.removeCallback();
    }
  })
);

export default router;
