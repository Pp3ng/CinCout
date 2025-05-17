/**
 * Code Processing Service
 * Centralizes all code processing operations in the application including
 * compilation, assembly generation, static analysis, formatting and debugging
 */
import * as fs from "fs-extra";
import * as path from "path";
import * as tmp from "tmp";
import { exec, ExecOptions } from "child_process";
import {
  CompilationEnvironment,
  CompilationOptions,
  ExecutionResult,
  ICodeProcessingService,
  CompilationResult,
  AssemblyResult,
  LintCodeResult,
  FormatResult,
  DebugSessionResult,
} from "../types";

/**
 * Code Processing Service Implementation
 * Handles code compilation, assembly generation, memory checks, and code analysis
 */
export class CodeProcessingService implements ICodeProcessingService {
  // =====================================
  // ENVIRONMENT MANAGEMENT
  // =====================================

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
    } catch (error) {
      console.error(`Error writing code to file ${filePath}:`, error);
      throw new Error(`Failed to write code to file: ${error}`);
    }
  }

  // =====================================
  // COMPILATION OPERATIONS
  // =====================================

  /**
   * Compile code with options
   * @param {CompilationEnvironment} env - Compilation environment
   * @param {string} code - Source code
   * @param {CompilationOptions} options - Compilation options
   * @returns {Promise<CompilationResult>} Compilation result
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
      const compilerCmd = this.getCompilerCommand(
        options.lang,
        options.compiler
      );
      const standardOption =
        options.standard || this.getStandardOption(options.lang);
      const optimizationOption = options.optimization || "-O0";

      // Compile command
      const compileCmd = `${compilerCmd} ${standardOption} ${optimizationOption} "${env.sourceFile}" -o "${env.outputFile}"`;

      // Execute compilation
      await this.executeCommand(compileCmd);
      return { success: true };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Generate assembly code
   * @param {CompilationEnvironment} env - Compilation environment
   * @param {string} code - Source code
   * @param {CompilationOptions} options - Compilation options
   * @returns {Promise<AssemblyResult>} Assembly generation result
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
      const compilerCmd = this.getCompilerCommand(
        options.lang,
        options.compiler
      );
      const standardOption =
        options.standard || this.getStandardOption(options.lang);
      const optimizationOption = options.optimization || "-O0";

      // Generate assembly command
      const asmCmd = `${compilerCmd} -S  ${optimizationOption} ${standardOption} "${env.sourceFile}" -o "${env.asmFile}"`;

      // Execute assembly generation
      await this.executeCommand(asmCmd);

      // Read assembly code
      const assemblyCode = fs.readFileSync(env.asmFile, "utf8");
      return { success: true, assembly: assemblyCode };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Start a GDB debug session for a program
   * @param {CompilationEnvironment} env - Compilation environment
   * @param {CompilationOptions} options - Compilation options
   * @returns {Promise<DebugSessionResult>} Debug session result
   */
  async startDebugSession(
    env: CompilationEnvironment,
    options: CompilationOptions
  ): Promise<DebugSessionResult> {
    try {
      // Determine compiler options for debug build
      const compilerCmd = this.getCompilerCommand(
        options.lang,
        options.compiler
      );
      const standardOption =
        options.standard || this.getStandardOption(options.lang);

      // Always compile with debug info and optimize for debugging
      const compileCmd = `${compilerCmd} -g -O0 ${standardOption} "${env.sourceFile}" -o "${env.outputFile}"`;

      try {
        await this.executeCommand(compileCmd);
      } catch (error) {
        return this.handleError(error);
      }

      return {
        success: true,
        message: "Program compiled successfully for debugging.",
      };
    } catch (error) {
      return this.handleError(error, "Error setting up debug session");
    }
  }

  /**
   * Start syscall tracing session for a program
   * @param {CompilationEnvironment} env - Compilation environment
   * @param {string} code - Source code
   * @param {CompilationOptions} options - Compilation options
   * @returns {Promise<{success: boolean, straceLogFile?: string, error?: string}>} Syscall tracing preparation result
   */
  async startSyscallSession(
    env: CompilationEnvironment,
    code: string,
    options: CompilationOptions
  ): Promise<{ success: boolean; straceLogFile?: string; error?: string }> {
    try {
      // Write code to source file
      this.writeCodeToFile(env.sourceFile, code);

      // Determine compiler options
      const compilerCmd = this.getCompilerCommand(
        options.lang,
        options.compiler
      );
      const standardOption =
        options.standard || this.getStandardOption(options.lang);
      const optimizationOption = options.optimization || "-O0";

      // Compile with optimization level specified by user
      const compileCmd = `${compilerCmd} ${standardOption} ${optimizationOption} "${env.sourceFile}" -o "${env.outputFile}"`;

      try {
        await this.executeCommand(compileCmd);
      } catch (error) {
        const errorStr =
          typeof error === "string"
            ? error
            : error instanceof Error
            ? error.message
            : String(error);

        const formattedError = this.formatOutput(errorStr, "default");
        return { success: false, error: formattedError };
      }

      // Create strace log file path
      const straceLogFile = path.join(env.tmpDir.name, "strace.log");

      // Return success and the path to the strace log file
      // The actual strace execution will be done by the socket handler
      return {
        success: true,
        straceLogFile: straceLogFile,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error preparing syscall tracing session: ${error}`,
      };
    }
  }

  // =====================================
  // CODE ANALYSIS AND FORMATTING
  // =====================================

  /**
   * Format code using clang-format
   * @param {string} code - Source code to format
   * @param {string} style - Formatting style
   * @returns {Promise<FormatResult>} Formatting result
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
   * Run lint code check on code
   * @param {string} code - Source code to check
   * @param {string} lang - Language type (c or cpp)
   * @returns {Promise<LintCodeResult>} Lint code result
   */
  async runLintCode(code: string): Promise<LintCodeResult> {
    // Create temporary directory
    const tmpDir = tmp.dirSync({
      prefix: "CinCout-Style-",
      unsafeCleanup: true,
    });
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

      return this.processLintOutput(stdout);
    } catch (error) {
      return {
        success: false,
        error: `Error linting code: ${error}`,
      };
    } finally {
      // Clean up
      tmpDir.removeCallback();
    }
  }

  /**
   * Process cppcheck output to create readable lint results
   * @param stdout - Raw output from cppcheck
   * @returns Formatted lint result
   * @private
   */
  private processLintOutput(stdout: string): LintCodeResult {
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
      // Apply formatting to lint code output
      const formattedOutput = this.formatOutput(output, "style");
      return { success: true, report: formattedOutput };
    }
  }

  // =====================================
  // MEMORY AND PERFORMANCE ANALYSIS
  // =====================================

  /**
   * Start leak detection process
   * This compiles the code with debug info and prepares for valgrind execution
   * but lets the socket handler manage the actual execution and result processing
   *
   * @param {CompilationEnvironment} env - Compilation environment
   * @param {string} code - Source code
   * @param {CompilationOptions} options - Compilation options
   * @returns {Promise<{success: boolean, valgrindLogFile?: string, error?: string}>} Leak detection preparation result
   */
  async startLeakDetectSession(
    env: CompilationEnvironment,
    code: string,
    options: CompilationOptions
  ): Promise<{ success: boolean; valgrindLogFile?: string; error?: string }> {
    try {
      // Write code to source file
      this.writeCodeToFile(env.sourceFile, code);

      // Determine compiler options
      const compilerCmd = this.getCompilerCommand(
        options.lang,
        options.compiler
      );
      const standardOption =
        options.standard || this.getStandardOption(options.lang);
      const optimizationOption = options.optimization || "-O0";

      // Compile with debug info
      const compileCmd = `${compilerCmd} -g ${standardOption} ${optimizationOption} "${env.sourceFile}" -o "${env.outputFile}"`;

      try {
        await this.executeCommand(compileCmd);
      } catch (error) {
        return this.handleError(error);
      }

      // Create valgrind log file path
      const valgrindLogFile = path.join(env.tmpDir.name, "valgrind.log");

      // Return success and the path to the valgrind log file
      return {
        success: true,
        valgrindLogFile: valgrindLogFile,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error preparing leak detection session: ${error}`,
      };
    }
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

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
    return new Promise((resolve, reject) => {
      exec(command, options, (error, stdout, stderr) => {
        if (error && options.failOnError !== false) {
          reject(stderr || error.message);
          return;
        }

        const result = {
          stdout,
          stderr,
          exitCode: error ? error.code || 1 : 0,
        };

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

    // Remove file paths from error messages
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
      if (outputType === "memcheck") {
        text = this.formatMemcheckOutput(text);
      }

      // Common formatting for styled output types
      text = this.applyCommonFormatting(text, outputType);
    }

    return text;
  }

  /**
   * Format Valgrind memcheck output
   * @param text - Raw memcheck text
   * @returns Formatted memcheck output
   * @private
   */
  private formatMemcheckOutput(text: string): string {
    // Pre-process memcheck output
    return (
      text
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
        )
    );
  }

  /**
   * Apply common text formatting
   * @param text - Raw text
   * @param outputType - Type of output
   * @returns Formatted text
   * @private
   */
  private applyCommonFormatting(text: string, outputType: string): string {
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
        .replace(/###LEAK:(.*?)###/g, '<div class="leak">$1</div>')
        .trim() // Remove leading and trailing whitespace
        .replace(/\n{2,}/g, "\n"); // Remove multiple newlines
    }

    return text;
  }

  /**
   * Unified error handling for various operations
   * @param error - The error to handle
   * @param prefix - Optional prefix for error message
   * @returns Formatted error result
   * @private
   */
  private handleError(error: any, prefix?: string): any {
    // Convert error to string safely
    const errorStr =
      typeof error === "string"
        ? error
        : error instanceof Error
        ? error.message
        : String(error);

    // Use the formatOutput method directly
    const formattedError = this.formatOutput(errorStr, "default");

    // Return appropriate error format
    return {
      success: false,
      error: prefix ? `${prefix}: ${formattedError}` : formattedError,
    };
  }
}

// Create singleton instance
export const codeProcessingService = new CodeProcessingService();
