/**
 * Compilation Service
 * Centralizes all compilation-related logic in the application
 */
import * as fs from "fs-extra";
import * as path from "path";
import * as tmp from "tmp";
import { exec, ExecOptions } from "child_process";
import {
  CompilationEnvironment,
  CompilationOptions,
  ExecutionResult,
  ICompilationService,
  CompilationResult,
  AssemblyResult,
  MemoryCheckResult,
  StyleCheckResult,
  FormatResult
} from "../types";

/**
 * Compilation Service Implementation
 * Handles all code compilation, assembly generation, memory checks, and code formatting
 */
export class CompilationService implements ICompilationService {
  private readonly debug: boolean;

  /**
   * Create a new CompilationService
   * @param {boolean} debug - Enable debug logging
   */
  constructor(debug: boolean = false) {
    this.debug = debug;
  }

  /**
   * Creates a compilation environment with appropriate files
   * @param {string} lang - Programming language ('c' or 'cpp')
   * @returns {CompilationEnvironment} Object with file paths
   */
  createCompilationEnvironment(lang: string): CompilationEnvironment {
    try {
      const tmpDir = tmp.dirSync({ prefix: "CinCout-", unsafeCleanup: true });
      const sourceExtension = lang === "cpp" ? "cpp" : "c";
      const sourceFile = path.join(tmpDir.name, `program.${sourceExtension}`);
      const outputFile = path.join(tmpDir.name, "program.out");
      const asmFile = path.join(tmpDir.name, "program.s");

      if (this.debug) {
        console.log(`Created compilation environment in ${tmpDir.name}`);
      }

      return { tmpDir, sourceFile, outputFile, asmFile };
    } catch (error) {
      console.error("Error creating compilation environment:", error);
      throw new Error(`Failed to create compilation environment: ${error}`);
    }
  }

  /**
   * Write code to a file
   * @param {string} filePath - Path to write to
   * @param {string} code - Code content
   */
  writeCodeToFile(filePath: string, code: string): void {
    try {
      fs.writeFileSync(filePath, code, "utf8");
      
      if (this.debug) {
        console.log(`Wrote code to file: ${filePath}`);
      }
    } catch (error) {
      console.error(`Error writing code to file ${filePath}:`, error);
      throw new Error(`Failed to write code to file: ${error}`);
    }
  }

  /**
   * Get compiler command based on language and compiler selection
   * @param {string} lang - Programming language ('c' or 'cpp')
   * @param {string} compiler - Compiler selection
   * @returns {string} Compiler command
   * @private
   */
  private getCompilerCommand(lang: string, compiler?: string): string {
    return lang === "cpp"
      ? compiler === "clang"
        ? "clang++"
        : "g++"
      : compiler === "clang"
      ? "clang"
      : "gcc";
  }

  /**
   * Get language standard option based on language
   * @param {string} lang - Programming language ('c' or 'cpp')
   * @returns {string} Standard option
   * @private
   */
  private getStandardOption(lang: string): string {
    return lang === "cpp" ? "-std=c++20" : "-std=c11";
  }

  /**
   * Execute a shell command
   * @param {string} command - Command to execute
   * @param {object} options - Execution options
   * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>} Promise with stdout and stderr
   * @private
   */
  private async executeCommand(
    command: string,
    options: ExecOptions & {
      shell?: boolean | string;
      failOnError?: boolean;
    } = {}
  ): Promise<ExecutionResult> {
    if (this.debug) {
      console.log(`Executing command: ${command}`);
    }
    
    return new Promise((resolve, reject) => {
      exec(command, options, (error, stdout, stderr) => {
        if (error && options.failOnError !== false) {
          if (this.debug) {
            console.error(`Command execution error: ${error.message}`);
            console.error(`Error details: ${stderr}`);
          }
          reject(stderr || error.message);
          return;
        }
        
        const result = {
          stdout,
          stderr,
          exitCode: error ? error.code || 1 : 0,
        };
        
        if (this.debug) {
          console.log(`Command completed with exit code ${result.exitCode}`);
        }
        
        resolve(result);
      });
    });
  }

  /**
   * Format output for display
   * @param {string} text - Text to format
   * @param {string} outputType - Type of output (default, memcheck, style, etc.)
   * @returns {string} Formatted HTML output
   * @private
   */
  private formatOutput(text: string, outputType: string = "default"): string {
    if (!text) return "";

    // Sanitize file paths (previously done in separate sanitizeOutput method)
    text = text.replace(/[^:\s]+\.(cpp|c|h|hpp):/g, "");

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
  }

  /**
   * Compile code with options
   * @param {CompilationEnvironment} env - Compilation environment
   * @param {string} code - Source code
   * @param {CompilationOptions} options - Compilation options
   * @returns {Promise<{success: boolean, output?: string, error?: string}>} Compilation result
   */
  async compileCode(
    env: CompilationEnvironment,
    code: string,
    options: CompilationOptions
  ): Promise<CompilationResult> {
    try {
      // Write code to source file
      this.writeCodeToFile(env.sourceFile, code);

      // Determine compiler options
      const compilerCmd = this.getCompilerCommand(options.lang, options.compiler);
      const standardOption = options.standard || this.getStandardOption(options.lang);
      const optimizationOption = options.optimization || "-O0";

      // Compile command
      const compileCmd = `${compilerCmd} ${standardOption} ${optimizationOption} "${env.sourceFile}" -o "${env.outputFile}"`;

      // Execute compilation
      await this.executeCommand(compileCmd);
      return { success: true };
    } catch (error) {
      // Convert error to string safely
      const errorStr =
        typeof error === "string"
          ? error
          : error instanceof Error
          ? error.message
          : String(error);
      // Use the formatOutput method directly (no need for sanitizeOutput)
      const formattedError = this.formatOutput(errorStr, "default");
      return { success: false, error: formattedError };
    }
  }

