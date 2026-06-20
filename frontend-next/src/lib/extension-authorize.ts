// Where a freshly minted extension token may be handed back. Only the
// chrome.identity redirect URL (https://<extension-id>.chromiumapp.org/)
// qualifies, so a forged authorize link can't exfiltrate a token to an
// attacker's site. Once the extension id is pinned (manifest `key`, Phase E),
// add it to PINNED_EXTENSION_IDS so ONLY our extension is accepted. While the
// list is empty, any well-formed chromiumapp.org https redirect is allowed
// (dev, pre-pinning).
const PINNED_EXTENSION_IDS: readonly string[] = []

const CHROMIUMAPP_SUFFIX = '.chromiumapp.org'

export function isAllowedExtensionRedirect(redirectUri: string | null | undefined): boolean {
  if (!redirectUri) return false
  let url: URL
  try {
    url = new URL(redirectUri)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  if (!url.hostname.endsWith(CHROMIUMAPP_SUFFIX)) return false
  // Require a real subdomain (the extension id), not the bare apex.
  if (url.hostname === CHROMIUMAPP_SUFFIX.slice(1)) return false
  if (PINNED_EXTENSION_IDS.length > 0) {
    const id = url.hostname.slice(0, -CHROMIUMAPP_SUFFIX.length)
    if (!PINNED_EXTENSION_IDS.includes(id)) return false
  }
  return true
}

// Carries the token in the FRAGMENT (never the query) so it isn't sent to or
// logged by any server; chrome.identity captures the navigation.
export function buildExtensionRedirect(
  redirectUri: string,
  rawKey: string,
  state: string | null,
): string {
  const params = new URLSearchParams({ token: rawKey })
  if (state) params.set('state', state)
  const sep = redirectUri.includes('#') ? '&' : '#'
  return `${redirectUri}${sep}${params.toString()}`
}

// Performs the handoff navigation. Isolated in its own function so tests can stub
// it (jsdom's window.location is non-configurable and can't be spied directly).
export function redirectToExtension(redirectUri: string, rawKey: string, state: string | null): void {
  window.location.assign(buildExtensionRedirect(redirectUri, rawKey, state))
}
