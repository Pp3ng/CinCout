/**
 * Code formatting router
 */
import express, { Request, Response } from "express";
import { formatCode } from "../utils/compilationService";
import { asyncRouteHandler } from "../utils/routeHandler";
import { FormatRequest } from "../types";

const router = express.Router();

router.post(
  "/",
  asyncRouteHandler(async (req: Request, res: Response) => {
    const { code } = req.body as FormatRequest;

    // Format code using the centralized service
    const result = await formatCode(code, "WebKit");

    if (result.success) {
      res.send(result.formattedCode);
    } else {
      res.status(500).send(`Formatting Error: ${result.error}`);
    }
  })
);

export default router;
