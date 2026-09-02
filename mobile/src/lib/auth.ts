import { apiClient } from './api-client';
import { authStore } from './auth-store';
import { setSession, type AuthUser } from './session';

export type { AuthUser };

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
  setSession({ status: 'signedIn', user: data.user });
  return data.user;
}

export function login(email: string, password: string): Promise<AuthUser> {
  return open('/api/auth/login', { email, password });
}

export function register(name: string, email: string, password: string): Promise<AuthUser> {
  return open('/api/auth/register', { name, email, password });
}

/**
 * Ends the session server-side, then drops the keychain entries.
 *
 * No body: `sid` rides on the access token, so the session names itself
 * (`auth.controller.ts` reads no body on this route and has no `validate`
 * schema). The fail-closed arm in `auth.service.logout` triggers on a *missing
 * `sid`*, not on a missing body — d-0cdcga amendment 1, t-0cgtgo.
 *
 * The keychain is cleared in a `finally` because a network failure must not
 * leave the app on a signed-out screen still holding live credentials.
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post('/api/auth/logout');
  } finally {
    await authStore.clear();
    setSession({ status: 'signedOut' });
  }
}

/**
 * Resolves the `loading` session on boot. A stored access token is not proof of
 * a live session — it may be expired, or its session may have been revoked from
 * another device — so the truth comes from the server. `apiClient` refreshes a
 * 401 once and clears the keychain when that fails, so a rejection here means
 * signed out for good.
 */
export async function hydrateSession(): Promise<void> {
  if (!(await authStore.getAccessToken())) {
    setSession({ status: 'signedOut' });
    return;
  }
  try {
    const user = await apiClient.get<AuthUser>('/api/auth/me');
    setSession({ status: 'signedIn', user });
  } catch {
    await authStore.clear();
    setSession({ status: 'signedOut' });
  }
}
