/**
 * Memory check router
 */
import express, { Request, Response } from "express";
import { runMemoryCheck } from "../utils/compilationService";
import { asyncRouteHandler } from "../utils/routeHandler";
import { createCompilationEnvironment } from "../utils/compilationService";
import { MemcheckRequest } from "../types";

const router = express.Router();

router.post(
  "/",
  asyncRouteHandler(async (req: Request, res: Response) => {
    const { code, lang, compiler, optimization } = req.body as MemcheckRequest;

    if (!code) {
      return res.status(400).send("No code provided");
    }

    // Create environment for memory check
    const env = createCompilationEnvironment(lang || "c");

    try {
      // Run memory check
      const result = await runMemoryCheck(env, code, {
        lang: lang || "c",
        compiler,
        optimization,
      });

      // Clean up temporary files
      env.tmpDir.removeCallback();

      if (result.success) {
        res.send(result.report);
      } else {
        res.status(500).send(`Memory check error: ${result.error}`);
      }
    } catch (error) {
      // Ensure cleanup on error
      env.tmpDir.removeCallback();
      throw error;
    }
  })
);

export default router;
