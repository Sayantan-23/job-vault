import { ApiError, apiClient } from './api-client';
import { authStore } from './auth-store';

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
    __items: items,
  };
});

const BASE = 'http://10.0.2.2:3100';

type Json = Record<string, unknown>;

function reply(status: number, body: Json): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    headers: { get: () => 'application/json' },
    json: async () => body,
  } as unknown as Response;
}

const fetchMock = jest.fn<Promise<Response>, [string, RequestInit]>();

function bodyOf(call: [string, RequestInit]): Json {
  return JSON.parse(String(call[1].body)) as Json;
}

function headersOf(call: [string, RequestInit]): Record<string, string> {
  return call[1].headers as Record<string, string>;
}

beforeEach(async () => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  await authStore.clear();
});

describe('apiClient', () => {
  it('sends the stored access token as a Bearer credential and unwraps the envelope', async () => {
    await authStore.save({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    fetchMock.mockResolvedValueOnce(reply(200, { data: { id: 'j1' } }));

    const job = await apiClient.get<{ id: string }>('/api/jobs/j1');

    expect(job).toEqual({ id: 'j1' });
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/api/jobs/j1`);
    expect(headersOf(fetchMock.mock.calls[0]).Authorization).toBe('Bearer access-1');
  });

  it('refreshes with the refresh token in the body on a 401 and retries once', async () => {
    await authStore.save({ accessToken: 'stale', refreshToken: 'refresh-1' });
    fetchMock
      .mockResolvedValueOnce(reply(401, { statusCode: 401, message: 'expired', error: 'UNAUTHORIZED' }))
      .mockResolvedValueOnce(reply(200, { data: { accessToken: 'access-2', refreshToken: 'refresh-2' } }))
      .mockResolvedValueOnce(reply(200, { data: { id: 'j1' } }));

    const job = await apiClient.get<{ id: string }>('/api/jobs/j1');

    expect(job).toEqual({ id: 'j1' });
    expect(fetchMock.mock.calls[1][0]).toBe(`${BASE}/api/auth/refresh`);
    expect(bodyOf(fetchMock.mock.calls[1])).toEqual({ refreshToken: 'refresh-1' });
    expect(await authStore.getRefreshToken()).toBe('refresh-2');
    expect(headersOf(fetchMock.mock.calls[2]).Authorization).toBe('Bearer access-2');
  });

  // d-0cdcga contract 2. The grace arm returns an access token and no refresh
  // token; treating that as a failed refresh would log the user out for free.
  it('keeps the stored refresh token when the refresh response omits one', async () => {
    await authStore.save({ accessToken: 'stale', refreshToken: 'refresh-1' });
    fetchMock
      .mockResolvedValueOnce(reply(401, { statusCode: 401, message: 'expired', error: 'UNAUTHORIZED' }))
      .mockResolvedValueOnce(reply(200, { data: { accessToken: 'access-2' } }))
      .mockResolvedValueOnce(reply(200, { data: { id: 'j1' } }));

    const job = await apiClient.get<{ id: string }>('/api/jobs/j1');

    expect(job).toEqual({ id: 'j1' });
    expect(await authStore.getRefreshToken()).toBe('refresh-1');
    expect(await authStore.getAccessToken()).toBe('access-2');
  });

  it('de-duplicates concurrent refreshes so rotation never races', async () => {
    await authStore.save({ accessToken: 'stale', refreshToken: 'refresh-1' });
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith('/api/auth/refresh')) {
        return reply(200, { data: { accessToken: 'access-2', refreshToken: 'refresh-2' } });
      }
      const auth = (init.headers as Record<string, string>).Authorization;
      if (auth === 'Bearer stale') {
        return reply(401, { statusCode: 401, message: 'expired', error: 'UNAUTHORIZED' });
      }
      return reply(200, { data: { id: 'ok' } });
    });

    await Promise.all([apiClient.get('/api/jobs'), apiClient.get('/api/answers')]);

    const refreshes = fetchMock.mock.calls.filter(([url]) => url.endsWith('/api/auth/refresh'));
    expect(refreshes).toHaveLength(1);
  });

  it('clears the keychain and throws when the refresh token is revoked', async () => {
    await authStore.save({ accessToken: 'stale', refreshToken: 'revoked' });
    fetchMock
      .mockResolvedValueOnce(reply(401, { statusCode: 401, message: 'expired', error: 'UNAUTHORIZED' }))
      .mockResolvedValueOnce(reply(401, { statusCode: 401, message: 'revoked', error: 'UNAUTHORIZED' }));

    await expect(apiClient.get('/api/jobs')).rejects.toBeInstanceOf(ApiError);
    expect(await authStore.getAccessToken()).toBeNull();
    expect(await authStore.getRefreshToken()).toBeNull();
  });

  it('does not try to refresh a failed login', async () => {
    fetchMock.mockResolvedValueOnce(
      reply(401, { statusCode: 401, message: 'Invalid email or password', error: 'UNAUTHORIZED' })
    );

    await expect(apiClient.post('/api/auth/login', { email: 'a@b.co', password: 'x' })).rejects.toThrow(
      'Invalid email or password'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
