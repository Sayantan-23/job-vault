import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';

import { ApiError } from '@/lib/api-client';
import {
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from '@/lib/auth';

const APP_HOME: Href = '/';
const SIGN_IN: Href = '/login';

/** A thrown ApiError carries the backend's message; anything else is transport. */
function messageOf(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Could not reach JobVault. Check your connection and try again.';
}

/**
 * Form state for the auth screens. No TanStack Query yet — the provider arrives
 * with the data screens in C3, and the session itself lives in the keychain
 * rather than in a cache.
 */
export function useAuth() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>, destination: Href): Promise<void> {
    setPending(true);
    setError(null);
    try {
      await action();
      router.replace(destination);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setPending(false);
    }
  }

  return {
    pending,
    error,
    login: (email: string, password: string) => run(() => loginRequest(email, password), APP_HOME),
    register: (name: string, email: string, password: string) =>
      run(() => registerRequest(name, email, password), APP_HOME),
    logout: () => run(() => logoutRequest(), SIGN_IN),
  };
}
