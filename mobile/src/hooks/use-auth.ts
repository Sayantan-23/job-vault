import { useState } from 'react';

import { ApiError } from '@/lib/api-client';
import {
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from '@/lib/auth';

/** A thrown ApiError carries the backend's message; anything else is transport. */
function messageOf(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Could not reach JobVault. Check your connection and try again.';
}

/**
 * Form state for the auth screens and the sign-out item. No navigation here: the
 * session store drives `Stack.Protected` in the root layout, so a successful
 * call moves the user by itself. No TanStack Query either — the provider arrives
 * with the data screens in C3, and the session lives in the keychain, not a cache.
 */
export function useAuth() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>): Promise<void> {
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setPending(false);
    }
  }

  return {
    pending,
    error,
    login: (email: string, password: string) => run(() => loginRequest(email, password)),
    register: (name: string, email: string, password: string) =>
      run(() => registerRequest(name, email, password)),
    logout: () => run(() => logoutRequest()),
  };
}
