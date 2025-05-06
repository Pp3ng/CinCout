import { CompileOptions } from "../types";

/**
 * API Service - handles all API calls to the backend
 */
export class ApiService {
  /**
   * Make a generic API POST request
   * @param endpoint - API endpoint
   * @param data - Request data
   * @returns Promise with response data
   */
  private static async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API error (${endpoint}): ${response.statusText}`);
    }

    return (await response.text()) as unknown as T;
  }

  static async fetchAssembly(options: CompileOptions): Promise<string> {
    return this.post<string>("assembly", options);
  }

  static async runMemCheck(options: CompileOptions): Promise<string> {
    return this.post<string>("memcheck", options);
  }

  static async formatCode(code: string, lang: string): Promise<string> {
    return this.post<string>("format", { code, lang });
  }

  static async runStyleCheck(code: string, lang: string): Promise<string> {
    return this.post<string>("styleCheck", { code, lang });
  }
}
