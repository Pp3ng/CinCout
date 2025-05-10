import { CompileOptions } from "../types";

/**
 * API Service Implementation
 */
class ApiService {
  private readonly baseHeaders = {
    "Content-Type": "application/json",
  };

  /**
   * Generic method to make POST requests
   */
  private async post<T>(
    endpoint: string,
    data: T,
    expectJson = false
  ): Promise<string> {
    try {
      const response = await fetch(`/api/${endpoint}`, {
        method: "POST",
        headers: this.baseHeaders,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`API error (${endpoint}): ${response.statusText}`);
      }

      return expectJson ? await response.json() : await response.text();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `${
          endpoint.charAt(0).toUpperCase() + endpoint.slice(1)
        } API error: ${errorMessage}`
      );
    }
  }

  /**
   * Fetch assembly code from API
   */
  async fetchAssembly(options: CompileOptions): Promise<string> {
    return this.post("assembly", options, false);
  }

  /**
   * Format code using the API
   */
  async formatCode(code: string, lang: string): Promise<string> {
    return this.post("format", { code, lang }, false);
  }

  /**
   * Run style check on code
   */
  async runStyleCheck(code: string, lang: string): Promise<string> {
    return this.post("styleCheck", { code, lang }, false);
  }
}

// Create singleton instance
export const apiService = new ApiService();
export default apiService;
