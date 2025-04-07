// Define template interfaces using Record type
type TemplateContent = string;
type TemplatesByName = Record<string, TemplateContent>;
type TemplatesByLanguage = Record<string, TemplatesByName>;

// Initialize templates cache and tracking
(window as any).templates = {} as TemplatesByLanguage;
(window as any).templateLists = {} as Record<string, string[]>; // Store template names by language
(window as any).loadedTemplates = new Set<string>(); // Track which templates are loaded by "language:name"

// Load template list for a specific language
async function loadTemplateList(language: string): Promise<string[]> {
    try {
        // Use cached list if available
        if ((window as any).templateLists[language]) {
            return (window as any).templateLists[language];
        }

        const response = await fetch(`/api/templates/${language}/list`);
        
        if (!response.ok) {
            throw new Error(`Failed to load template list for ${language}: ${response.statusText}`);
        }
        
        const templateNames = await response.json() as string[];
        
        // Store in our cache
        (window as any).templateLists[language] = templateNames;
        
        return templateNames;
    } catch (error) {
        console.error(`Failed to load template list for ${language}:`, error);
        return [];
    }
}

// Load a single template by language and name
async function loadSingleTemplate(language: string, templateName: string): Promise<string> {
    const templateKey = `${language}:${templateName}`;
    
    try {
        // Use cached template if available
        if ((window as any).loadedTemplates.has(templateKey) && 
            (window as any).templates[language] && 
            (window as any).templates[language][templateName]) {
            return (window as any).templates[language][templateName];
        }

        const response = await fetch(`/api/templates/${language}/${encodeURIComponent(templateName)}`);
        
        if (!response.ok) {
            throw new Error(`Failed to load template ${templateName} for ${language}: ${response.statusText}`);
        }
        
        const result = await response.json();
        const templateContent = result.content;
        
        // Initialize language section if needed
        if (!(window as any).templates[language]) {
            (window as any).templates[language] = {};
        }
        
        // Store template in cache
        (window as any).templates[language][templateName] = templateContent;
        (window as any).loadedTemplates.add(templateKey);
        
        return templateContent;
    } catch (error) {
        console.error(`Failed to load template ${templateName} for ${language}:`, error);
        return ''; // Return empty template on error
    }
}

// Update the template list when the language changes
(window as any).updateTemplates = async function(): Promise<void> {
    const lang = (document.getElementById("language") as HTMLSelectElement).value;
    const templateSelect = document.getElementById("template") as HTMLSelectElement;
    templateSelect.innerHTML = ''; // Clear existing options

    // Load template list for this language
    const templateNames = await loadTemplateList(lang);

    // Add template options
    for (const name of templateNames) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        templateSelect.appendChild(option);
    }
};

// Set editor content based on selected template
(window as any).setTemplate = async function(): Promise<void> {
    const lang = (document.getElementById("language") as HTMLSelectElement).value;
    const templateName = (document.getElementById("template") as HTMLSelectElement).value;
    
    if (!templateName) return;
    
    // Load the template content
    const templateContent = await loadSingleTemplate(lang, templateName);
    
    // Set editor content
    if (templateContent && (window as any).editor) {
        (window as any).editor.setValue(templateContent);
    }
};

// Initialize editor with default template when the document is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Load template list for current language
    const lang = (document.getElementById("language") as HTMLSelectElement).value;
    await (window as any).updateTemplates();
    
    // Set default template if available
    const templateSelect = document.getElementById("template") as HTMLSelectElement;
    if (templateSelect.options.length > 0) {
        // Try to select Hello World template if it exists
        const helloWorldOption = Array.from(templateSelect.options).find(
            option => option.value === 'Hello World'
        );
        
        if (helloWorldOption) {
            templateSelect.value = 'Hello World';
        } else {
            // Select first available template
            templateSelect.selectedIndex = 0;
        }
        
        // Load and set the template
        await (window as any).setTemplate();
    }
});