/**
 * Compilation Service
 * Centralizes all compilation-related logic in the application
 */
import * as fs from "fs-extra";
import * as path from "path";
import * as tmp from "tmp";
import { DirResult } from "tmp";
import { WebSocket } from "ws";
import { exec, ExecOptions } from "child_process";
import { ExtendedWebSocket, sendWebSocketMessage } from "./webSocketHandler";

// Interface for compilation environment
export interface CompilationEnvironment {
  tmpDir: DirResult;
  sourceFile: string;
  outputFile: string;
  asmFile: string;
}

// Interface for compilation options
export interface CompilationOptions {
  lang: string; // 'c' or 'cpp'
  compiler?: string; // 'gcc', 'g++', 'clang', 'clang++'
  optimization?: string; // Optimization level
  standard?: string; // Language standard override
}

// Interface for execution result
export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Creates a compilation environment with appropriate files
 * @param {string} lang - Programming language ('c' or 'cpp')
 * @returns {CompilationEnvironment} Object with file paths
 */
export const createCompilationEnvironment = (
  lang: string
): CompilationEnvironment => {
  const tmpDir = tmp.dirSync({ prefix: "CinCout-", unsafeCleanup: true });
  const sourceExtension = lang === "cpp" ? "cpp" : "c";
  const sourceFile = path.join(tmpDir.name, `program.${sourceExtension}`);
  const outputFile = path.join(tmpDir.name, "program.out");
  const asmFile = path.join(tmpDir.name, "program.s");

  return { tmpDir, sourceFile, outputFile, asmFile };
};

/**
 * Write code to a file
 * @param {string} filePath - Path to write to
 * @param {string} code - Code content
 */
export const writeCodeToFile = (filePath: string, code: string): void => {
  fs.writeFileSync(filePath, code, "utf8");
};

/**
 * Get compiler command based on language and compiler selection
 * @param {string} lang - Programming language ('c' or 'cpp')
 * @param {string} compiler - Compiler selection
 * @returns {string} Compiler command
 */
export const getCompilerCommand = (lang: string, compiler?: string): string => {
  return lang === "cpp"
    ? compiler === "clang"
      ? "clang++"
      : "g++"
    : compiler === "clang"
    ? "clang"
    : "gcc";
};

/**
 * Get language standard option based on language
 * @param {string} lang - Programming language ('c' or 'cpp')
 * @returns {string} Standard option
 */
export const getStandardOption = (lang: string): string => {
  return lang === "cpp" ? "-std=c++20" : "-std=c11";
};

/**
 * Execute a shell command
 * @param {string} command - Command to execute
 * @param {object} options - Execution options
 * @returns {Promise<{stdout: string, stderr: string}>} Promise with stdout and stderr
 */
export const executeCommand = (
  command: string,
  options: ExecOptions & {
    shell?: boolean | string;
    failOnError?: boolean;
  } = {}
): Promise<ExecutionResult> => {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error && options.failOnError !== false) {
        reject(stderr || error.message);
        return;
      }
      resolve({
        stdout,
        stderr,
        exitCode: error ? error.code || 1 : 0,
      });
    });
  });
};

/**
 * Clean up file paths from output
 * @param {string} output - Output to sanitize
 * @returns {string} Sanitized output
 */
export const sanitizeOutput = (output: string): string => {
  if (!output) {
    return "";
  }
  return output.replace(/[^:\s]+\.(cpp|c|h|hpp):/g, "");
};

/**
 * Format output for display
 * @param {string} text - Text to format
 * @param {string} outputType - Type of output (default, memcheck, style, etc.)
 * @returns {string} Formatted HTML output
 */
