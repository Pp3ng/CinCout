/**
 * Style checking router
 */
import express, { Request, Response } from "express";
import { runStyleCheck } from "../utils/compilationService";
import { asyncRouteHandler, CodeRequest } from "../utils/routeHandler";

const router = express.Router();

interface StyleCheckRequest extends CodeRequest {}

router.post(
  "/",
  asyncRouteHandler(async (req: Request, res: Response) => {
    const { code } = req.body as StyleCheckRequest;

    // Run style check using the centralized service
    const result = await runStyleCheck(code);

    if (result.success) {
      res.send(result.report);
    } else {
      res.status(500).send(`Style check error: ${result.error}`);
    }
  })
);

export default router;
