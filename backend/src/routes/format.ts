/**
 * Format router
 * Handles code formatting using clang-format
 */
import Router from "koa-router";
import { koaHandler } from "../utils/routeHandler";
import { compilationService } from "../utils/compilationService";
import { AppError, FormatRequest } from "../types";

const router = new Router();

/**
 * POST /api/format
 * Formats code using clang-format
 */
router.post(
  "/",
  koaHandler<FormatRequest>(async (ctx) => {
    const { code } = ctx.request.body;

    // Validate request
    if (!code) {
      throw new AppError("No code provided", 400);
    }

    // Format the code
    const result = await compilationService.formatCode(code);

    if (result.success) {
      // Return formatted code
      ctx.body = result.formattedCode;
    } else {
      throw new AppError(`Format error: ${result.error}`, 500);
    }
  })
);

export default router;
