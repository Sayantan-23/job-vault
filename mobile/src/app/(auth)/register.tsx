import { useState } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { AuthScreen, Field, FormError, FormFooter, SubmitButton } from '@/lib/auth-form';

export default function RegisterScreen() {
  const router = useRouter();
  const { pending, error, register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <AuthScreen title="Create account" subtitle="Start tracking applications in one place.">
      <Field label="Name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
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
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <FormError message={error} />
      <SubmitButton
        label="Create account"
        pending={pending}
        onPress={() => void register(name, email, password)}
      />
      <FormFooter prompt="Already have an account?" action="Sign in" onPress={() => router.replace('/login')} />
    </AuthScreen>
  );
}
