import axios from "axios";
import { CompileOptions } from "../types";

/**
 * API Service Implementation
 * In React, this would become a custom hook (useApiService)
 */
class ApiService {
  /**
   * Fetch assembly code from API
   */
  async fetchAssembly(options: CompileOptions): Promise<string> {
    try {
      const response = await axios.post("/api/assembly", options);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Assembly API error: ${error.response?.statusText || error.message}`
        );
      }
      throw new Error("Assembly API error: Unknown error");
    }
  }

  /**
   * Format code using the API
   */
  async formatCode(code: string, lang: string): Promise<string> {
    try {
      const response = await axios.post("/api/format", { code, lang });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Format API error: ${error.response?.statusText || error.message}`
        );
      }
      throw new Error("Format API error: Unknown error");
    }
  }

  /**
   * Run style check on code
   */
  async runStyleCheck(code: string, lang: string): Promise<string> {
    try {
      const response = await axios.post("/api/styleCheck", { code, lang });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Style check API error: ${
            error.response?.statusText || error.message
          }`
        );
      }
      throw new Error("Style check API error: Unknown error");
    }
  }
}

// Create singleton instance
export const apiService = new ApiService();
export default apiService;
