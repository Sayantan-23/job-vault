import { getSession, setSession, useSession } from './session';
import { act, renderHook } from '@testing-library/react-native';

beforeEach(() => {
  setSession({ status: 'loading' });
});

const USER = { id: 'u1', name: 'Ada', email: 'ada@jobvault.app' };

describe('session store', () => {
  it('starts loading — the keychain read has not resolved yet', () => {
    expect(getSession()).toEqual({ status: 'loading' });
  });

  it('notifies subscribed components when the session changes', async () => {
    const { result } = await renderHook(() => useSession());

    expect(result.current.status).toBe('loading');

    await act(() => setSession({ status: 'signedIn', user: USER }));

    expect(result.current).toEqual({ status: 'signedIn', user: USER });

    await act(() => setSession({ status: 'signedOut' }));

    expect(result.current).toEqual({ status: 'signedOut' });
  });

  it('stops notifying an unmounted subscriber', async () => {
    const { unmount } = await renderHook(() => useSession());
    unmount();

    expect(() => setSession({ status: 'signedOut' })).not.toThrow();
    expect(getSession()).toEqual({ status: 'signedOut' });
  });
});
