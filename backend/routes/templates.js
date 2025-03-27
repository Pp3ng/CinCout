const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

// Directory where template files will be stored
const TEMPLATES_DIR = path.join(__dirname, '../templates');

// Route to get all available templates
router.get('/', async (req, res) => {
  try {
    // Create structure to hold templates
    const templates = {
      c: {},
      cpp: {}
    };

    // Read the templates directory
    const languages = await fs.readdir(TEMPLATES_DIR);
    
    // Load templates for each language
    for (const lang of languages) {
      const langPath = path.join(TEMPLATES_DIR, lang);
      const stats = await fs.stat(langPath);
      
      if (stats.isDirectory()) {
        const templateFiles = await fs.readdir(langPath);
        
        for (const file of templateFiles) {
          // Extract the template name from the filename (remove extension)
          const templateName = path.basename(file, path.extname(file));
          const filePath = path.join(langPath, file);
          
          // Read the template content
          const content = await fs.readFile(filePath, 'utf8');
          
          // Add to the appropriate language section
          if (!templates[lang]) {
            templates[lang] = {};
          }
          templates[lang][templateName] = content;
        }
      }
    }
    
    res.json(templates);
  } catch (error) {
    console.error('Error loading templates:', error);
    res.status(500).json({ error: 'Failed to load templates' });
  }
});

module.exports = router; 