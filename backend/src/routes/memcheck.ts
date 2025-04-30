/**
 * Memory check router
 */
import Router from "koa-router";
import { Context } from "koa";
import { runMemoryCheck } from "../utils/compilationService";
import { koaHandler } from "../utils/routeHandler";
import { createCompilationEnvironment } from "../utils/compilationService";
import { MemcheckRequest } from "../types";

const router = new Router();

router.post(
  "/",
  koaHandler(async (ctx: Context) => {
    const { code, lang, compiler, optimization } = ctx.request
      .body as MemcheckRequest;

    if (!code) {
      ctx.status = 400;
      ctx.body = "No code provided";
      return;
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
        ctx.body = result.report;
      } else {
        ctx.status = 500;
        ctx.body = `Memory check error: ${result.error}`;
      }
    } catch (error) {
      // Ensure cleanup on error
      env.tmpDir.removeCallback();
      throw error;
    }
  })
);

export default router;
