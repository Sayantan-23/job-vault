import * as SecureStore from 'expo-secure-store';

/**
 * The session tokens, in the OS keychain (iOS Keychain / Android
 * EncryptedSharedPreferences) — never AsyncStorage, which is plaintext on disk
 * (d-0cc1x6). A native client has no cookie jar, so the pair the backend puts
 * in the response body lives here and rides on `Authorization: Bearer`.
 */
const ACCESS_KEY = 'jobvault.accessToken';
const REFRESH_KEY = 'jobvault.refreshToken';

export interface TokenPair {
  accessToken: string;
  /** Absent on a grace-window refresh — see `save`. */
  refreshToken?: string | undefined;
}

export const authStore = {
  getAccessToken: (): Promise<string | null> => SecureStore.getItemAsync(ACCESS_KEY),

  getRefreshToken: (): Promise<string | null> => SecureStore.getItemAsync(REFRESH_KEY),

  /**
   * d-0cdcga: rotation has a 15s one-token-deep grace window, and the grace arm
   * deliberately returns an access token only. An absent `refreshToken` means
   * "another request already rotated; keep the token you hold" — it is a
   * success, so the stored refresh token must survive untouched.
   */
  async save({ accessToken, refreshToken }: TokenPair): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
    if (refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  },

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};
