/**
 * Code formatting router
 */
import Router from "koa-router";
import { Context } from "koa";
import { formatCode } from "../utils/compilationService";
import { koaHandler } from "../utils/routeHandler";
import { FormatRequest } from "../types";

const router = new Router();

router.post(
  "/",
  koaHandler(async (ctx: Context) => {
    const { code } = ctx.request.body as FormatRequest;

    // Format code using the centralized service
    const result = await formatCode(code, "WebKit");

    if (result.success) {
      ctx.body = result.formattedCode;
    } else {
      ctx.status = 500;
      ctx.body = `Formatting Error: ${result.error}`;
    }
  })
);

export default router;
