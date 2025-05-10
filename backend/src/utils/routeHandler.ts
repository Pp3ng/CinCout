/**
 * Koa Route Handlers
 * Provides utility functions for route handling in Koa
 */
import { Context, Next } from "koa";
import { KoaRequestContext } from "../types";

/**
 * Creates a middleware function that handles errors in async routes
 * @param {Function} handler - Async function to wrap
 * @returns {Function} Koa middleware function
 */
export const koaHandler = <T = any>(
  handler: (ctx: KoaRequestContext<T>) => Promise<void>
): ((ctx: Context, next: Next) => Promise<void>) => {
  return async (ctx: Context, _next: Next) => {
    try {
      // Cast the context to our typed version
      await handler(ctx as KoaRequestContext<T>);
    } catch (error: any) {
      ctx.status = error.status || 500;
      ctx.body = {
        success: false,
        error: error.message || "An unexpected error occurred",
      };

      // Emit the error to app-level error handler
      ctx.app.emit("error", error, ctx);
    }
  };
};
