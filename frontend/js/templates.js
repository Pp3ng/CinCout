// Initialize empty templates object
window.templates = {
    c: {},
    cpp: {}
};

// Function to load templates from the server
async function loadTemplates() {
    try {
        const response = await fetch('/api/templates');
        const templateData = await response.json();
        
        // Replace the empty templates with loaded data
        window.templates = templateData;
        
        // Update the template dropdown after loading
        window.updateTemplates();
        
        // Set default template if editor is ready
        if (window.editor && templateData.c && templateData.c["Hello World"]) {
            const lang = document.getElementById("language").value;
            document.getElementById("template").value = "Hello World";
            window.editor.setValue(templateData[lang]["Hello World"]);
        }
        
        console.log('Templates loaded successfully');
    } catch (error) {
        console.error('Failed to load templates:', error);
    }
}

// Make updateTemplates function global so it can be called from handlers.js
window.updateTemplates = function() {
    const lang = document.getElementById("language").value;
    const templateSelect = document.getElementById("template");
    templateSelect.innerHTML = ''; // Clear existing options

    // Add template options based on current language
    if (window.templates[lang]) {
        for (const name in window.templates[lang]) {
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