/**
 * Code formatting router
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const {
  validateCode,
  createTempDirectory,
  writeCodeToFile,
  executeCommand
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
    const inFile = writeCodeToFile(tmpDir.name, 'input.c', code);
    
    try {
      // Run clang-format
      const formatCmd = `clang-format -style=WebKit "${inFile}" -i`;
      await executeCommand(formatCmd);
      
      // Read formatted code
      const fs = require('fs-extra');
      const formattedCode = fs.readFileSync(inFile, 'utf8');
      res.send(formattedCode);
    } finally {
      // Clean up temporary files
      tmpDir.removeCallback();
    }
  } catch (error) {
    res.status(500).send(`Error: ${error.message || error}`);
  }
});

module.exports = router; 