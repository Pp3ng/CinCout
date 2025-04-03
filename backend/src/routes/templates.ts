import express, { Request, Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';

const router = express.Router();

// Directory where template files will be stored
const TEMPLATES_DIR = path.join(__dirname, '../../templates');

interface TemplateCollection {
  [language: string]: {
    [templateName: string]: string;
  };
}

// Route to get all available templates
router.get('/', async (req: Request, res: Response) => {
  try {
    // Create structure to hold templates
    const templates: TemplateCollection = {
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

export default router;
