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
    const inFile = path.join(tmpDir.name, 'input.c');
    
    // Write code to temporary file
    fs.writeFileSync(inFile, code);
    
    // Run clang-format
    const formatCmd = `clang-format -style=WebKit "${inFile}" -i`;
    
    await new Promise((resolve, reject) => {
      exec(formatCmd, (error, stdout, stderr) => {
        if (error) {
          return reject(`Format Error:\n${stderr}`);
        }
        resolve();
      });
    });
    
    // Read formatted code
    const formattedCode = fs.readFileSync(inFile, 'utf8');
    res.send(formattedCode);
    
    // Clean up temporary files
    tmpDir.removeCallback();
  } catch (error) {
    res.status(500).send(`Error: ${error.message || error}`);
  }
});

module.exports = router; 