  /**
   * Generate assembly code
   * @param {CompilationEnvironment} env - Compilation environment
   * @param {string} code - Source code
   * @param {CompilationOptions} options - Compilation options
   * @returns {Promise<{success: boolean, assembly?: string, error?: string}>} Assembly generation result
   */
  async generateAssembly(
    env: CompilationEnvironment,
    code: string,
    options: CompilationOptions
  ): Promise<AssemblyResult> {
    try {
      // Write code to source file
      this.writeCodeToFile(env.sourceFile, code);

      // Determine compiler options
      const compilerCmd = this.getCompilerCommand(options.lang, options.compiler);
      const standardOption = options.standard || this.getStandardOption(options.lang);
      const optimizationOption = options.optimization || "-O0";

      // Generate assembly command
      const asmCmd = `${compilerCmd} -S -fno-asynchronous-unwind-tables ${optimizationOption} ${standardOption} "${env.sourceFile}" -o "${env.asmFile}"`;

      // Execute assembly generation
      await this.executeCommand(asmCmd);

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
      // Use the formatOutput method directly (no need for sanitizeOutput)
      const formattedError = this.formatOutput(errorStr, "default");
      return { success: false, error: formattedError };
    }
  }

  /**
   * Run memory check on code
   * @param {CompilationEnvironment} env - Compilation environment
   * @param {string} code - Source code
   * @param {CompilationOptions} options - Compilation options
   * @returns {Promise<{success: boolean, report?: string, error?: string}>} Memory check result
   */
  async runMemoryCheck(
    env: CompilationEnvironment,
    code: string,
    options: CompilationOptions
  ): Promise<MemoryCheckResult> {
    try {
      // Write code to source file
      this.writeCodeToFile(env.sourceFile, code);

      // Determine compiler options
      const compilerCmd = this.getCompilerCommand(options.lang, options.compiler);
      const standardOption = options.standard || this.getStandardOption(options.lang);
      const optimizationOption = options.optimization || "-O0";

      // Compile with debug info
      const compileCmd = `${compilerCmd} -g ${standardOption} ${optimizationOption} "${env.sourceFile}" -o "${env.outputFile}"`;

      try {
        await this.executeCommand(compileCmd);
      } catch (error) {
        // Convert error to string safely
        const errorStr =
          typeof error === "string"
            ? error
            : error instanceof Error
            ? error.message
            : String(error);
        // Use the formatOutput method directly (no need for sanitizeOutput)
        const formattedError = this.formatOutput(errorStr, "default");
        return { success: false, error: formattedError };
      }

      // Create valgrind log file path
      const valgrindLog = path.join(env.tmpDir.name, "valgrind.log");

      // Run Valgrind
      const valgrindCmd = `valgrind --tool=memcheck --leak-check=full --show-leak-kinds=all --track-origins=yes --log-file="${valgrindLog}" "${env.outputFile}"`;

      await this.executeCommand(valgrindCmd, { failOnError: false });

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
      const formattedReport = this.formatOutput(report, "memcheck");
      return { success: true, report: formattedReport };
    } catch (error) {
      return {
        success: false,
        error: `Error during memory check: ${error}`,
      };
    }
  }

  /**
   * Format code using clang-format
   * @param {string} code - Source code to format
   * @param {string} style - Formatting style
   * @returns {Promise<{success: boolean, formattedCode?: string, error?: string}>} Formatting result
   */
  async formatCode(
    code: string,
    style: string = "WebKit"
  ): Promise<FormatResult> {
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
      await this.executeCommand(formatCmd);

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
  }

  /**
   * Run style check on code
   * @param {string} code - Source code to check
   * @returns {Promise<{success: boolean, report?: string, error?: string}>} Style check result
   */
  async runStyleCheck(code: string): Promise<StyleCheckResult> {
    // Create temporary directory
    const tmpDir = tmp.dirSync({ prefix: "CinCout-Style-", unsafeCleanup: true });
    const inFile = path.join(tmpDir.name, "input.cpp");

    try {
      // Write code to file
      fs.writeFileSync(inFile, code, "utf8");

      // Run cppcheck
      const cppcheckCmd = `cppcheck --enable=all --suppress=missingInclude --suppress=missingIncludeSystem --suppress=unmatchedSuppression --suppress=checkersReport --inline-suppr --verbose "${inFile}" 2>&1`;

      const { stdout } = await this.executeCommand(cppcheckCmd, {
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
        const formattedOutput = this.formatOutput(output, "style");
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
  }
}

// Create singleton instance with debug mode in non-production
export const compilationService = new CompilationService(
  process.env.NODE_ENV !== "production"
);
