import type {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RefreshResponse,
  UpdateProfileRequest,
} from '~/types/auth';
import type { ApiResponse } from '~/types/api';

const TOKEN_STORAGE_KEY = 'jobvault_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'jobvault_refresh_token';

/**
 * Authentication composable that manages user state, tokens,
 * login/register/logout flows, and session persistence.
 */
export function useAuth() {
  const user = useState<User | null>('auth-user', () => null);
  const accessToken = useState<string | null>('auth-access-token', () => null);
  const refreshToken = useState<string | null>('auth-refresh-token', () => null);
  const isLoading = useState<boolean>('auth-loading', () => false);
  const isInitialized = useState<boolean>('auth-initialized', () => false);

  const isAuthenticated = computed(() => !!user.value && !!accessToken.value);

  /**
   * Store tokens in both reactive state and localStorage.
   */
  function setTokens(access: string, refresh: string): void {
    accessToken.value = access;
    refreshToken.value = refresh;
    if (import.meta.client) {
      localStorage.setItem(TOKEN_STORAGE_KEY, access);
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refresh);
    }
  }

  /**
   * Clear all auth state and localStorage tokens.
   */
  function clearTokens(): void {
    user.value = null;
    accessToken.value = null;
    refreshToken.value = null;
    if (import.meta.client) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
  }

  /**
   * Get the current access token (from state or localStorage fallback).
   */
  function getAccessToken(): string | null {
    if (accessToken.value) return accessToken.value;
    if (import.meta.client) {
      const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (stored) {
        accessToken.value = stored;
        return stored;
      }
    }
    return null;
  }

  /**
   * Register a new user account.
   */
  async function register(credentials: RegisterRequest): Promise<void> {
    isLoading.value = true;
    try {
      const response = await $fetch<ApiResponse<AuthResponse>>(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        body: credentials,
      });
      const { accessToken: access, refreshToken: refresh, user: userData } = response.data;
      setTokens(access, refresh);
      user.value = userData;
      await navigateTo('/app/dashboard');
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Log in with email and password.
   */
  async function login(credentials: LoginRequest): Promise<void> {
    isLoading.value = true;
    try {
      const response = await $fetch<ApiResponse<AuthResponse>>(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        body: credentials,
      });
      const { accessToken: access, refreshToken: refresh, user: userData } = response.data;
      setTokens(access, refresh);
      user.value = userData;
      await navigateTo('/app/dashboard');
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Log out the current user. Clears tokens and redirects to login.
   */
  async function logout(): Promise<void> {
    const currentRefreshToken = refreshToken.value;
    const currentAccessToken = accessToken.value;

    // Clear state immediately for responsive UX
    clearTokens();

    // Best-effort server-side logout (don't block on failure)
    if (currentRefreshToken && currentAccessToken) {
      try {
        await $fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          body: { refreshToken: currentRefreshToken },
          headers: { Authorization: `Bearer ${currentAccessToken}` },
        });
      } catch {
        // Logout API failure is non-critical; tokens are already cleared client-side
      }
    }

    await navigateTo('/app/auth/login');
  }

  /**
   * Attempt to refresh the access token using the stored refresh token.
   * Returns true if successful, false otherwise.
   */
  async function refreshAccessToken(): Promise<boolean> {
    const currentRefreshToken = refreshToken.value
      || (import.meta.client ? localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) : null);

    if (!currentRefreshToken) return false;

    try {
      const response = await $fetch<ApiResponse<RefreshResponse>>(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        body: { refreshToken: currentRefreshToken },
      });
      setTokens(response.data.accessToken, response.data.refreshToken);
      return true;
    } catch {
      clearTokens();
      return false;
    }
  }

  /**
   * Fetch the current user's profile from the server.
   */
  async function fetchUser(): Promise<void> {
    const token = getAccessToken();
    if (!token) return;

    try {
      const response = await $fetch<ApiResponse<User>>(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      user.value = response.data;
    } catch {
      // If fetching user fails, try refreshing the token
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        try {
          const response = await $fetch<ApiResponse<User>>(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${accessToken.value}` },
          });
          user.value = response.data;
        } catch {
          clearTokens();
        }
      }
    }
  }

  /**
   * Update the user's profile (name, preferences).
   */
  async function updateProfile(data: UpdateProfileRequest): Promise<void> {
    const token = getAccessToken();
    if (!token) return;

    const response = await $fetch<ApiResponse<User>>(`${API_BASE_URL}/auth/profile`, {
      method: 'PATCH',
      body: data,
      headers: { Authorization: `Bearer ${token}` },
    });
    user.value = response.data;
  }

  /**
   * Redirect the user to the backend Google OAuth flow.
   */
  function initiateGoogleOAuth(): void {
    if (import.meta.client) {
      window.location.href = `${API_BASE_URL}/auth/google`;
    }
  }

  /**
   * Restore session from localStorage on app init.
   * Attempts to refresh token and fetch user data.
   */
  async function initSession(): Promise<void> {
    if (isInitialized.value) return;
    if (!import.meta.client) {
      isInitialized.value = true;
      return;
    }

    const storedAccess = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedRefresh = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);

    if (storedAccess && storedRefresh) {
      accessToken.value = storedAccess;
      refreshToken.value = storedRefresh;

      // Try to fetch the user with the stored access token
      try {
        const response = await $fetch<ApiResponse<User>>(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${storedAccess}` },
        });
        user.value = response.data;
      } catch {
        // Access token might be expired; try refreshing
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          try {
            const response = await $fetch<ApiResponse<User>>(`${API_BASE_URL}/auth/me`, {
              headers: { Authorization: `Bearer ${accessToken.value}` },
            });
            user.value = response.data;
          } catch {
            clearTokens();
          }
        }
      }
    }

    isInitialized.value = true;
  }

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    isInitialized,
    login,
    register,
    logout,
    refreshAccessToken,
    fetchUser,
    updateProfile,
    initiateGoogleOAuth,
    setTokens,
    clearTokens,
    getAccessToken,
    initSession,
  };
}
