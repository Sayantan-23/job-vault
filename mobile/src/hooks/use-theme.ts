import { useCallback, useEffect, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { colorScheme } from 'react-native-css';
import * as SecureStore from 'expo-secure-store';

import { DARK_COLORS, LIGHT_COLORS, type ThemeColors } from '@/theme';
export { DARK_COLORS, LIGHT_COLORS, type ThemeColors } from '@/theme';

export type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'jobvault_theme_preference';

let globalTheme: Theme = 'system';
const listeners = new Set<(theme: Theme) => void>();

function getAppearanceScheme(): 'light' | 'dark' {
  try {
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function syncColorScheme(theme: Theme, systemScheme: 'light' | 'dark') {
  const effective = theme === 'system' ? systemScheme : theme;
  try {
    colorScheme.set(effective);
  } catch {}
}

export function useTheme() {
  const rnScheme = useColorScheme();
  const [appearanceScheme, setAppearanceScheme] = useState<'light' | 'dark'>(() => getAppearanceScheme());
  const [theme, setLocalTheme] = useState<Theme>(globalTheme);

  useEffect(() => {
    const sub = Appearance.addChangeListener((prefs) => {
      setAppearanceScheme(prefs.colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => sub.remove();
  }, []);

  const systemScheme: 'light' | 'dark' =
    rnScheme === 'dark' || appearanceScheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    let active = true;
    void SecureStore.getItemAsync(THEME_STORAGE_KEY).then((stored) => {
      if (active && stored && (stored === 'light' || stored === 'dark' || stored === 'system')) {
        globalTheme = stored;
        setLocalTheme(stored);
        syncColorScheme(stored, systemScheme);
      }
    });

    const handler = (t: Theme) => {
      setLocalTheme(t);
      syncColorScheme(t, systemScheme);
    };
    listeners.add(handler);
    return () => {
      active = false;
      listeners.delete(handler);
    };
  }, [systemScheme]);

  useEffect(() => {
    syncColorScheme(theme, systemScheme);
  }, [theme, systemScheme]);

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      globalTheme = nextTheme;
      syncColorScheme(nextTheme, systemScheme);
      listeners.forEach((fn) => fn(nextTheme));
      void SecureStore.setItemAsync(THEME_STORAGE_KEY, nextTheme);
    },
    [systemScheme]
  );

  const effectiveTheme =
    theme === 'system' ? systemScheme : theme;
  const isDark = effectiveTheme === 'dark';
  const colors: ThemeColors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return {
    theme,
    setTheme,
    effectiveTheme,
    isDark,
    colors,
  };
}

