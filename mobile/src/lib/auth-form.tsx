import type { ReactNode } from 'react';
import { Platform, type TextInputProps } from 'react-native';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native-css/components';

/**
 * ponytail: a local stand-in for the C2 primitives (Button, Input, Label). It
 * lives here rather than in components/ui/ only because C1 and C2 are landing in
 * parallel and components/ui/ belongs to C2 — delete this file and rewire the
 * two auth screens once Button and Input exist.
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
        <Text className="font-sans-semibold text-[28px] text-foreground">{title}</Text>
        <Text className="mt-2 text-[15px] text-muted-foreground">{subtitle}</Text>
        <View className="mt-8 gap-4">{children}</View>
      </View>
    </KeyboardAvoidingView>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View className="gap-2">
      <Text className="font-mono text-[11px] uppercase text-muted-foreground">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        className="rounded-md border border-input px-3 py-3 text-[15px] text-foreground"
        {...props}
      />
    </View>
  );
}

export function SubmitButton({
  label,
  pending,
  onPress,
}: {
  label: string;
  pending: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: pending }}
      disabled={pending}
      onPress={onPress}
      className="mt-2 items-center rounded-md bg-primary py-3.5">
      {pending ? (
        <ActivityIndicator className="text-primary-foreground" />
      ) : (
        <Text className="font-sans-medium text-[15px] text-primary-foreground">{label}</Text>
      )}
    </Pressable>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <Text className="text-[13px] text-destructive">{message}</Text>;
}

export function FormFooter({ prompt, action, onPress }: {
  prompt: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} className="mt-2 flex-row justify-center gap-1">
      <Text className="text-[14px] text-muted-foreground">{prompt}</Text>
      <Text className="font-sans-medium text-[14px] text-primary">{action}</Text>
    </Pressable>
  );
}
