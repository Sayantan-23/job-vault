import React, { type PropsWithChildren } from 'react';
import { StatusBar } from 'expo-status-bar';
import { VariableContextProvider } from 'nativewind';
import { View } from 'react-native-css/components';

import { useTheme } from '@/hooks/use-theme';
import { darkVars, lightVars } from '@/theme';

/**
 * Provides theme CSS variables dynamically at runtime based on user preference or OS scheme.
 *
 * Uses NativeWind's VariableContextProvider to swap tokens between light and dark palettes.
 * Also synchronizes the native StatusBar style (light status bar on dark theme, dark on light).
 */
export function ThemeProvider({ children }: PropsWithChildren) {
  const { effectiveTheme } = useTheme();
  const activeVars = effectiveTheme === 'dark' ? darkVars : lightVars;

  return (
    <VariableContextProvider key={effectiveTheme} value={activeVars}>
      <StatusBar style={effectiveTheme === 'dark' ? 'light' : 'dark'} />
      <View
        key={effectiveTheme}
        testID="theme-root"
        style={[activeVars, { backgroundColor: effectiveTheme === 'dark' ? '#131110' : '#fefcf9' }]}
        className="flex-1 bg-background">
        {children}
      </View>
    </VariableContextProvider>
  );
}
