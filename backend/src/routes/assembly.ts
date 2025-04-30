/**
 * Assembly code generation route
 */
import Router from "koa-router";
import { Context } from "koa";
import { koaHandler } from "../utils/routeHandler";
import { AssemblyRequest } from "../types";
import {
  createCompilationEnvironment,
  generateAssembly,
} from "../utils/compilationService";

const router = new Router();

router.post(
  "/",
  koaHandler(async (ctx: Context) => {
    const { code, lang, compiler, optimization } = ctx.request
      .body as AssemblyRequest;

    if (!code) {
      ctx.status = 400;
      ctx.body = "No code provided";
      return;
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
      ctx.body = result.assembly;
    } else {
      ctx.status = 500;
      ctx.body = result.error || "Unknown error generating assembly";
    }
  })
);

export default router;
