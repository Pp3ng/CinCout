import { TemplateCache } from "./types";
import axios from "axios";
import { getEditorService } from "./editor";

// Cache object
const cache: TemplateCache = {
  lists: {},
  contents: {},
};

// Default timeout for axios operations
const TIMEOUT = 5000; // 5 seconds
let initialized = false;

/**
 * Load template list for a specific language
 */
async function loadTemplateList(language: string): Promise<string[]> {
  // Return cached list if available
  if (cache.lists[language]) return cache.lists[language];

  try {
    const response = await axios.get(`/api/templates/${language}`, {
      timeout: TIMEOUT,
    });
    cache.lists[language] = response.data.list;
    return response.data.list;
  } catch (error: unknown) {
    console.error(`Failed to load template list for ${language}:`, error);
    return [];
  }
}

/**
 * Load template content for a specific language and template name
 */
async function loadTemplateContent(
  language: string,
  templateName: string
): Promise<string> {
  const cacheKey = `${language}:${templateName}`;
  if (cache.contents[cacheKey]) return cache.contents[cacheKey];

  try {
    const response = await axios.get<string>(
      `/api/templates/${language}/${encodeURIComponent(templateName)}`,
      { timeout: TIMEOUT }
    );
    cache.contents[cacheKey] = response.data;
    return response.data;
  } catch (error: unknown) {
    console.error(
      `Failed to load template ${templateName} for ${language}:`,
      error
    );
    return `// Error loading template: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
}

/**
 * Update template dropdown and load selected template
 */
export async function updateTemplateList(forceLoadTemplate = false): Promise<void> {
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

    // Load template content during initialization or when explicitly asked to load
    if (!initialized || forceLoadTemplate || document.activeElement === languageSelect) {
      await loadSelectedTemplate();
    }
  } catch (error: unknown) {
    console.error("Error updating template list:", error);
    templateSelect.innerHTML = "<option>Failed to load templates</option>";
    templateSelect.disabled = false;
  }
}

/**
 * Load the currently selected template
 */
export async function loadSelectedTemplate(): Promise<void> {
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
}

// Event handler for language change - ensure exposed for external calls
export function handleLanguageChange(): void {
  updateTemplateList(true);
}

// Initialize templates on app startup but don't set up event listeners here
export function initializeTemplates(): void {
  updateTemplateList().then(() => {
    initialized = true;
  });
}

// Export functions for use in other modules
export default {
  loadSelectedTemplate,
  handleLanguageChange,
  initializeTemplates
};
