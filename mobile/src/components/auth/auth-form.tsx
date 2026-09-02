import type { ReactNode } from 'react';
import { Platform, type TextInputProps } from 'react-native';
import { KeyboardAvoidingView, Pressable, Text, View } from 'react-native-css/components';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * The chrome shared by the two auth screens, mirroring the web's
 * `components/auth/login-form.tsx`: serif heading, muted subtitle, the error as
 * a soft destructive pill, `Label` + `Input` pairs. Everything visual comes from
 * the C2 primitives — this file holds only the layout they sit in.
 */
export function AuthScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background">
      <View className="flex-1 justify-center px-6">
        <Text className="font-serif text-[30px] leading-[34px] text-foreground">{title}</Text>
        <Text className="mt-1.5 text-sm text-muted-foreground">{subtitle}</Text>
        <View className="mt-7 gap-5">{children}</View>
      </View>
    </KeyboardAvoidingView>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View className="gap-2">
      <Label>{label}</Label>
      <Input accessibilityLabel={label} {...props} />
    </View>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Text
      accessibilityRole="alert"
      className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </Text>
  );
}

export function FormFooter({
  prompt,
  action,
  onPress,
}: {
  prompt: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={action}
      onPress={onPress}
      className="flex-row justify-center gap-1 active:opacity-70">
      <Text className="text-sm text-muted-foreground">{prompt}</Text>
      <Text className="font-sans-medium text-sm text-primary">{action}</Text>
    </Pressable>
  );
}
