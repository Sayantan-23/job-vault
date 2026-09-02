import { useState } from 'react';
import { useRouter } from 'expo-router';

import { AuthScreen, Field, FormError, FormFooter } from '@/components/auth/auth-form';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

export function RegisterForm() {
  const router = useRouter();
  const { pending, error, register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <AuthScreen title="Create your account" subtitle="Start tracking your applications.">
      <FormError message={error} />
      <Field
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        autoComplete="name"
        textContentType="name"
      />
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
        placeholder="At least 8 characters"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <Button
        className="w-full"
        disabled={pending}
        accessibilityLabel="Create account"
        onPress={() => void register(name, email, password)}>
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
      <FormFooter
        prompt="Already have an account?"
        action="Sign in"
        onPress={() => router.replace('/login')}
      />
    </AuthScreen>
  );
}
