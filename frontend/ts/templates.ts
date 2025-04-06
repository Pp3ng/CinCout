// Define template interfaces
interface TemplatesByLanguage {
    [language: string]: {
        [templateName: string]: string
    }
}

// Initialize empty templates object
(window as any).templates = {
    c: {},
    cpp: {}
} as TemplatesByLanguage;

// Function to load templates from the server
async function loadTemplates(): Promise<void> {
    try {
        const response = await fetch('/api/templates');
        const templateData: TemplatesByLanguage = await response.json();
        
        // Replace the empty templates with loaded data
        (window as any).templates = templateData;
        
        // Update the template dropdown after loading
        (window as any).updateTemplates();
        
        // Set default template if editor is ready
        if ((window as any).editor && templateData.c && templateData.c["Hello World"]) {
            const lang = (document.getElementById("language") as HTMLSelectElement).value;
            (document.getElementById("template") as HTMLSelectElement).value = "Hello World";
            (window as any).editor.setValue(templateData[lang]["Hello World"]);
        }
    } catch (error) {
        console.error('Failed to load templates:', error);
    }
}

// Make updateTemplates function global so it can be called from handlers.js
(window as any).updateTemplates = function(): void {
    const lang = (document.getElementById("language") as HTMLSelectElement).value;
    const templateSelect = document.getElementById("template") as HTMLSelectElement;
    templateSelect.innerHTML = ''; // Clear existing options

    // Add template options based on current language
    if ((window as any).templates[lang]) {
        for (const name in (window as any).templates[lang]) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            templateSelect.appendChild(option);
        }
    }
};

// Initialize editor with default template when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load templates first
    loadTemplates();
});
