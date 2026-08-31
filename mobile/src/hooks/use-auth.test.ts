import { act, renderHook, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/lib/api-client';
import * as auth from '@/lib/auth';
import { useAuth } from './use-auth';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('@/lib/auth', () => ({ login: jest.fn(), register: jest.fn(), logout: jest.fn() }));

const login = auth.login as jest.Mock;
const logout = auth.logout as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useAuth', () => {
  it('signs in and lands on the app home', async () => {
    login.mockResolvedValue({ id: 'u1', name: 'Ada', email: 'ada@jobvault.app' });
    const { result } = await renderHook(() => useAuth());

    await act(() => result.current.login('ada@jobvault.app', 'secret123'));

    expect(login).toHaveBeenCalledWith('ada@jobvault.app', 'secret123');
    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(result.current.error).toBeNull();
  });

  it('surfaces the backend message and stays put', async () => {
    login.mockRejectedValue(new ApiError(401, 'Invalid email or password', 'UNAUTHORIZED'));
    const { result } = await renderHook(() => useAuth());

    await act(() => result.current.login('ada@jobvault.app', 'wrong'));

    await waitFor(() => expect(result.current.error).toBe('Invalid email or password'));
    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.pending).toBe(false);
  });

  it('signs out to the login screen', async () => {
    logout.mockResolvedValue(undefined);
    const { result } = await renderHook(() => useAuth());

    await act(() => result.current.logout());

    expect(logout).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });
});
