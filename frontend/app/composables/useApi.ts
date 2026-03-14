import type { ApiError } from '~/types/api';

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
}

/**
 * Provides a configured $fetch wrapper that:
 * 1. Prepends API_BASE_URL to all requests
 * 2. Attaches Authorization header from useAuth
 * 3. Handles 401 responses with automatic token refresh and retry
 * 4. Handles errors via useToastNotify
 * 5. Returns typed responses
 */
export function useApi() {
  const toast = useToastNotify();
  const auth = useAuth();

  function getAuthHeaders(): Record<string, string> {
    const token = auth.getAccessToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const fullUrl = `${API_BASE_URL}${url}`;

    try {
      const response = await $fetch<T>(fullUrl, {
        method: options.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        body: options.body,
        params: options.params,
        headers: {
          ...getAuthHeaders(),
          ...(options.headers || {}),
        },
      });
      return response;
    } catch (err: unknown) {
      const fetchError = err as { data?: ApiError; statusCode?: number; status?: number };
      const statusCode = fetchError.statusCode || fetchError.status;

      // On 401, attempt token refresh and retry once
      if (statusCode === 401) {
        const refreshed = await auth.refreshAccessToken();
        if (refreshed) {
          try {
            const retryResponse = await $fetch<T>(fullUrl, {
              method: options.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
              body: options.body,
              params: options.params,
              headers: {
                ...getAuthHeaders(),
                ...(options.headers || {}),
              },
            });
            return retryResponse;
          } catch (retryErr: unknown) {
            const retryFetchError = retryErr as { data?: ApiError; statusCode?: number; status?: number };
            const retryStatus = retryFetchError.statusCode || retryFetchError.status;

            // If retry also fails with 401, clear auth and redirect to login
            if (retryStatus === 401) {
              auth.clearTokens();
              await navigateTo('/app/auth/login');
            }

            showErrorToast(retryFetchError);
            throw retryErr;
          }
        } else {
          // Refresh failed, redirect to login
          auth.clearTokens();
          await navigateTo('/app/auth/login');
          throw err;
        }
      }

      showErrorToast(fetchError);
      throw err;
    }
  }

  function showErrorToast(fetchError: { data?: ApiError }) {
    if (fetchError.data?.message) {
      const message = Array.isArray(fetchError.data.message)
        ? fetchError.data.message.join(', ')
        : fetchError.data.message;
      toast.error(message);
    } else {
      toast.error('An unexpected error occurred. Please try again.');
    }
  }

  async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    return request<T>(url, { method: 'GET', params });
  }

  async function post<T>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, { method: 'POST', body });
  }

  async function put<T>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, { method: 'PUT', body });
  }

  async function patch<T>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, { method: 'PATCH', body });
  }

  async function del<T>(url: string): Promise<T> {
    return request<T>(url, { method: 'DELETE' });
  }

  return { get, post, put, patch, delete: del };
}
