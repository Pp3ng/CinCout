interface TemplateCache {
  lists: Record<string, string[]>;
  contents: Record<string, string>;
}

// Cache object
const cache: TemplateCache = {
  lists: {},
  contents: {},
};

// Default timeout for fetch operations
const FETCH_TIMEOUT = 5000; // 5 seconds
let initialized = false;

/**
 * Fetch data with timeout handling
 */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(response.statusText);
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Load template list for a specific language
 */
async function loadTemplateList(language: string): Promise<string[]> {
  // Return cached list if available
  if (cache.lists[language]) return cache.lists[language];

  try {
    const response = await fetchWithTimeout(`/api/templates/${language}/list`);
    const templateNames = await response.json();
    cache.lists[language] = templateNames;
    return templateNames;
  } catch (error: any) {
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
    const response = await fetchWithTimeout(
      `/api/templates/${language}/${encodeURIComponent(templateName)}`
    );
    const { content } = await response.json();
    cache.contents[cacheKey] = content;
    return content;
  } catch (error: any) {
    console.error(
      `Failed to load template ${templateName} for ${language}:`,
      error
    );
    return `// Error loading template: ${error.message || "Unknown error"}`;
  }
}

/**
 * Update template dropdown and load selected template
 */
async function updateTemplateList(): Promise<void> {
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
    templateNames.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      templateSelect.appendChild(option);
    });

    // Select Hello World template if exists, otherwise first template
    if (templateSelect.options.length > 0) {
      const helloWorldIndex = Array.from(templateSelect.options).findIndex(
        (option) => option.value === "Hello World"
      );
      templateSelect.selectedIndex = helloWorldIndex >= 0 ? helloWorldIndex : 0;
      templateSelect.dispatchEvent(new Event("change", { bubbles: true }));

      // Load template content during initialization or explicit language change
      if (!initialized || document.activeElement === languageSelect) {
        await loadSelectedTemplate();
      }
    }
  } catch (error: any) {
    console.error("Error updating template list:", error);
    templateSelect.innerHTML = "<option>Failed to load templates</option>";
    templateSelect.disabled = false;
  }
}

/**
 * Load the currently selected template
 */
async function loadSelectedTemplate(): Promise<void> {
  const editor = (window as any).editor;
  const languageSelect = document.getElementById(
    "language"
  ) as HTMLSelectElement;
  const templateSelect = document.getElementById(
    "template"
  ) as HTMLSelectElement;

  if (!templateSelect || !languageSelect || !editor) {
    console.error("Required elements not found");
    return;
  }

  const language = languageSelect.value || "c";
  const templateName = templateSelect.value;
  if (!templateName) return;

  try {
    editor.setValue("// Loading template...");
    const content = await loadTemplateContent(language, templateName);
    editor.setValue(content);
  } catch (error: any) {
    console.error("Error setting template:", error);
    editor.setValue(
      `// Error loading template: ${error.message || "Unknown error"}`
    );
  }
}

// Initialize and set up event handlers
document.addEventListener("DOMContentLoaded", () => {
  // Initialize templates
  updateTemplateList().then(() => {
    initialized = true;
  });

  // Set up language change handler
  document
    .getElementById("language")
    ?.addEventListener("change", updateTemplateList);

  // Set up template change handler
  document.getElementById("template")?.addEventListener("change", (event) => {
    if (document.activeElement === event.target) {
      loadSelectedTemplate();
    }
  });
});

// Export for global access
(window as any).updateTemplates = updateTemplateList;
(window as any).setTemplate = loadSelectedTemplate;
(window as any).templates = {}; // Maintain for backward compatibility
(window as any).templateLists = cache.lists;
(window as any).loadedTemplates = new Set();
