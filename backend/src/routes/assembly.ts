/**
 * Assembly view router
 * Handles assembly code generation
 */
import Router from "koa-router";
import { koaHandler } from "../utils/routeHandler";
import { codeProcessingService } from "../utils/codeProcessingService";
import { AppError, AssemblyRequest } from "../types";

const router = new Router();

/**
 * POST /api/assembly
 * Generates assembly code from provided source code
 */
router.post(
  "/",
  koaHandler<AssemblyRequest>(async (ctx) => {
    const { code, lang, compiler, optimization } = ctx.request.body;

    // Validate request
    if (!code) {
      throw new AppError("No code provided", 400);
    }

    // Create environment for assembly generation
    const env = codeProcessingService.createCompilationEnvironment(lang || "c");

    try {
      // Generate assembly
      const result = await codeProcessingService.generateAssembly(env, code, {
        lang: lang || "c",
        compiler,
        optimization,
      });

      // Clean up temporary files
      env.tmpDir.removeCallback();

      if (result.success) {
        // Return assembly code
        ctx.body = result.assembly;
      } else {
        throw new AppError(`Assembly generation error: ${result.error}`, 500);
      }
    } catch (error) {
      // Ensure cleanup on error
      env.tmpDir.removeCallback();

      // Rethrow to be handled by koaHandler
      throw error;
    }
  })
);

export default router;
