import * as SecureStore from 'expo-secure-store';

import { authStore } from './auth-store';

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
    __items: items,
  };
});

const items = (SecureStore as unknown as { __items: Map<string, string> }).__items;

beforeEach(() => {
  items.clear();
  jest.clearAllMocks();
});

describe('authStore', () => {
  it('round-trips a token pair', async () => {
    await authStore.save({ accessToken: 'a1', refreshToken: 'r1' });

    expect(await authStore.getAccessToken()).toBe('a1');
    expect(await authStore.getRefreshToken()).toBe('r1');
  });

  // d-0cdcga contract 2: a refresh that lands inside another request's rotation
  // grace window returns an access token and NO refresh token. That is a
  // success, not a failure — the client keeps the refresh token it holds.
  it('keeps the stored refresh token when a save omits one', async () => {
    await authStore.save({ accessToken: 'a1', refreshToken: 'r1' });

    await authStore.save({ accessToken: 'a2' });

    expect(await authStore.getAccessToken()).toBe('a2');
    expect(await authStore.getRefreshToken()).toBe('r1');
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('clears both tokens', async () => {
    await authStore.save({ accessToken: 'a1', refreshToken: 'r1' });

    await authStore.clear();

    expect(await authStore.getAccessToken()).toBeNull();
    expect(await authStore.getRefreshToken()).toBeNull();
  });
});
