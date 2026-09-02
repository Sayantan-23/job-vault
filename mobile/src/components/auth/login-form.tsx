import { useState } from 'react';
import { useRouter } from 'expo-router';

import { AuthScreen, Field, FormError, FormFooter } from '@/components/auth/auth-form';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

export function LoginForm() {
  const router = useRouter();
  const { pending, error, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <AuthScreen title="Welcome back" subtitle="Sign in to your JobVault account.">
      <FormError message={error} />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Enter your password"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
      />
      <Button
        className="w-full"
        disabled={pending}
        accessibilityLabel="Sign in"
        onPress={() => void login(email, password)}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
      <FormFooter
        prompt="No account?"
        action="Create one"
        onPress={() => router.replace('/register')}
      />
    </AuthScreen>
  );
}
