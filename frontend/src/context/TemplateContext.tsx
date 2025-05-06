import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { useCodeConfig } from "./UIStateContext";

// Default timeout for fetch operations
const FETCH_TIMEOUT = 5000; // 5 seconds

// Template types
export interface Template {
  value: string;
  label: string;
}

// Context interface
interface TemplateContextType {
  // Template state
  templates: Template[];
  selectedTemplate: string;
  isLoading: boolean;
  error: string | null;

  // Template actions
  setSelectedTemplate: (template: string) => void;
  loadTemplateContent: (
    language: string,
    templateName: string
  ) => Promise<string>;
  applyTemplate: (language: string, templateName: string) => Promise<void>;
  clearTemplateCache: () => void;
  templateExistsInLanguage: (language: string, templateName: string) => boolean;
}

// Create the context
const TemplateContext = createContext<TemplateContextType | null>(null);

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

// Cache structure
interface TemplateCache {
  lists: Record<string, string[]>;
  contents: Record<string, string>;
}

// Provider component
export const TemplateProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { config } = useCodeConfig();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previousLanguage, setPreviousLanguage] = useState<string>(
    config.language
  );

  // Template cache - moved to component state to avoid singleton issues
  const [cache] = useState<TemplateCache>({
    lists: {},
    contents: {},
  });

  /**
   * Find the preferred template for a language
   * Tries "Hello World" first, then falls back to first available template
   */
  const findPreferredTemplate = useCallback(
    (templateList: string[]): string => {
      if (templateList.length === 0) return "";

      // Try to find Hello World template
      const helloWorldTemplate = templateList.find(
        (name) => name === "Hello World"
      );
      return helloWorldTemplate || templateList[0];
    },
    []
  );

  /**
   * Check if a template exists for a specific language
   */
  const templateExistsInLanguage = useCallback(
    (language: string, templateName: string): boolean => {
      return cache.lists[language]?.includes(templateName) || false;
    },
    [cache.lists]
  );

  /**
   * Load template list for a specific language
   */
  const loadTemplateList = useCallback(
    async (language: string): Promise<string[]> => {
      // Return cached list if available
      if (cache.lists[language]) return cache.lists[language];

      try {
        const response = await fetchWithTimeout(`/api/templates/${language}`);
        const data = await response.json();

        // Update cache
        cache.lists[language] = data.list;
        return data.list;
      } catch (error: any) {
        console.error(`Failed to load template list for ${language}:`, error);
        setError(
          `Failed to load templates: ${error.message || "Unknown error"}`
        );
        return [];
      }
    },
    [cache]
  );

  /**
   * Load template content for a specific language and template name
   */
  const loadTemplateContent = useCallback(
    async (language: string, templateName: string): Promise<string> => {
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

        // Update cache
        cache.contents[cacheKey] = content;
        return content;
      } catch (error: any) {
        console.error(
          `Failed to load template ${templateName} for ${language}:`,
          error
        );
        setError(
          `Failed to load template: ${error.message || "Unknown error"}`
        );
        return `// Error loading template: ${error.message || "Unknown error"}`;
      }
    },
    [cache, templateExistsInLanguage]
  );

  /**
   * Apply a template to the editor
   */
  const applyTemplate = useCallback(
    async (language: string, templateName: string): Promise<void> => {
      if (!templateName) return;

      setIsLoading(true);
      setError(null);

      try {
        // First check if template exists for this language
        if (!templateExistsInLanguage(language, templateName)) {
          return;
        }

        const content = await loadTemplateContent(language, templateName);

        // Update editor using the global editor instance
        // This is still necessary to interact with the CodeMirror editor
        if (window.editor) {
          window.editor.setValue(content);
          window.editor.refresh();
        }
      } catch (error: any) {
        console.error("Error setting template:", error);
        setError(`Error loading template: ${error.message || "Unknown error"}`);
      } finally {
        setIsLoading(false);
      }
    },
    [loadTemplateContent, templateExistsInLanguage]
  );

  /**
   * Clear the template cache
   */
  const clearTemplateCache = useCallback(() => {
    cache.lists = {};
    cache.contents = {};
  }, [cache]);

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
              await applyTemplate(language, selectedTemplate);
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
    [
      loadTemplateList,
      previousLanguage,
      selectedTemplate,
      templateExistsInLanguage,
      findPreferredTemplate,
      applyTemplate,
    ]
  );

  // Update templates when language changes
  useEffect(() => {
    updateTemplateList(config.language);
  }, [config.language, updateTemplateList]);

  // Load template content when selected template changes
  useEffect(() => {
    if (selectedTemplate) {
      applyTemplate(config.language, selectedTemplate);
    }
  }, [selectedTemplate, config.language, applyTemplate]);

  // Context value
  const value: TemplateContextType = {
    templates,
    selectedTemplate,
    isLoading,
    error,
    setSelectedTemplate,
    loadTemplateContent,
    applyTemplate,
    clearTemplateCache,
    templateExistsInLanguage,
  };

  return (
    <TemplateContext.Provider value={value}>
      {children}
    </TemplateContext.Provider>
  );
};

// Custom hook for consuming the templates context
export const useTemplates = (): TemplateContextType => {
  const context = useContext(TemplateContext);
  if (!context) {
    throw new Error("useTemplates must be used within a TemplateProvider");
  }
  return context;
};

// Add this to the window type
declare global {
  interface Window {
    editor: any;
  }
}
