/**
 * Koa Route Handlers
 * Provides utility functions for route handling in Koa
 */
import { Context, Next } from "koa";

/**
 * Creates a middleware function that handles errors in async routes
 * @param {Function} handler - Async function to wrap
 * @returns {Function} Koa middleware function
 */
export const koaHandler = (handler: (ctx: Context) => Promise<void>) => {
  return async (ctx: Context, _next: Next) => {
    try {
      await handler(ctx);
    } catch (error: any) {
      ctx.status = error.status || 500;
      ctx.body = {
        success: false,
        error: error.message || "An unexpected error occurred",
      };

      // Log the error
      console.error("Route error:", error);

      // Emit the error to app-level error handler
      ctx.app.emit("error", error, ctx);
    }
  };
};
