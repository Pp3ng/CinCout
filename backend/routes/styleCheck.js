/**
 * Style checking router
 */
const express = require('express');
const router = express.Router();
const {
  validateCode,
  createTempDirectory,
  writeCodeToFile,
  executeCommand,
  formatOutput
} = require('../utils/helpers');

router.post('/', async (req, res) => {
  const { code, lang } = req.body;
  
  // Validate code
  const validation = validateCode(code);
  if (!validation.valid) {
    return res.status(400).send(validation.message);
  }
  
  try {
    // Create temporary directory
    const tmpDir = createTempDirectory();
    const inFile = writeCodeToFile(tmpDir.name, 'input.cpp', code);
    
    try {
      // Run cppcheck
      const cppcheckCmd = `cppcheck --enable=all --suppress=missingInclude --suppress=missingIncludeSystem --suppress=unmatchedSuppression --suppress=checkersReport --inline-suppr --verbose "${inFile}" 2>&1`;
      
      const { stdout } = await executeCommand(cppcheckCmd, { shell: true, failOnError: false });
      
      let output = '';
      let hasOutput = false;
      
      const lines = stdout.split('\n');
      for (const line of lines) {
        // Skip specific warnings
        if (line.includes('[checkersReport]') || 
            line.includes('missingIncludeSystem') || 
            line.includes('unmatchedSuppression')) {
          continue;
        }
        
        // Remove file paths
        if (line.includes(':')) {
          const parts = line.split(':');
          if (parts.length >= 4) {
            let newLine = `${parts[1]}:${parts[2]}: `;
            // Error message
            for (let i = 3; i < parts.length; i++) {
              newLine += parts[i];
              if (i < parts.length - 1) {
                newLine += ':';
              }
            }
            output += newLine + '\n';
            hasOutput = true;
          }
        }
      }
      
      if (!hasOutput) {
        res.send('No issues found.');
      } else {
        // Apply formatting to style check output
        const formattedOutput = formatOutput(output, 'style');
        res.send(formattedOutput);
      }
    } finally {
      // Clean up temporary files
      tmpDir.removeCallback();
    }
  } catch (error) {
    res.status(500).send(`Error: ${error.message || error}`);
  }
});

module.exports = router;