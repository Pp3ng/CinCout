import { TemplateCache } from "../types";

// Template state
const templateState = {
  cache: {
    lists: {},
    contents: {},
  } as TemplateCache,
  initialized: false,
  TIMEOUT: 5000, // 5 seconds
};

/**
 * Load template list for a specific language
 */
export const getTemplateList = async (language: string): Promise<string[]> => {
  // Return cached list if available
  if (templateState.cache.lists[language])
    return templateState.cache.lists[language];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      templateState.TIMEOUT
    );

    const response = await fetch(`/api/templates/${language}`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to load templates: ${response.statusText}`);
    }

    const data = await response.json();
    templateState.cache.lists[language] = data.list;
    return data.list;
  } catch (error: unknown) {
    console.error(`Failed to load template list for ${language}:`, error);
    return [];
  }
};

/**
 * Load template content for a specific language and template name
 */
export const getTemplateContent = async (
  language: string,
  templateName: string
): Promise<string> => {
  const cacheKey = `${language}:${templateName}`;
  if (templateState.cache.contents[cacheKey])
    return templateState.cache.contents[cacheKey];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      templateState.TIMEOUT
    );

    const response = await fetch(
      `/api/templates/${language}/${encodeURIComponent(templateName)}`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.statusText}`);
    }

    const data = await response.text();
    templateState.cache.contents[cacheKey] = data;
    return data;
  } catch (error: unknown) {
    console.error(
      `Failed to load template ${templateName} for ${language}:`,
      error
    );
    return `// Error loading template: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
};
