/**
 * Style check router
 */
import Router from "koa-router";
import { Context } from "koa";
import { runStyleCheck } from "../utils/compilationService";
import { koaHandler } from "../utils/routeHandler";
import { StyleCheckRequest } from "../types";

const router = new Router();

router.post(
  "/",
  koaHandler(async (ctx: Context) => {
    const { code } = ctx.request.body as StyleCheckRequest;

    if (!code) {
      ctx.status = 400;
      ctx.body = "No code provided";
      return;
    }

    // Run style check
    const result = await runStyleCheck(code);

    if (result.success) {
      ctx.body = result.report;
    } else {
      ctx.status = 500;
      ctx.body = `Style check error: ${result.error}`;
    }
  })
);

export default router;
