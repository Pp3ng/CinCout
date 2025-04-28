/**
 * Style check router
 */
import express, { Request, Response } from "express";
import { runStyleCheck } from "../utils/compilationService";
import { asyncRouteHandler } from "../utils/routeHandler";
import { StyleCheckRequest } from "../types";

const router = express.Router();

router.post(
  "/",
  asyncRouteHandler(async (req: Request, res: Response) => {
    const { code } = req.body as StyleCheckRequest;

    if (!code) {
      return res.status(400).send("No code provided");
    }

    // Run style check
    const result = await runStyleCheck(code);

    if (result.success) {
      res.send(result.report);
    } else {
      res.status(500).send(`Style check error: ${result.error}`);
    }
  })
);

export default router;
