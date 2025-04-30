import Router from "koa-router";
import { Context } from "koa";
import * as fs from "fs/promises";
import * as path from "path";
import { koaHandler } from "../utils/routeHandler";

const router = new Router();

const TEMPLATES_DIR = path.join(__dirname, "../templates");
const templateCache: Record<string, string> = {};
const templateListsCache: Record<string, string[]> = {};

// Get all templates for a specific language
router.get(
  "/:language/list",
  koaHandler(async (ctx: Context) => {
    const language = ctx.params.language;

    // Return from cache if available
    if (templateListsCache[language]) {
      ctx.body = templateListsCache[language];
      return;
    }

    try {
      const langPath = path.join(TEMPLATES_DIR, language);
      await fs.access(langPath); // Check if language directory exists

      const files = await fs.readdir(langPath);
      const templateNames = files.map((file) =>
        path.basename(file, path.extname(file))
      );

      if (templateNames.length === 0) {
        ctx.status = 404;
        ctx.body = { error: `No templates found for language: ${language}` };
        return;
      }

      // Update cache and return
      templateListsCache[language] = templateNames;
      ctx.body = templateNames;
    } catch (error) {
      ctx.status = 404;
      ctx.body = {
        error: `Language '${language}' not supported or has no templates`,
      };
    }
  })
);

// Get template content for a specific language and template name
router.get(
  "/:language/:templateName",
  koaHandler(async (ctx: Context) => {
    const { language, templateName } = ctx.params;
    const cacheKey = `${language}:${templateName}`;

    // Return from cache if available
    if (templateCache[cacheKey]) {
      ctx.body = { content: templateCache[cacheKey] };
      return;
    }

    try {
      const langPath = path.join(TEMPLATES_DIR, language);
      await fs.access(langPath); // Check if language directory exists

      const files = await fs.readdir(langPath);
      const templateFile = files.find(
        (file) => path.basename(file, path.extname(file)) === templateName
      );

      if (!templateFile) {
        ctx.status = 404;
        ctx.body = {
          error: `Template '${templateName}' not found for language '${language}'`,
        };
        return;
      }

      // Read template content
      const content = await fs.readFile(
        path.join(langPath, templateFile),
        "utf8"
      );

      // Update cache and return
      templateCache[cacheKey] = content;
      ctx.body = { content };
    } catch (error) {
      ctx.status = 404;
      ctx.body = {
        error: `Template not found or language '${language}' not supported`,
      };
    }
  })
);

export default router;
