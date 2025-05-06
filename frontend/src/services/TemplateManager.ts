/**
 * TemplateManager.ts
 * Simplified template management solution
 * Integrates template service and React hook in a single file
 */
import { useState, useEffect, useCallback } from "react";
import { EditorService } from "./EditorService";
import { notificationService } from "./NotificationService";
import { useCodeConfig } from "../context/UIStateContext";

// Cache structure
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
export async function loadTemplateList(language: string): Promise<string[]> {
  // Return cached list if available
  if (cache.lists[language]) return cache.lists[language];

  try {
    const response = await fetchWithTimeout(`/api/templates/${language}`);
    const data = await response.json();
    cache.lists[language] = data.list;
    return data.list;
  } catch (error: any) {
    console.error(`Failed to load template list for ${language}:`, error);
    notificationService.error(
      `Failed to load templates: ${error.message || "Unknown error"}`,
      3000
    );
    return [];
  }
}

/**
 * Check if a template exists for a specific language
 */
export function templateExistsInLanguage(
  language: string,
  templateName: string
): boolean {
  return cache.lists[language]?.includes(templateName) || false;
}

/**
 * Load template content for a specific language and template name
 */
export async function loadTemplateContent(
  language: string,
  templateName: string
): Promise<string> {
  // First check if template exists in this language
  if (
    cache.lists[language] &&
    !templateExistsInLanguage(language, templateName)
  ) {
    throw new Error(
      `Template '${templateName}' does not exist for ${language}`
    );
  }

  const cacheKey = `${language}:${templateName}`;
  if (cache.contents[cacheKey]) return cache.contents[cacheKey];

  try {
    const response = await fetchWithTimeout(
      `/api/templates/${language}/${encodeURIComponent(templateName)}`
    );
    const content = await response.text();
    cache.contents[cacheKey] = content;
    return content;
  } catch (error: any) {
    console.error(
      `Failed to load template ${templateName} for ${language}:`,
      error
    );

    notificationService.error(
      `Failed to load template: ${error.message || "Unknown error"}`,
      3000
    );
    return `// Error loading template: ${error.message || "Unknown error"}`;
  }
}

/**
 * Apply a template to the editor
 */
export async function applyTemplate(
  language: string,
  templateName: string
): Promise<void> {
  if (!templateName) return;

  try {
    // First check if template exists for this language
    if (!templateExistsInLanguage(language, templateName)) {
      return;
    }

    const content = await loadTemplateContent(language, templateName);

    // Update editor using EditorService
    EditorService.setValue(content);
    EditorService.refresh();
  } catch (error: any) {
    console.error("Error setting template:", error);
    notificationService.error(
      `Error loading template: ${error.message || "Unknown error"}`,
      3000
    );
  }
}

/**
 * Find the preferred template for a language
 * Tries "Hello World" first, then falls back to first available template
 */
export function findPreferredTemplate(templateList: string[]): string {
  if (templateList.length === 0) return "";

  // Try to find Hello World template
  const helloWorldTemplate = templateList.find(
    (name) => name === "Hello World"
  );
  return helloWorldTemplate || templateList[0];
}

/**
 * Clear the template cache
 */
export function clearTemplateCache(): void {
  cache.lists = {};
  cache.contents = {};
}

/**
 * React hook - useTemplates
 * For managing templates in React components
 */
export function useTemplates() {
  const { config } = useCodeConfig();
  const [templates, setTemplates] = useState<
    { value: string; label: string }[]
  >([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previousLanguage, setPreviousLanguage] = useState<string>(
    config.language
  );

  /**
   * Update template list for the current language
   */
  const updateTemplateList = useCallback(
    async (language: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const templateNames = await loadTemplateList(language);
        const templateOptions = templateNames.map((name) => ({
          value: name,
          label: name,
        }));

        setTemplates(templateOptions);

        // Handle template selection when language changes
        if (language !== previousLanguage) {
          // Check if current template exists in new language
          const currentTemplateExists =
            selectedTemplate &&
            templateExistsInLanguage(language, selectedTemplate);

          if (templateOptions.length > 0) {
            if (currentTemplateExists) {
              // Keep current template if it exists in new language
            } else {
              // Find preferred template for this language
              const newTemplate = findPreferredTemplate(templateNames);
              setSelectedTemplate(newTemplate);
            }
          } else {
            // No available templates
            setSelectedTemplate("");
          }

          // Update previous language reference
          setPreviousLanguage(language);
        } else if (templateOptions.length > 0 && !selectedTemplate) {
          // First load or reset: select preferred template
          const newTemplate = findPreferredTemplate(templateNames);
          setSelectedTemplate(newTemplate);
        }
      } catch (error: any) {
        console.error("Error updating template list:", error);
        setError(
          `Failed to load templates: ${error.message || "Unknown error"}`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [selectedTemplate, previousLanguage]
  );

  /**
   * Load the currently selected template content
   */
  const loadSelectedTemplate = useCallback(
    async (language: string, templateName: string): Promise<void> => {
      if (!templateName) return;

      setIsLoading(true);
      setError(null);

      try {
        await applyTemplate(language, templateName);
      } catch (error: any) {
        console.error("Error setting template:", error);
        setError(`Error loading template: ${error.message || "Unknown error"}`);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Update templates when language changes
  useEffect(() => {
    updateTemplateList(config.language);
  }, [config.language, updateTemplateList]);

  // Load template content when selected template changes
  useEffect(() => {
    if (selectedTemplate) {
      loadSelectedTemplate(config.language, selectedTemplate);
    }
  }, [selectedTemplate, config.language, loadSelectedTemplate]);

  return {
    templates,
    selectedTemplate,
    setSelectedTemplate,
    isLoading,
    error,
  };
}

// Export for global access
const templateManager = {
  loadTemplateList,
  loadTemplateContent,
  applyTemplate,
  findPreferredTemplate,
  templateExistsInLanguage,
  clearTemplateCache,
};

// Add to window for legacy support
(window as any).templateManager = templateManager;
