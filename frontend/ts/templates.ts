// Define template interfaces using Record type
type TemplateContent = string;
type TemplatesByName = Record<string, TemplateContent>;
type TemplatesByLanguage = Record<string, TemplatesByName>;

// Templates cache and tracking
class TemplateManager {
  // Private properties
  private templates: TemplatesByLanguage = {};
  private templateLists: Record<string, string[]> = {};// {language: templateName}
  private loadedTemplates = new Set<string>();
  private isInitialized = false;
  private fetchTimeout = 10000; // 10 second timeout for fetch operations

  constructor() {
    // Make these available globally for backwards compatibility
    (window as any).templates = this.templates;
    (window as any).templateLists = this.templateLists;
    (window as any).loadedTemplates = this.loadedTemplates;
  }

  // Load template list for a specific language with error handling and timeout
  async loadTemplateList(language: string): Promise<string[]> {
    try {
      // Use cached list if available
      if (this.templateLists[language]) {
        return this.templateLists[language];
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.fetchTimeout);

      try {
        const response = await fetch(`/api/templates/${language}/list`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Failed to load template list for ${language}: ${response.statusText}`
          );
        }

        const templateNames = (await response.json()) as string[];

        // Store in our cache
        this.templateLists[language] = templateNames;

        return templateNames;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error(`Failed to load template list for ${language}:`, error);
      return [];
    }
  }

  // Load a single template by language and name with improved error handling
  async loadSingleTemplate(
    language: string,
    templateName: string
  ): Promise<string> {
    const templateKey = `${language}:${templateName}`;

    try {
      // Use cached template if available
      if (
        this.loadedTemplates.has(templateKey) &&
        this.templates[language] &&
        this.templates[language][templateName]
      ) {
        return this.templates[language][templateName];
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.fetchTimeout);

      try {
        const response = await fetch(
          `/api/templates/${language}/${encodeURIComponent(templateName)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load template ${templateName} for ${language}: ${response.statusText}`
          );
        }

        const result = await response.json();
        const templateContent = result.content;

        // Initialize language section if needed
        if (!this.templates[language]) {
          this.templates[language] = {};
        }

        // Store template in cache
        this.templates[language][templateName] = templateContent;
        this.loadedTemplates.add(templateKey);

        return templateContent;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error(
        `Failed to load template ${templateName} for ${language}:`,
        error
      );
      return ""; // Return empty template on error
    }
  }

  // Update the template list when the language changes with improved error handling
  async updateTemplates(): Promise<void> {
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

    const lang = languageSelect.value || "c";

    // Show loading state
    templateSelect.disabled = true;
    templateSelect.innerHTML = "<option>Loading templates...</option>";

    try {
      // Load template list for this language
      const templateNames = await this.loadTemplateList(lang);

      // Clear existing options after successful load
      templateSelect.innerHTML = "";
      templateSelect.disabled = false;

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
        } else {
          // Select first available template
          templateSelect.selectedIndex = 0;
        }

        // Manually trigger the change event to update the custom selector UI
        templateSelect.dispatchEvent(new Event("change", { bubbles: true }));

        // Load and set the template
        await this.setTemplate();
      }
    } catch (error) {
      console.error("Error updating templates:", error);
      templateSelect.innerHTML = "<option>Error loading templates</option>";
      templateSelect.disabled = false;
    }
  }

  // Set editor content based on selected template with improved error handling
  async setTemplate(): Promise<void> {
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

    const lang = languageSelect.value || "c";
    const templateName = templateSelect.value;

    if (!templateName) return;

    try {
      // Show loading state in editor
      (window as any).editor.setValue("// Loading template...");

      // Load the template content
      const templateContent = await this.loadSingleTemplate(lang, templateName);

      // Set editor content
      if (templateContent) {
        (window as any).editor.setValue(templateContent);
      }
    } catch (error) {
      console.error(`Error setting template: ${error}`);
      (window as any).editor.setValue(
        `// Error loading template: ${templateName}`
      );
    }
  }

  // Initialize editor with default template
  initTemplates(): void {
    if (this.isInitialized) return;

    const init = async () => {
      await this.updateTemplates();
      this.isInitialized = true;
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => init());
    } else {
      init();
    }
  }
}

// Create singleton instance
const templateManager = new TemplateManager();

// Set up event handlers and initialization
document.addEventListener("DOMContentLoaded", () => {
  templateManager.initTemplates();

  // Set up language change handler
  const languageSelect = document.getElementById("language");
  if (languageSelect) {
    languageSelect.addEventListener("change", () => {
      templateManager.updateTemplates();
    });
  }
});

// Expose functions globally for backward compatibility
(window as any).updateTemplates = () => templateManager.updateTemplates();
(window as any).setTemplate = () => templateManager.setTemplate();
