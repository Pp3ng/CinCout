/**
 * Templates router
 * Handles code templates access
 */
import Router from "koa-router";
import fs from "fs-extra";
import path from "path";
import { koaHandler } from "../utils/routeHandler";
import { AppError } from "../types";

const router = new Router();
const templatesDir = path.join(__dirname, "../templates");
const templateCache: Record<string, { list: string[]; templates: Record<string, string> }> = {};

/**
 * Load template list for a specific language
 */
async function loadTemplateList(lang: string): Promise<string[]> {
  // Check if templates are already cached
  if (lang in templateCache && templateCache[lang]) {
    return templateCache[lang].list;
  }

  const langDir = path.join(templatesDir, lang);
  try {
    // Check if directory exists
    if (!fs.existsSync(langDir)) {
      throw new Error(`Template directory for ${lang} not found`);
    }

    // Read all template files and extract names
    const files = await fs.readdir(langDir);
    const templateNames = files
      .filter(file => file.endsWith(".c") || file.endsWith(".cpp"))
      .map(file => file.replace(/\.[^.]+$/, ""));
    
    // Initialize cache entry if needed
    if (!templateCache[lang]) {
      templateCache[lang] = { list: templateNames, templates: {} };
    } else {
      templateCache[lang].list = templateNames;
    }
    
    return templateNames;
  } catch (error) {
    console.error(`Error loading template list for ${lang}:`, error);
    throw new AppError(`Failed to load template list for ${lang}`, 500);
  }
}

/**
 * Load a specific template content
 */
async function loadTemplateContent(lang: string, templateName: string): Promise<string> {
  // Check if template is already cached
  if (templateCache[lang]?.templates[templateName]) {
    return templateCache[lang].templates[templateName];
  }
  
  // Ensure template list is loaded
  if (!templateCache[lang]) {
    await loadTemplateList(lang);
  }

  const langDir = path.join(templatesDir, lang);
  let fileName = `${templateName}.${lang === 'cpp' ? 'cpp' : 'c'}`;
  let filePath = path.join(langDir, fileName);
  
  try {
    // Read template content
    const content = await fs.readFile(filePath, "utf8");
    
    // Cache the content
    templateCache[lang].templates[templateName] = content;
    
    return content;
  } catch (error) {
    console.error(`Error loading template content for ${templateName} (${lang}):`, error);
    throw new AppError(`Failed to load template '${templateName}' for ${lang}`, 500);
  }
}

/**
 * Returns list of templates for a specified language
 */
router.get(
  "/:lang",
  koaHandler<any>(async (ctx) => {
    const { lang } = ctx.params;
    
    // Validate language
    if (lang !== "c" && lang !== "cpp") {
      throw new AppError(`Unsupported language: ${lang}`, 400);
    }
    
    try {
      // Load template list
      const templateNames = await loadTemplateList(lang);
      ctx.body = { list: templateNames };
    } catch (error) {
      throw error; // Will be handled by koaHandler
    }
  })
);

/**
 * GET /api/templates/:lang/:template
 * Returns content of a specific template
 */
router.get(
  "/:lang/:template",
  koaHandler<any>(async (ctx) => {
    const { lang, template } = ctx.params;
    
    // Validate language
    if (lang !== "c" && lang !== "cpp") {
      throw new AppError(`Unsupported language: ${lang}`, 400);
    }
    
    try {
      // Load template content
      const content = await loadTemplateContent(lang, template);
      ctx.body = content;
    } catch (error) {
      throw error; // Will be handled by koaHandler
    }
  })
);

export default router;
