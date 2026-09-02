import { io } from 'socket.io-client';

import { authStore } from './auth-store';
import { getSocket } from './socket';

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

jest.mock('socket.io-client', () => ({ io: jest.fn(() => ({ connect: jest.fn() })) }));

describe('getSocket', () => {
  it('dials the absolute backend URL and authenticates the handshake with the access token', async () => {
    await authStore.save({ accessToken: 'access-1', refreshToken: 'refresh-1' });

    getSocket();

    const [url, options] = (io as unknown as jest.Mock).mock.calls[0] as [
      string,
      { auth: (cb: (data: object) => void) => void },
    ];
    expect(url).toBe('http://10.0.2.2:3100');

    const cb = jest.fn();
    options.auth(cb);
    await new Promise(process.nextTick);
    expect(cb).toHaveBeenCalledWith({ token: 'access-1' });
  });

  it('reuses the one socket', () => {
    expect(getSocket()).toBe(getSocket());
  });
});
