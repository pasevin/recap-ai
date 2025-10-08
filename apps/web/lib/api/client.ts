// API client utilities

import { ApiResponse, ApiError } from './types';

class APIClient {
  private baseURL = '';

  async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: unknown;
      params?: Record<string, string | number | boolean | undefined>;
    } = {}
  ): Promise<ApiResponse<T>> {
    const { method = 'GET', body, params } = options;

    let url = `${this.baseURL}/api${endpoint}`;

    // Add query parameters for GET requests
    if (method === 'GET' && params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
    }

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Add body for non-GET requests
    if (method !== 'GET' && body) {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorDetails: unknown;

        try {
          const errorData = (await response.json()) as { message?: string };
          errorMessage = errorData.message ?? errorMessage;
          errorDetails = errorData;
        } catch {
          // If we can't parse error JSON, use the status text
        }

        const error: ApiError = {
          message: errorMessage,
          status: response.status,
          details: errorDetails,
        };

        throw error as ApiError;
      }

      const data = (await response.json()) as unknown;
      return data as ApiResponse<T>;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError: ApiError = {
          message: 'Network error: Please check your connection',
          code: 'NETWORK_ERROR',
        };
        throw networkError;
      }
      throw error;
    }
  }

  // Convenience methods
  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }
}

export const apiClient = new APIClient();
