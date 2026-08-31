import { apiClient } from './api-client';
import { authStore } from './auth-store';
import { login, logout, register } from './auth';

jest.mock('expo-constants', () => ({ expoConfig: { hostUri: '10.0.2.2:8081' } }));

jest.mock('expo-secure-store', () => {
  const items = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => items.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      items.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      items.delete(key);
    }),
  };
});

jest.mock('./api-client', () => ({ apiClient: { post: jest.fn() } }));

const post = apiClient.post as jest.Mock;
const USER = { id: 'u1', name: 'Ada', email: 'ada@jobvault.app' };

beforeEach(async () => {
  post.mockReset();
  await authStore.clear();
});

describe('login / register', () => {
  it('asks for the native transport and stores the token pair', async () => {
    post.mockResolvedValue({ user: USER, accessToken: 'a1', refreshToken: 'r1' });

    const user = await login('ada@jobvault.app', 'secret123');

    expect(user).toEqual(USER);
    expect(post).toHaveBeenCalledWith('/api/auth/login', {
      email: 'ada@jobvault.app',
      password: 'secret123',
      client: 'native',
    });
    expect(await authStore.getAccessToken()).toBe('a1');
    expect(await authStore.getRefreshToken()).toBe('r1');
  });

  it('registers with the native transport', async () => {
    post.mockResolvedValue({ user: USER, accessToken: 'a1', refreshToken: 'r1' });

    await register('Ada', 'ada@jobvault.app', 'secret123');

    expect(post).toHaveBeenCalledWith('/api/auth/register', {
      name: 'Ada',
      email: 'ada@jobvault.app',
      password: 'secret123',
      client: 'native',
    });
  });
});

describe('logout', () => {
  // d-0cdcga contract 1: without the refresh token in the body the backend
  // cannot name the session, fails closed, and signs the user out everywhere.
  it('sends the refresh token in the body and clears the keychain', async () => {
    await authStore.save({ accessToken: 'a1', refreshToken: 'r1' });
    post.mockResolvedValue({ message: 'Logged out successfully' });

    await logout();

    expect(post).toHaveBeenCalledWith('/api/auth/logout', { refreshToken: 'r1' });
    expect(await authStore.getAccessToken()).toBeNull();
    expect(await authStore.getRefreshToken()).toBeNull();
  });

  it('still clears the keychain when the call fails', async () => {
    await authStore.save({ accessToken: 'a1', refreshToken: 'r1' });
    post.mockRejectedValue(new Error('offline'));

    await expect(logout()).rejects.toThrow('offline');

    expect(await authStore.getAccessToken()).toBeNull();
    expect(await authStore.getRefreshToken()).toBeNull();
  });
});