export const formatOutput = (
  text: string,
  outputType: string = "default"
): string => {
  if (!text) return "";

  // Only apply HTML sanitization and formatting for output types that need it
  if (
    outputType === "default" ||
    outputType === "memcheck" ||
    outputType === "style"
  ) {
    // Basic HTML sanitization
    text = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Process based on output type
    switch (outputType) {
      case "memcheck":
        // Pre-process memcheck output
        text = text
          // Remove valgrind prefixes
          .replace(/==\d+== /g, "")
          // Clean up spacing
          .replace(/\s+from\s+/g, " from ")
          // Remove temporary directory paths - more robust regex to catch various forms
          .replace(
            /\(\/tmp\/CinCout-[^\/]+\/[^:)]+:[^\)]+\)/g,
            "(program.c:LINE)"
          )
          .replace(
            /by 0x[0-9a-fA-F]+: \w+ \(\/tmp\/CinCout-[^\/]+\/([^:)]+):(\d+)\)/g,
            "by 0x...: (line: $2)"
          )
          // Remove all other path references
          .replace(/in \/.*?\/([^\/]+)\)/g, "in $1)")
          // Clean up whitespace
          .replace(/^\s*\n/g, "")
          .replace(/\n\s*\n/g, "\n")
          // Mark line numbers for further processing
          .replace(/\((?:program\.c|program\.cpp):(\d+)\)/g, "###LINE:$1###")
          // Mark memory leaks
          .replace(
            /(\d+ bytes? in \d+ blocks? are definitely lost.*?)(?=\s*at|$)/g,
            "###LEAK:$1###"
          );
        break;

      case "style":
        // Process style check output
        // No special pre-processing needed, just the common formatting
        break;

      default:
        // Default formatting (no pre-processing)
        break;
    }

    // Common formatting for styled output types

    // Highlight error and warning messages
    text = text
      .replace(/error:/gi, '<span class="error-text">error:</span>')
      .replace(/warning:/gi, '<span class="warning-text">warning:</span>');

    // Highlight line and column numbers
    text = text.replace(
      /(\d+):(\d+):/g,
      '<span class="line-number">$1</span>:<span class="column-number">$2</span>:'
    );

    // Format memcheck specific markers if present
    if (
      outputType === "memcheck" &&
      (text.includes("HEAP SUMMARY") ||
        text.includes("LEAK SUMMARY") ||
        text.includes("###LINE") ||
        text.includes("###LEAK"))
    ) {
      text = text
        .replace(
          /###LINE:(\d+)###/g,
          '(line: <span class="line-number">$1</span>)'
        )
        .replace(/###LEAK:(.*?)###/g, '<div class="memcheck-leak">$1</div>')
        .trim() // Remove leading and trailing whitespace
        .replace(/\n{2,}/g, "\n"); // Remove multiple newlines
    }
  }

  return text;
};

/**
 * Compile code with options
 * @param {CompilationEnvironment} env - Compilation environment
 * @param {string} code - Source code
 * @param {CompilationOptions} options - Compilation options
 * @returns {Promise<{success: boolean, output?: string, error?: string}>} Compilation result
 */
export const compileCode = async (
  env: CompilationEnvironment,
  code: string,
  options: CompilationOptions
): Promise<{ success: boolean; output?: string; error?: string }> => {
  try {
    // Write code to source file
    writeCodeToFile(env.sourceFile, code);

    // Determine compiler options
    const compilerCmd = getCompilerCommand(options.lang, options.compiler);
    const standardOption = options.standard || getStandardOption(options.lang);
    const optimizationOption = options.optimization || "-O0";

    // Compile command
    const compileCmd = `${compilerCmd} ${standardOption} ${optimizationOption} "${env.sourceFile}" -o "${env.outputFile}"`;

    // Execute compilation
    await executeCommand(compileCmd);
    return { success: true };
  } catch (error) {
    // Convert error to string safely
    const errorStr =
      typeof error === "string"
        ? error
        : error instanceof Error
        ? error.message
        : String(error);
    const sanitizedError = sanitizeOutput(errorStr);
    const formattedError = formatOutput(sanitizedError, "default");
    return { success: false, error: formattedError };
  }
};

