// Clean file paths from output
function sanitizeOutput(output) {
  if (!output) {
    return '';
  }
  return output.replace(/[^:\s]+\.(cpp|c|h|hpp):/g, '');
}

// Format memory check output
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

module.exports = {
  sanitizeOutput,
  formatMemcheckOutput
}; 