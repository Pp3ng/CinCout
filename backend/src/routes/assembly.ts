/**
 * Assembly code generation route
 */
import express, { Request, Response } from "express";
import { asyncRouteHandler } from "../utils/routeHandler";
import { AssemblyRequest } from "../types";
import {
  createCompilationEnvironment,
  generateAssembly,
} from "../utils/compilationService";

const router = express.Router();

router.post(
  "/",
  asyncRouteHandler(async (req: Request, res: Response) => {
    const { code, lang, compiler, optimization } = req.body as AssemblyRequest;

    if (!code) {
      return res.status(400).send("No code provided");
    }

    // Create environment and generate assembly
    const env = createCompilationEnvironment(lang || "c");
    const result = await generateAssembly(env, code, {
      lang: lang || "c",
      compiler,
      optimization,
    });

    // Clean up temporary files
    env.tmpDir.removeCallback();

    // Return assembly or error
    if (result.success && result.assembly) {
      res.send(result.assembly);
    } else {
      res.status(500).send(result.error || "Unknown error generating assembly");
    }
  })
);

export default router;
