// Define template interfaces using Record type
type TemplateContent = string;
type TemplatesByName = Record<string, TemplateContent>;
type TemplatesByLanguage = Record<string, TemplatesByName>;

// Templates cache and tracking
const templates: TemplatesByLanguage = {};
const templateLists: Record<string, string[]> = {}; // Store template names by language
const loadedTemplates = new Set<string>(); // Track which templates are loaded by "language:name"

// Add initialization flag to prevent duplicate initialization
let isInitialized = false;

// Make these available globally for backwards compatibility
(window as any).templates = templates;
(window as any).templateLists = templateLists;
(window as any).loadedTemplates = loadedTemplates;

// Load template list for a specific language
async function loadTemplateList(language: string): Promise<string[]> {
  try {
    // Use cached list if available
    if (templateLists[language]) {
      return templateLists[language];
    }

    const response = await fetch(`/api/templates/${language}/list`);

    if (!response.ok) {
      throw new Error(
        `Failed to load template list for ${language}: ${response.statusText}`
      );
    }

    const templateNames = (await response.json()) as string[];

    // Store in our cache
    templateLists[language] = templateNames;

    return templateNames;
  } catch (error) {
    console.error(`Failed to load template list for ${language}:`, error);
    return [];
  }
}

// Load a single template by language and name
async function loadSingleTemplate(
  language: string,
  templateName: string
): Promise<string> {
  const templateKey = `${language}:${templateName}`;

  try {
    // Use cached template if available
    if (
      loadedTemplates.has(templateKey) &&
      templates[language] &&
      templates[language][templateName]
    ) {
      return templates[language][templateName];
    }

    const response = await fetch(
      `/api/templates/${language}/${encodeURIComponent(templateName)}`
    );

    if (!response.ok) {
      throw new Error(
        `Failed to load template ${templateName} for ${language}: ${response.statusText}`
      );
    }

    const result = await response.json();
    const templateContent = result.content;

    // Initialize language section if needed
    if (!templates[language]) {
      templates[language] = {};
    }

    // Store template in cache
    templates[language][templateName] = templateContent;
    loadedTemplates.add(templateKey);

    return templateContent;
  } catch (error) {
    console.error(
      `Failed to load template ${templateName} for ${language}:`,
      error
    );
    return ""; // Return empty template on error
  }
}

// Update the template list when the language changes
async function updateTemplates(): Promise<void> {
  const lang =
    (document.getElementById("language") as HTMLSelectElement)?.value || "c";
  const templateSelect = document.getElementById(
    "template"
  ) as HTMLSelectElement;

  if (!templateSelect) return;

  templateSelect.innerHTML = ""; // Clear existing options

  // Load template list for this language
  const templateNames = await loadTemplateList(lang);

  // Add template options
  for (const name of templateNames) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    templateSelect.appendChild(option);
  }

  // Try to select Hello World template if it exists, regardless of which language
  if (templateSelect.options.length > 0) {
    const helloWorldOption = Array.from(templateSelect.options).find(
      (option) => option.value === "Hello World"
    );

    if (helloWorldOption) {
      templateSelect.value = "Hello World";
      // Manually trigger the change event to update the custom selector UI
      templateSelect.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      // Select first available template
      templateSelect.selectedIndex = 0;
      // Ensure the UI is updated
      templateSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Load and set the template
    await setTemplate();
  }
}

// Set editor content based on selected template
async function setTemplate(): Promise<void> {
  const lang =
    (document.getElementById("language") as HTMLSelectElement)?.value || "c";
  const templateSelect = document.getElementById(
    "template"
  ) as HTMLSelectElement;

  if (!templateSelect) return;

  const templateName = templateSelect.value;
  if (!templateName) return;

  // Load the template content
  const templateContent = await loadSingleTemplate(lang, templateName);

  // Set editor content
  if (templateContent && (window as any).editor) {
    (window as any).editor.setValue(templateContent);
  }
}

// Initialize editor with default template
const initTemplates = () => {
  if (isInitialized) return;

  const init = async () => {
    const lang =
      (document.getElementById("language") as HTMLSelectElement)?.value || "c";
    await updateTemplates();
    isInitialized = true;
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
  } else {
    init();
  }
};

// Expose functions globally for backward compatibility
(window as any).updateTemplates = updateTemplates;
(window as any).setTemplate = setTemplate;

// Export functions for module system
export { updateTemplates, setTemplate, initTemplates };

// Self-initializing module
document.addEventListener("DOMContentLoaded", () => initTemplates());
