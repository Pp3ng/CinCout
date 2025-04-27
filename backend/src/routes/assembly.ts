/**
 * Assembly code generation router
 */
import express, { Request, Response } from "express";
import {
  createCompilationEnvironment,
  generateAssembly,
  CompilationOptions,
} from "../utils/compilationService";
import { asyncRouteHandler, CodeRequest } from "../utils/routeHandler";

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
    const env = createCompilationEnvironment(lang);

    try {
      // Set up compilation options
      const options: CompilationOptions = {
        lang,
        compiler: selectedCompiler,
        optimization,
      };

      // Generate assembly code
      const result = await generateAssembly(env, code, options);

      if (result.success) {
        res.send(result.assembly);
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
