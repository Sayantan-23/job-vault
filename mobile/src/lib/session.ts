import { useSyncExternalStore } from 'react';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

/**
 * `loading` is a real state, not a nicety: the keychain read is async, so on the
 * first frame we do not yet know whether there is a session. Rendering the tabs
 * or the login screen before it resolves would flash the wrong one.
 */
export type Session =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: AuthUser };

/**
 * Who is signed in, for the whole app. Module scope + useSyncExternalStore
 * rather than a context provider or TanStack Query: the tokens live in the
 * keychain, not in a cache, and `api-client` has to be able to invalidate this
 * from outside React when a refresh fails (a provider it cannot reach).
 * TanStack Query arrives with the data screens in C3 and owns server state; this
 * owns one bit of session state.
 */
let session: Session = { status: 'loading' };
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSession(): Session {
  return session;
}

export function setSession(next: Session): void {
  session = next;
  for (const listener of listeners) listener();
}

export function useSession(): Session {
  return useSyncExternalStore(subscribe, getSession);
}
