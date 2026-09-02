import { act, renderHook, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/lib/api-client';
import * as auth from '@/lib/auth';
import { useAuth } from './use-auth';

jest.mock('@/lib/auth', () => ({ login: jest.fn(), register: jest.fn(), logout: jest.fn() }));

const login = auth.login as jest.Mock;
const logout = auth.logout as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useAuth', () => {
  // Navigation is the session store's job (Stack.Protected in the root layout),
  // so this hook must not call the router — it only reports pending and error.
  it('signs in and reports no error', async () => {
    login.mockResolvedValue({ id: 'u1', name: 'Ada', email: 'ada@jobvault.app' });
    const { result } = await renderHook(() => useAuth());

    await act(() => result.current.login('ada@jobvault.app', 'secret123'));

    expect(login).toHaveBeenCalledWith('ada@jobvault.app', 'secret123');
    expect(result.current.error).toBeNull();
    expect(result.current.pending).toBe(false);
  });

  it('surfaces the backend message', async () => {
    login.mockRejectedValue(new ApiError(401, 'Invalid email or password', 'UNAUTHORIZED'));
    const { result } = await renderHook(() => useAuth());

    await act(() => result.current.login('ada@jobvault.app', 'wrong'));

    await waitFor(() => expect(result.current.error).toBe('Invalid email or password'));
    expect(result.current.pending).toBe(false);
  });

  it('falls back to a transport message when the failure is not an ApiError', async () => {
    login.mockRejectedValue(new TypeError('Network request failed'));
    const { result } = await renderHook(() => useAuth());

    await act(() => result.current.login('ada@jobvault.app', 'secret123'));

    await waitFor(() => expect(result.current.error).toMatch(/Could not reach JobVault/));
  });

  it('signs out', async () => {
    logout.mockResolvedValue(undefined);
    const { result } = await renderHook(() => useAuth());

    await act(() => result.current.logout());

    expect(logout).toHaveBeenCalled();
  });
});
