import express from "express";
import * as fs from "fs/promises";
import * as path from "path";
import { asyncRouteHandler } from "../utils/routeHandler";

const router = express.Router();
const TEMPLATES_DIR = path.join(__dirname, "../../templates");
const templateCache: Record<string, string> = {};
const templateListsCache: Record<string, string[]> = {};

// Get all templates for a specific language
router.get(
  "/:language/list",
  asyncRouteHandler(async (req, res) => {
    const language = req.params.language;

    // Return from cache if available
    if (templateListsCache[language]) {
      return res.json(templateListsCache[language]);
    }

    try {
      const langPath = path.join(TEMPLATES_DIR, language);
      await fs.access(langPath); // Check if language directory exists

      const files = await fs.readdir(langPath);
      const templateNames = files.map((file) =>
        path.basename(file, path.extname(file))
      );

      if (templateNames.length === 0) {
        return res
          .status(404)
          .json({ error: `No templates found for language: ${language}` });
      }

      // Update cache and return
      templateListsCache[language] = templateNames;
      return res.json(templateNames);
    } catch (error) {
      return res
        .status(404)
        .json({
          error: `Language '${language}' not supported or has no templates`,
        });
    }
  })
);

// Get template content for a specific language and template name
router.get(
  "/:language/:templateName",
  asyncRouteHandler(async (req, res) => {
    const { language, templateName } = req.params;
    const cacheKey = `${language}:${templateName}`;

    // Return from cache if available
    if (templateCache[cacheKey]) {
      return res.json({ content: templateCache[cacheKey] });
    }

    try {
      const langPath = path.join(TEMPLATES_DIR, language);
      await fs.access(langPath); // Check if language directory exists

      const files = await fs.readdir(langPath);
      const templateFile = files.find(
        (file) => path.basename(file, path.extname(file)) === templateName
      );

      if (!templateFile) {
        return res
          .status(404)
          .json({
            error: `Template '${templateName}' not found for language '${language}'`,
          });
      }

      // Read template content
      const content = await fs.readFile(
        path.join(langPath, templateFile),
        "utf8"
      );

      // Update cache and return
      templateCache[cacheKey] = content;
      return res.json({ content });
    } catch (error) {
      return res
        .status(404)
        .json({
          error: `Template not found or language '${language}' not supported`,
        });
    }
  })
);

export default router;