/**
 * Generate assembly code
 * @param {CompilationEnvironment} env - Compilation environment
 * @param {string} code - Source code
 * @param {CompilationOptions} options - Compilation options
 * @returns {Promise<{success: boolean, assembly?: string, error?: string}>} Assembly generation result
 */
export const generateAssembly = async (
  env: CompilationEnvironment,
  code: string,
  options: CompilationOptions
): Promise<{ success: boolean; assembly?: string; error?: string }> => {
  try {
    // Write code to source file
    writeCodeToFile(env.sourceFile, code);

    // Determine compiler options
    const compilerCmd = getCompilerCommand(options.lang, options.compiler);
    const standardOption = options.standard || getStandardOption(options.lang);
    const optimizationOption = options.optimization || "-O0";

    // Generate assembly command
    const asmCmd = `${compilerCmd} -S -fno-asynchronous-unwind-tables ${optimizationOption} ${standardOption} "${env.sourceFile}" -o "${env.asmFile}"`;

    // Execute assembly generation
    await executeCommand(asmCmd);

    // Read assembly code
    const assemblyCode = fs.readFileSync(env.asmFile, "utf8");
    return { success: true, assembly: assemblyCode };
  } catch (error) {
    // Convert error to string safely
    const errorStr =
      typeof error === "string"
        ? error
        : error instanceof Error
        ? error.message
        : String(error);
    const sanitizedError = sanitizeOutput(errorStr);
    const formattedError = formatOutput(sanitizedError, "default");
    return { success: false, error: formattedError };
  }
};

/**
 * Run memory check on code
 * @param {CompilationEnvironment} env - Compilation environment
 * @param {string} code - Source code
 * @param {CompilationOptions} options - Compilation options
 * @returns {Promise<{success: boolean, report?: string, error?: string}>} Memory check result
 */
export const runMemoryCheck = async (
  env: CompilationEnvironment,
  code: string,
  options: CompilationOptions
): Promise<{ success: boolean; report?: string; error?: string }> => {
  try {
    // Write code to source file
    writeCodeToFile(env.sourceFile, code);

    // Determine compiler options
    const compilerCmd = getCompilerCommand(options.lang, options.compiler);
    const standardOption = options.standard || getStandardOption(options.lang);
    const optimizationOption = options.optimization || "-O0";

    // Compile with debug info
    const compileCmd = `${compilerCmd} -g ${standardOption} ${optimizationOption} "${env.sourceFile}" -o "${env.outputFile}"`;

    try {
      await executeCommand(compileCmd);
    } catch (error) {
      // Convert error to string safely
      const errorStr =
        typeof error === "string"
          ? error
          : error instanceof Error
          ? error.message
          : String(error);
      const sanitizedError = sanitizeOutput(errorStr);
      const formattedError = formatOutput(sanitizedError, "default");
      return { success: false, error: formattedError };
    }

    // Create valgrind log file path
    const valgrindLog = path.join(env.tmpDir.name, "valgrind.log");

    // Run Valgrind
    const valgrindCmd = `valgrind --tool=memcheck --leak-check=full --show-leak-kinds=all --track-origins=yes --log-file="${valgrindLog}" "${env.outputFile}"`;

    await executeCommand(valgrindCmd, { failOnError: false });

    // Read Valgrind log
    const valgrindOutput = fs.readFileSync(valgrindLog, "utf8");

    // Extract important information
    let report = "";
    const lines = valgrindOutput.split("\n");
    let startReading = false;

    for (const line of lines) {
      if (line.includes("HEAP SUMMARY:")) {
        startReading = true;
      }

      if (
        startReading &&
        line.trim() !== "" &&
        !line.includes("For lists of")
      ) {
        report += line + "\n";
      }
    }

    // Format report
    const formattedReport = formatOutput(report, "memcheck");
    return { success: true, report: formattedReport };
  } catch (error) {
    return {
      success: false,
      error: `Error during memory check: ${error}`,
    };
  }
};

