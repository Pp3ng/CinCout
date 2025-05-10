import { TemplateCache } from "../types";
import { getEditorService } from "./editor";

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
const loadTemplateList = async (language: string): Promise<string[]> => {
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
const loadTemplateContent = async (
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

/**
 * Update template dropdown and load selected template
 */
export const updateTemplateList = async (
  forceLoadTemplate = false
): Promise<void> => {
  const languageSelect = document.getElementById(
    "language"
  ) as HTMLSelectElement;
  const templateSelect = document.getElementById(
    "template"
  ) as HTMLSelectElement;

  if (!templateSelect || !languageSelect) {
    console.error("Template or language select elements not found");
    return;
  }

  const language = languageSelect.value || "c";

  // Show loading state
  templateSelect.disabled = true;
  templateSelect.innerHTML = "<option>Loading templates...</option>";

  try {
    const templateNames = await loadTemplateList(language);

    // Clear existing options and add new ones
    templateSelect.innerHTML = "";
    templateSelect.disabled = false;

    if (templateNames.length === 0) {
      templateSelect.innerHTML = "<option>No templates available</option>";
      return;
    }

    templateNames.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      templateSelect.appendChild(option);
    });

    // Select Hello World template if exists, otherwise first template
    const helloWorldIndex = Array.from(templateSelect.options).findIndex(
      (option) => option.value === "Hello World"
    );
    templateSelect.selectedIndex = helloWorldIndex >= 0 ? helloWorldIndex : 0;

    // Load template content when needed
    if (
      !templateState.initialized ||
      forceLoadTemplate ||
      document.activeElement === languageSelect
    ) {
      await loadSelectedTemplate();
    }
  } catch (error: unknown) {
    console.error("Error updating template list:", error);
    templateSelect.innerHTML = "<option>Failed to load templates</option>";
    templateSelect.disabled = false;
  }
};

/**
 * Load the currently selected template
 */
export const loadSelectedTemplate = async (): Promise<void> => {
  const editorService = getEditorService();
  const languageSelect = document.getElementById(
    "language"
  ) as HTMLSelectElement;
  const templateSelect = document.getElementById(
    "template"
  ) as HTMLSelectElement;

  if (!templateSelect || !languageSelect || !editorService) {
    console.error("Required elements not found");
    return;
  }

  const language = languageSelect.value || "c";
  const templateName = templateSelect.value;
  if (!templateName) return;

  try {
    editorService.setValue("// Loading template...");
    const content = await loadTemplateContent(language, templateName);
    editorService.setValue(content);
  } catch (error: unknown) {
    console.error("Error setting template:", error);
    editorService.setValue(
      `// Error loading template: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

// Event handler for language change
export const handleLanguageChange = (): void => {
  updateTemplateList(true);
};

// Initialize templates on app startup
export const initializeTemplates = (): void => {
  updateTemplateList().then(() => {
    templateState.initialized = true;
  });
};

// Export functions for use in other modules
export default {
  loadSelectedTemplate,
  handleLanguageChange,
  initializeTemplates,
};
