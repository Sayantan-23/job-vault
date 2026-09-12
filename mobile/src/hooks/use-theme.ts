import { useCallback, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'jobvault_theme_preference';

let globalTheme: Theme = 'system';
const listeners = new Set<(theme: Theme) => void>();

export function useTheme() {
  const systemScheme = useColorScheme();
  const [theme, setLocalTheme] = useState<Theme>(globalTheme);

  useEffect(() => {
    let active = true;
    void SecureStore.getItemAsync(THEME_STORAGE_KEY).then((stored) => {
      if (active && stored && (stored === 'light' || stored === 'dark' || stored === 'system')) {
        globalTheme = stored;
        setLocalTheme(stored);
      }
    });

    const handler = (t: Theme) => setLocalTheme(t);
    listeners.add(handler);
    return () => {
      active = false;
      listeners.delete(handler);
    };
  }, []);

  const setTheme = useCallback((nextTheme: Theme) => {
    globalTheme = nextTheme;
    listeners.forEach((fn) => fn(nextTheme));
    void SecureStore.setItemAsync(THEME_STORAGE_KEY, nextTheme);
  }, []);

  const effectiveTheme =
    theme === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : theme;

  return {
    theme,
    setTheme,
    effectiveTheme,
  };
}
