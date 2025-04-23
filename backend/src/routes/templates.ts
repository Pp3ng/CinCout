import express, { Request, Response } from "express";
import * as fs from "fs/promises";
import * as path from "path";
import { asyncRouteHandler } from "../utils/routeHandler";

const router = express.Router();

// Templates directory path
const TEMPLATES_DIR = path.join(__dirname, "../../templates");

// Simple in-memory cache
const templateCache: Record<string, string> = {};
const templateListsCache: Record<string, string[]> = {};

/**
 * Get all templates for a specific language
 */
router.get(
  "/:language/list",
  asyncRouteHandler(async (req: Request, res: Response) => {
    const language = req.params.language;

    try {
      // Check cache first
      if (templateListsCache[language]) {
        return res.json(templateListsCache[language]);
      }

      // Check if language directory exists
      const langPath = path.join(TEMPLATES_DIR, language);
      try {
        await fs.access(langPath);
      } catch (error) {
        return res.status(404).json({
          error: `Language '${language}' not supported or has no templates`,
        });
      }

      // Read template list
      const files = await fs.readdir(langPath);
      const templateNames = files.map((file) =>
        path.basename(file, path.extname(file))
      );

      if (templateNames.length === 0) {
        return res.status(404).json({
          error: `No templates found for language: ${language}`,
        });
      }

      // Update cache
      templateListsCache[language] = templateNames;

      res.json(templateNames);
    } catch (error) {
      console.error(`Error getting templates for ${language}:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  })
);

/**
 * Get template content for a specific language and template name
 */
router.get(
  "/:language/:templateName",
  asyncRouteHandler(async (req: Request, res: Response) => {
    const { language, templateName } = req.params;
    const cacheKey = `${language}:${templateName}`;

    try {
      // Check cache first
      if (templateCache[cacheKey]) {
        return res.json({ content: templateCache[cacheKey] });
      }

      const langPath = path.join(TEMPLATES_DIR, language);

      // Check if language directory exists
      try {
        await fs.access(langPath);
      } catch (error) {
        return res.status(404).json({
          error: `Language '${language}' not supported`,
        });
      }

      // Find matching template file
      const files = await fs.readdir(langPath);
      const templateFile = files.find(
        (file) => path.basename(file, path.extname(file)) === templateName
      );

      if (!templateFile) {
        return res.status(404).json({
          error: `Template '${templateName}' not found for language '${language}'`,
        });
      }

      // Read template content
      const filePath = path.join(langPath, templateFile);
      const content = await fs.readFile(filePath, "utf8");

      // Update cache
      templateCache[cacheKey] = content;

      res.json({ content });
    } catch (error) {
      console.error(
        `Error loading template ${templateName} for ${language}:`,
        error
      );
      res.status(500).json({ error: "Internal server error" });
    }
  })
);

export default router;
