import { act, renderHook } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { useTheme } from './use-theme';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
}));

describe('useTheme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with system theme by default', async () => {
    const { result } = await renderHook(() => useTheme());

    expect(result.current.theme).toBe('system');
    expect(result.current.effectiveTheme).toBe('light');
  });

  it('updates theme preference and persists to SecureStore', async () => {
    const { result } = await renderHook(() => useTheme());

    await act(async () => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
    expect(result.current.effectiveTheme).toBe('dark');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'jobvault_theme_preference',
      'dark'
    );
  });
});
