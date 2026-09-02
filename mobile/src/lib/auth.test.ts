import { apiClient } from './api-client';
import { authStore } from './auth-store';
import { getSession, setSession } from './session';
import { hydrateSession, login, logout, register } from './auth';

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

jest.mock('./api-client', () => ({ apiClient: { post: jest.fn(), get: jest.fn() } }));

const post = apiClient.post as jest.Mock;
const get = apiClient.get as jest.Mock;
const USER = { id: 'u1', name: 'Ada', email: 'ada@jobvault.app' };

beforeEach(async () => {
  post.mockReset();
  get.mockReset();
  await authStore.clear();
  setSession({ status: 'loading' });
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
    expect(getSession()).toEqual({ status: 'signedIn', user: USER });
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
  // d-0cdcga amendment 1 (t-0cgtgo): the route reads no body — `sid` rides on the
  // access token, so the session names itself. The fail-closed arm that revokes
  // every device triggers on a missing `sid`, not on a missing body.
  it('posts no body and clears the keychain', async () => {
    await authStore.save({ accessToken: 'a1', refreshToken: 'r1' });
    post.mockResolvedValue({ message: 'Logged out successfully' });

    await logout();

    expect(post).toHaveBeenCalledWith('/api/auth/logout');
    expect(await authStore.getAccessToken()).toBeNull();
    expect(await authStore.getRefreshToken()).toBeNull();
    expect(getSession()).toEqual({ status: 'signedOut' });
  });

  it('still clears the keychain and the session when the call fails', async () => {
    await authStore.save({ accessToken: 'a1', refreshToken: 'r1' });
    post.mockRejectedValue(new Error('offline'));

    await expect(logout()).rejects.toThrow('offline');

    expect(await authStore.getAccessToken()).toBeNull();
    expect(await authStore.getRefreshToken()).toBeNull();
    expect(getSession()).toEqual({ status: 'signedOut' });
  });
});

describe('hydrateSession', () => {
  it('is signed out when the keychain is empty, without asking the server', async () => {
    await hydrateSession();

    expect(get).not.toHaveBeenCalled();
    expect(getSession()).toEqual({ status: 'signedOut' });
  });

  it('trusts the server, not the stored token', async () => {
    await authStore.save({ accessToken: 'a1', refreshToken: 'r1' });
    get.mockResolvedValue(USER);

    await hydrateSession();

    expect(get).toHaveBeenCalledWith('/api/auth/me');
    expect(getSession()).toEqual({ status: 'signedIn', user: USER });
  });

  // A stored token can be expired or its session revoked from another device.
  it('clears a token the server rejects', async () => {
    await authStore.save({ accessToken: 'stale', refreshToken: 'stale' });
    get.mockRejectedValue(new Error('401'));

    await hydrateSession();

    expect(getSession()).toEqual({ status: 'signedOut' });
    expect(await authStore.getAccessToken()).toBeNull();
  });
});
