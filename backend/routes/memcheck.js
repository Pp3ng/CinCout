const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const tmp = require('tmp');
const { sanitizeOutput, formatMemcheckOutput } = require('../utils/helpers');

router.post('/', async (req, res) => {
  const { code, lang, compiler: selectedCompiler, optimization } = req.body;
  
  if (!code || code.trim() === '') {
    return res.status(400).send('Error: No code provided');
  }
  
  try {
    // Create temporary directory
    const tmpDir = tmp.dirSync({ prefix: 'webCpp-', unsafeCleanup: true });
    const sourceExtension = lang === 'cpp' ? 'cpp' : 'c';
    const sourceFile = path.join(tmpDir.name, `program.${sourceExtension}`);
    const outputFile = path.join(tmpDir.name, 'program.out');
    const valgrindLog = path.join(tmpDir.name, 'valgrind.log');
    
    // Write code to temporary file
    fs.writeFileSync(sourceFile, code);
    
    // Determine compiler and options
    const compiler = lang === 'cpp' 
      ? (selectedCompiler === 'clang' ? 'clang++' : 'g++')
      : (selectedCompiler === 'clang' ? 'clang' : 'gcc');
    
    const standardOption = lang === 'cpp' ? '-std=c++20' : '-std=c11';
    const optimizationOption = optimization || '-O0';
    
    // Compile code
    const compileCmd = `${compiler} -g ${standardOption} ${optimizationOption} "${sourceFile}" -o "${outputFile}"`;
    
    await new Promise((resolve, reject) => {
      exec(compileCmd, (error, stdout, stderr) => {
        if (error) {
          return reject(`Compilation Error:\n${sanitizeOutput(stderr)}`);
        }
        resolve();
      });
    });
    
    // Run Valgrind
    const valgrindCmd = `valgrind --tool=memcheck --leak-check=full --show-leak-kinds=all --track-origins=yes --log-file="${valgrindLog}" "${outputFile}"`;
    
    await new Promise((resolve, reject) => {
      exec(valgrindCmd, (error, stdout, stderr) => {
        resolve(); // Continue even if there's an error, we need to read the valgrind log
      });
    });
    
    // Read Valgrind log
    const valgrindOutput = fs.readFileSync(valgrindLog, 'utf8');
    
    // Extract important information
    let report = '';
    const lines = valgrindOutput.split('\n');
    let startReading = false;
    
    for (const line of lines) {
      if (line.includes('HEAP SUMMARY:')) {
        startReading = true;
      }
      
      if (startReading && line.trim() !== '' && !line.includes('For lists of')) {
        report += line + '\n';
      }
    }
    
    res.send(formatMemcheckOutput(report));
    
    // Clean up temporary files
    tmpDir.removeCallback();
  } catch (error) {
    res.status(500).send(`Error: ${error.message || error}`);
  }
});

module.exports = router; 