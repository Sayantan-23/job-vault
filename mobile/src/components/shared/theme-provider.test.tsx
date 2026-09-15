import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native-css/components';

import { ThemeProvider } from './theme-provider';
import * as useThemeModule from '@/hooks/use-theme';
import { DARK_COLORS, LIGHT_COLORS } from '@/theme';

describe('ThemeProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children inside theme-root container with light theme by default', async () => {
    jest.spyOn(useThemeModule, 'useTheme').mockReturnValue({
      theme: 'light',
      setTheme: jest.fn(),
      effectiveTheme: 'light',
      isDark: false,
      colors: LIGHT_COLORS,
    });

    await render(
      <ThemeProvider>
        <Text testID="child-text">Hello Themed World</Text>
      </ThemeProvider>
    );

    expect(screen.getByText('Hello Themed World')).toBeTruthy();
    expect(screen.getByTestId('theme-root')).toBeTruthy();
  });

  it('applies dark theme variables when effectiveTheme is dark', async () => {
    jest.spyOn(useThemeModule, 'useTheme').mockReturnValue({
      theme: 'dark',
      setTheme: jest.fn(),
      effectiveTheme: 'dark',
      isDark: true,
      colors: DARK_COLORS,
    });

    await render(
      <ThemeProvider>
        <Text testID="child-text">Dark Mode Active</Text>
      </ThemeProvider>
    );

    expect(screen.getByText('Dark Mode Active')).toBeTruthy();
    expect(screen.getByTestId('theme-root')).toBeTruthy();
  });
});
