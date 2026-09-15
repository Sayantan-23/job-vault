import { Stack } from 'expo-router/stack';
import { LIGHT_COLORS, useTheme } from '@/hooks/use-theme';

export default function AuthLayout() {
  const { colors = LIGHT_COLORS } = useTheme() ?? {};
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
