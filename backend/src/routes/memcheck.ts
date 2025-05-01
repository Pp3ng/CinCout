/**
 * Memory check router
 * Handles memory leak detection using valgrind
 */
import Router from "koa-router";
import { koaHandler } from "../utils/routeHandler";
import { compilationService } from "../utils/compilationService";
import { 
  AppError,
  MemcheckRequest 
} from "../types";

const router = new Router();

/**
 * POST /api/memcheck
 * Runs memory leak detection on provided code
 */
router.post(
  "/",
  koaHandler<MemcheckRequest>(async (ctx) => {
    const { code, lang, compiler, optimization } = ctx.request.body;

    // Validate request
    if (!code) {
      throw new AppError("No code provided", 400);
    }

    // Create environment for memory check
    const env = compilationService.createCompilationEnvironment(lang || "c");

    try {
      // Run memory check
      const result = await compilationService.runMemoryCheck(env, code, {
        lang: lang || "c",
        compiler,
        optimization,
      });

      // Clean up temporary files
      env.tmpDir.removeCallback();

      if (result.success) {
        // Return formatted report
        ctx.body = result.report;
      } else {
        throw new AppError(`Memory check error: ${result.error}`, 500);
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
