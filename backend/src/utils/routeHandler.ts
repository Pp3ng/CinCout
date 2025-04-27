/**
 * Route handler utilities for common patterns in route implementations
 */
import { Request, Response, NextFunction } from "express";

/**
 * Standard API response structure
 */
export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Base request interface for code operations
 */
export interface CodeRequest {
  code: string;
  lang: string;
  compiler?: string;
  optimization?: string;
}

/**
 * Generic async route handler to reduce boilerplate and standardize error handling
 * @param fn - The route handler function to wrap
 * @returns A middleware function that handles errors
 */
export const asyncRouteHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      console.error(`Route error:`, error);
      const errorMessage = (error as Error).message || String(error);
      res.status(500).json({
        success: false,
        error: `An error occurred: ${errorMessage}`,
      });
    }
  };
};
