import { useState } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { AuthScreen, Field, FormError, FormFooter, SubmitButton } from '@/lib/auth-form';

export default function LoginScreen() {
  const router = useRouter();
  const { pending, error, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <AuthScreen title="Sign in" subtitle="Pick up where you left off.">
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
      />
      <FormError message={error} />
      <SubmitButton label="Sign in" pending={pending} onPress={() => void login(email, password)} />
      <FormFooter
        prompt="No account yet?"
        action="Create one"
        onPress={() => router.replace('/register')}
      />
    </AuthScreen>
  );
}
