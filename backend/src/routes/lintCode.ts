/**
 * Lint code router
 * Handles static code analysis using cppcheck
 */
import Router from "koa-router";
import { koaHandler } from "../utils/routeHandler";
import { codeProcessingService } from "../utils/codeProcessingService";
import { AppError, LintCodeRequest } from "../types";

const router = new Router();

/**
 * POST /api/lintCode
 * Runs static code analysis on provided code
 */
router.post(
  "/",
  koaHandler<LintCodeRequest>(async (ctx) => {
    const { code } = ctx.request.body;

    // Validate request
    if (!code) {
      throw new AppError("No code provided", 400);
    }

    // Run lint code check
    const result = await codeProcessingService.runLintCode(code);

    if (result.success) {
      // Return formatted report
      ctx.body = result.report;
    } else {
      throw new AppError(`Lint code error: ${result.error}`, 500);
    }
  })
);

export default router;
