const fs = require('fs-extra');
const path = require('path');
const tmp = require('tmp');
const { exec } = require('child_process');

/**
 * Clean file paths from output
 * @param {string} output - Raw output to sanitize
 * @returns {string} Sanitized output
 */
function sanitizeOutput(output) {
  if (!output) {
    return '';
  }
  return output.replace(/[^:\s]+\.(cpp|c|h|hpp):/g, '');
}

/**
 * Format memory check output
 * @param {string} text - Valgrind output text
 * @returns {string} Formatted output
 */
function formatMemcheckOutput(text) {
  if (!text) return '';
  
  // Remove valgrind prefix and extra spaces
  text = text.replace(/==\d+== /g, '')
             .replace(/\s+from\s+/g, ' from ')
             .replace(/in \/.*?\/([^\/]+)\)/g, 'in $1)')
             .replace(/^\s*\n/g, '')
             .replace(/\n\s*\n/g, '\n')
             // program.c:10 -> ###LINE:10###
             .replace(/\((?:program\.c|program\.cpp):(\d+)\)/g, '###LINE:$1###')
             // Mark memory leaks
             .replace(/(\d+ bytes? in \d+ blocks? are definitely lost.*?)(?=\s*at|$)/g, '###LEAK:$1###');
  
  return text;
}

/**
 * Creates a temporary working directory
 * @param {string} prefix - Prefix for temp directory name
 * @returns {Object} Temporary directory object
 */
function createTempDirectory(prefix = 'webCpp-') {
  return tmp.dirSync({ prefix, unsafeCleanup: true });
}

/**
 * Writes code to a file in the specified directory
 * @param {string} dirPath - Directory path
 * @param {string} filename - File name
 * @param {string} code - Code content
 * @returns {string} Full path to created file
 */
function writeCodeToFile(dirPath, filename, code) {
  const filePath = path.join(dirPath, filename);
  fs.writeFileSync(filePath, code);
  return filePath;
}

/**
 * Executes a command and returns a promise
 * @param {string} command - Command to execute
 * @param {Object} options - Execution options
 * @returns {Promise} Promise resolving with stdout or rejecting with error
 */
function executeCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error && options.failOnError !== false) {
        reject(stderr || error.message);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

/**
 * Determines compiler command based on language and compiler selection
 * @param {string} lang - Programming language (cpp or c)
 * @param {string} compiler - Compiler selection
 * @returns {string} Compiler command
 */
function getCompilerCommand(lang, compiler) {
  return lang === 'cpp' 
    ? (compiler === 'clang' ? 'clang++' : 'g++')
    : (compiler === 'clang' ? 'clang' : 'gcc');
}

/**
 * Gets standard option based on language
 * @param {string} lang - Programming language (cpp or c)
 * @returns {string} Standard option
 */
function getStandardOption(lang) {
  return lang === 'cpp' ? '-std=c++20' : '-std=c11';
}

/**
 * Validates input code
 * @param {string} code - Code to validate
 * @returns {Object} Validation result with status and message
 */
function validateCode(code) {
  if (!code || code.trim() === '') {
    return { valid: false, message: 'Error: No code provided' };
  }
  return { valid: true };
}

module.exports = {
  sanitizeOutput,
  formatMemcheckOutput,
  createTempDirectory,
  writeCodeToFile,
  executeCommand,
  getCompilerCommand,
  getStandardOption,
  validateCode
}; 