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
const FETCH_TIMEOUT = 8000; // 8 seconds

// Track initialization state
let initialized = false;

/**
 * Load template list for a specific language
 */
async function loadTemplateList(language: string): Promise<string[]> {
  // Return cached list if available
  if (cache.lists[language]) {
    return cache.lists[language];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`/api/templates/${language}/list`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to load template list: ${response.statusText}`);
    }

    const templateNames = await response.json();

    // Save to cache
    cache.lists[language] = templateNames;
    return templateNames;
  } catch (error) {
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

  // Return cached content if available
  if (cache.contents[cacheKey]) {
    return cache.contents[cacheKey];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(
      `/api/templates/${language}/${encodeURIComponent(templateName)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Failed to load template content: ${response.statusText}`
      );
    }

    const data = await response.json();
    const content = data.content;

    // Save to cache
    cache.contents[cacheKey] = content;
    return content;
  } catch (error) {
    console.error(
      `Failed to load template ${templateName} for ${language}:`,
      error
    );
    return `// Error loading template: ${error.message}`;
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
    // Load template list
    const templateNames = await loadTemplateList(language);

    // Clear existing options
    templateSelect.innerHTML = "";
    templateSelect.disabled = false;

    // Add new options
    templateNames.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      templateSelect.appendChild(option);
    });

    // Select Hello World template if exists
    if (templateSelect.options.length > 0) {
      const helloWorldOption = Array.from(templateSelect.options).find(
        (option) => option.value === "Hello World"
      );

      if (helloWorldOption) {
        templateSelect.value = "Hello World";
      } else {
        // Otherwise select first template
        templateSelect.selectedIndex = 0;
      }

      // Update custom selector UI
      templateSelect.dispatchEvent(new Event("change", { bubbles: true }));

      // Only load template content during initialization
      // or when explicitly changing language
      if (!initialized || document.activeElement === languageSelect) {
        await loadSelectedTemplate();
      }
    }
  } catch (error) {
    console.error("Error updating template list:", error);
    templateSelect.innerHTML = "<option>Failed to load templates</option>";
    templateSelect.disabled = false;
  }
}

/**
 * Load the currently selected template
 */
async function loadSelectedTemplate(): Promise<void> {
  const languageSelect = document.getElementById(
    "language"
  ) as HTMLSelectElement;
  const templateSelect = document.getElementById(
    "template"
  ) as HTMLSelectElement;

  if (!templateSelect || !languageSelect || !(window as any).editor) {
    console.error("Required elements not found");
    return;
  }

  const language = languageSelect.value || "c";
  const templateName = templateSelect.value;

  if (!templateName) return;

  try {
    // Show loading state
    (window as any).editor.setValue("// Loading template...");

    // Load template content
    const content = await loadTemplateContent(language, templateName);

    // Set editor content
    (window as any).editor.setValue(content);
  } catch (error) {
    console.error("Error setting template:", error);
    (window as any).editor.setValue(
      `// Error loading template: ${error.message}`
    );
  }
}

/**
 * Initialize template system
 */
function initTemplates(): void {
  if (initialized) return;

  updateTemplateList()
    .then(() => {
      initialized = true;
    })
    .catch((err) => {
      console.error("Failed to initialize templates:", err);
    });
}

// Set up event handlers and initialization
document.addEventListener("DOMContentLoaded", () => {
  // Initialize template system
  initTemplates();

  // Set up language change handler
  const languageSelect = document.getElementById("language");
  if (languageSelect) {
    languageSelect.addEventListener("change", () => {
      // When language changes, update templates
      updateTemplateList();
    });
  }

  // Set up template change handler
  const templateSelect = document.getElementById("template");
  if (templateSelect) {
    templateSelect.addEventListener("change", () => {
      // Only load template content when user actually changes the template
      if (document.activeElement === templateSelect) {
        loadSelectedTemplate();
      }
    });
  }
});

// Export functions globally for backward compatibility
(window as any).updateTemplates = updateTemplateList;
(window as any).setTemplate = loadSelectedTemplate;
(window as any).templates = {}; // Maintain for backward compatibility
(window as any).templateLists = cache.lists;
(window as any).loadedTemplates = new Set();