/**
 * Format code using clang-format
 * @param {string} code - Source code to format
 * @param {string} style - Formatting style
 * @returns {Promise<{success: boolean, formattedCode?: string, error?: string}>} Formatting result
 */
export const formatCode = async (
  code: string,
  style: string = "WebKit"
): Promise<{ success: boolean; formattedCode?: string; error?: string }> => {
  // Create temporary directory
  const tmpDir = tmp.dirSync({
    prefix: "CinCout-Format-",
    unsafeCleanup: true,
  });
  const inFile = path.join(tmpDir.name, "input.cpp");

  try {
    // Write code to file
    fs.writeFileSync(inFile, code, "utf8");

    // Run clang-format
    const formatCmd = `clang-format -style=${style} "${inFile}" -i`;
    await executeCommand(formatCmd);

    // Read formatted code
    const formattedCode = fs.readFileSync(inFile, "utf8");
    return { success: true, formattedCode };
  } catch (error) {
    return {
      success: false,
      error: `Error formatting code: ${error}`,
    };
  } finally {
    // Clean up
    tmpDir.removeCallback();
  }
};

/**
 * Run style check on code
 * @param {string} code - Source code to check
 * @returns {Promise<{success: boolean, report?: string, error?: string}>} Style check result
 */
export const runStyleCheck = async (
  code: string
): Promise<{ success: boolean; report?: string; error?: string }> => {
  // Create temporary directory
  const tmpDir = tmp.dirSync({ prefix: "CinCout-Style-", unsafeCleanup: true });
  const inFile = path.join(tmpDir.name, "input.cpp");

  try {
    // Write code to file
    fs.writeFileSync(inFile, code, "utf8");

    // Run cppcheck
    const cppcheckCmd = `cppcheck --enable=all --suppress=missingInclude --suppress=missingIncludeSystem --suppress=unmatchedSuppression --suppress=checkersReport --inline-suppr --verbose "${inFile}" 2>&1`;

    const { stdout } = await executeCommand(cppcheckCmd, {
      shell: true as unknown as string,
      failOnError: false,
    });

    let output = "";
    let hasOutput = false;

    const lines = stdout.split("\n");
    for (const line of lines) {
      // Skip specific warnings
      if (
        line.includes("[checkersReport]") ||
        line.includes("missingIncludeSystem") ||
        line.includes("unmatchedSuppression")
      ) {
        continue;
      }

      // Remove file paths
      if (line.includes(":")) {
        const parts = line.split(":");
        if (parts.length >= 4) {
          let newLine = `${parts[1]}:${parts[2]}: `;
          // Error message
          for (let i = 3; i < parts.length; i++) {
            newLine += parts[i];
            if (i < parts.length - 1) {
              newLine += ":";
            }
          }
          output += newLine + "\n";
          hasOutput = true;
        }
      }
    }

    if (!hasOutput) {
      return {
        success: true,
        report:
          "<div class='output-block'><span style='color: #50fa7b; font-weight: bold;'><i class='fas fa-check-circle'></i> No issues found. Your code looks good!</span></div>",
      };
    } else {
      // Apply formatting to style check output
      const formattedOutput = formatOutput(output, "style");
      return { success: true, report: formattedOutput };
    }
  } catch (error) {
    return {
      success: false,
      error: `Error checking style: ${error}`,
    };
  } finally {
    // Clean up
    tmpDir.removeCallback();
  }
};

/**
 * Send WebSocket message with compilation status
 * @param {ExtendedWebSocket} ws - WebSocket connection
 * @param {string} type - Message type
 * @param {any} data - Message data
 */
export const sendCompilationMessage = (
  ws: ExtendedWebSocket,
  type: string,
  data?: any
): void => {
  sendWebSocketMessage(ws, {
    type,
    ...data,
    timestamp: Date.now(),
  });
};
