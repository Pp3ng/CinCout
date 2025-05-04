import { useState, useEffect, useCallback } from "react";

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
 * Custom hook for managing templates
 */
export function useTemplates(initialLanguage: string = "c") {
  const [language, setLanguage] = useState<string>(initialLanguage);
  const [templates, setTemplates] = useState<
    { value: string; label: string }[]
  >([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templateContent, setTemplateContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch data with timeout handling
   */
  const fetchWithTimeout = useCallback(
    async (url: string): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(response.statusText);
        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    },
    []
  );

  /**
   * Load template list for a specific language
   */
  const loadTemplateList = useCallback(
    async (lang: string): Promise<string[]> => {
      // Return cached list if available
      if (cache.lists[lang]) return cache.lists[lang];

      try {
        const response = await fetchWithTimeout(`/api/templates/${lang}`);
        const data = await response.json();
        cache.lists[lang] = data.list;
        return data.list;
      } catch (error: any) {
        console.error(`Failed to load template list for ${lang}:`, error);
        setError(
          `Failed to load templates: ${error.message || "Unknown error"}`
        );
        return [];
      }
    },
    [fetchWithTimeout]
  );

  /**
   * Load template content for a specific language and template name
   */
  const loadTemplateContent = useCallback(
    async (lang: string, templateName: string): Promise<string> => {
      const cacheKey = `${lang}:${templateName}`;
      if (cache.contents[cacheKey]) return cache.contents[cacheKey];

      try {
        const response = await fetchWithTimeout(
          `/api/templates/${lang}/${encodeURIComponent(templateName)}`
        );
        const content = await response.text();
        cache.contents[cacheKey] = content;
        return content;
      } catch (error: any) {
        console.error(
          `Failed to load template ${templateName} for ${lang}:`,
          error
        );
        setError(
          `Failed to load template: ${error.message || "Unknown error"}`
        );
        return `// Error loading template: ${error.message || "Unknown error"}`;
      }
    },
    [fetchWithTimeout]
  );

  /**
   * Update template list for the current language
   */
  const updateTemplateList = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const templateNames = await loadTemplateList(language);

      const templateOptions = templateNames.map((name) => ({
        value: name,
        label: name,
      }));

      setTemplates(templateOptions);

      // Select Hello World template if exists, otherwise first template
      if (templateOptions.length > 0) {
        const helloWorldOption = templateOptions.find(
          (opt) => opt.value === "Hello World"
        );
        const newTemplate = helloWorldOption
          ? helloWorldOption.value
          : templateOptions[0].value;
        setSelectedTemplate(newTemplate);
      }
    } catch (error: any) {
      console.error("Error updating template list:", error);
      setError(`Failed to load templates: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  }, [language, loadTemplateList]);

  /**
   * Load the currently selected template content
   */
  const loadSelectedTemplate = useCallback(async (): Promise<void> => {
    if (!selectedTemplate) return;

    setIsLoading(true);
    setError(null);

    try {
      const content = await loadTemplateContent(language, selectedTemplate);
      setTemplateContent(content);

      // Update editor if available
      // This direct manipulation will be removed once full React migration is complete
      if ((window as any).editor) {
        (window as any).editor.setValue(content);
      }
    } catch (error: any) {
      console.error("Error setting template:", error);
      setError(`Error loading template: ${error.message || "Unknown error"}`);
      setTemplateContent(
        `// Error loading template: ${error.message || "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  }, [language, selectedTemplate, loadTemplateContent]);

  // Update templates when language changes
  useEffect(() => {
    updateTemplateList();
  }, [language, updateTemplateList]);

  // Load template content when selected template changes
  useEffect(() => {
    if (selectedTemplate) {
      loadSelectedTemplate();
    }
  }, [selectedTemplate, loadSelectedTemplate]);

  // Export for backward compatibility with existing code
  // This will be removed once full React migration is complete
  useEffect(() => {
    (window as any).updateTemplates = updateTemplateList;
    (window as any).setTemplate = loadSelectedTemplate;

    return () => {
      // Clean up when component unmounts
      (window as any).updateTemplates = undefined;
      (window as any).setTemplate = undefined;
    };
  }, [updateTemplateList, loadSelectedTemplate]);

  return {
    language,
    setLanguage,
    templates,
    selectedTemplate,
    setSelectedTemplate,
    templateContent,
    isLoading,
    error,
    updateTemplateList,
    loadSelectedTemplate,
  };
}
