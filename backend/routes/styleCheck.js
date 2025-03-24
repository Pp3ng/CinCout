const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const tmp = require('tmp');

router.post('/', async (req, res) => {
  const { code, lang } = req.body;
  
  if (!code || code.trim() === '') {
    return res.status(400).send('Error: No code provided');
  }
  
  try {
    // Create temporary directory
    const tmpDir = tmp.dirSync({ prefix: 'webCpp-', unsafeCleanup: true });
    const inFile = path.join(tmpDir.name, 'input.cpp');
    
    // Write code to temporary file
    fs.writeFileSync(inFile, code);
    
    // Run cppcheck
    const cppcheckCmd = `cppcheck --enable=all --suppress=missingInclude --suppress=missingIncludeSystem --suppress=unmatchedSuppression --suppress=checkersReport --inline-suppr --verbose "${inFile}" 2>&1`;
    
    exec(cppcheckCmd, (error, stdout, stderr) => {
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
        res.send(output);
      }
      
      // Clean up temporary files
      tmpDir.removeCallback();
    });
  } catch (error) {
    res.status(500).send(`Error: ${error.message || error}`);
  }
});

module.exports = router; 