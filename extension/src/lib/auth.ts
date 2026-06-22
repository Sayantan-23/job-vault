// Pure helpers for the chrome.identity.launchWebAuthFlow connect flow. The
// browser-side driver (background/service-worker) composes these; keeping them
// pure makes the state/parse logic unit-testable without chrome.

// The authorize URL the extension opens (the JobVault web app's public page).
export function buildAuthorizeUrl(serverUrl: string, redirectUri: string, state: string): string {
  const url = new URL('/extension/authorize', serverUrl)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  return url.toString()
}

// The chrome.identity callback URL carries token + state in the FRAGMENT.
export function parseAuthRedirect(callbackUrl: string): { token: string | null; state: string | null } {
  let url: URL
  try {
    url = new URL(callbackUrl)
  } catch {
    return { token: null, state: null }
  }
  const fragment = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash
  const params = new URLSearchParams(fragment)
  return { token: params.get('token'), state: params.get('state') }
}

// 128-bit hex nonce. The extension generates it, sends it in the authorize URL,
// and verifies the returned state matches — blocking CSRF/replay.
export function randomState(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
