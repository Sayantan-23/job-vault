import { apiClient } from './api-client';
import { authStore } from './auth-store';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

/**
 * `client: 'native'` is what makes the backend answer with the token pair in
 * the body instead of setting cookies. Native mode is selected by input source,
 * never by a header (d-0cc1x6).
 */
interface NativeAuthData {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
}

async function open(path: string, body: Record<string, string>): Promise<AuthUser> {
  const data = await apiClient.post<NativeAuthData>(path, { ...body, client: 'native' });
  await authStore.save({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data.user;
}

export function login(email: string, password: string): Promise<AuthUser> {
  return open('/api/auth/login', { email, password });
}

export function register(name: string, email: string, password: string): Promise<AuthUser> {
  return open('/api/auth/register', { name, email, password });
}

/**
 * Ends the session server-side, then drops the keychain entries. The refresh
 * token goes in the body per d-0cdcga: a logout that cannot name its session
 * fails closed and revokes every device the user is signed in on.
 *
 * The keychain is cleared in a `finally` because a network failure must not
 * leave the app on a signed-out screen still holding live credentials.
 */
export async function logout(): Promise<void> {
  const refreshToken = await authStore.getRefreshToken();
  try {
    await apiClient.post('/api/auth/logout', refreshToken ? { refreshToken } : {});
  } finally {
    await authStore.clear();
  }
}
