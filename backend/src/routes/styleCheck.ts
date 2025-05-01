/**
 * Style check router
 * Handles static code analysis using cppcheck
 */
import Router from "koa-router";
import { koaHandler } from "../utils/routeHandler";
import { compilationService } from "../utils/compilationService";
import { 
  AppError,
  StyleCheckRequest
} from "../types";

const router = new Router();

/**
 * POST /api/styleCheck
 * Runs static code analysis on provided code
 */
router.post(
  "/",
  koaHandler<StyleCheckRequest>(async (ctx) => {
    const { code } = ctx.request.body;

    // Validate request
    if (!code) {
      throw new AppError("No code provided", 400);
    }

    // Run style check
    const result = await compilationService.runStyleCheck(code);

    if (result.success) {
      // Return formatted report
      ctx.body = result.report;
    } else {
      throw new AppError(`Style check error: ${result.error}`, 500);
    }
  })
);

export default router;
