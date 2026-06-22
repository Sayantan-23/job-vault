import { buildAuthorizeUrl, parseAuthRedirect, randomState } from '@/lib/auth'
import { getSettings, setToken } from '@/lib/storage'
import { verifyKey } from '@/lib/api'
import { CONNECT, type ConnectResponse } from '@/lib/messages'

// The connect flow runs in the background (not the popup) so it survives the
// popup closing when the auth window takes focus — the token still lands in
// storage and the next popup open sees it.
chrome.runtime.onMessage.addListener((message: { type?: string }, _sender, sendResponse) => {
  if (message.type === CONNECT) {
    connect()
      .then(sendResponse)
      .catch((err: unknown) =>
        sendResponse({ ok: false, error: err instanceof Error ? err.message : 'Could not connect' }),
      )
    return true // async sendResponse
  }
  return undefined
})

async function connect(): Promise<ConnectResponse> {
  const { serverUrl } = await getSettings()
  const redirectUri = chrome.identity.getRedirectURL()
  const state = randomState()
  const authUrl = buildAuthorizeUrl(serverUrl, redirectUri, state)

  // Chrome rejects launchWebAuthFlow when the user closes/cancels the auth
  // window — treat that (and a falsy result) as a clean cancellation rather than
  // surfacing a raw Chrome error string.
  let callbackUrl: string | undefined
  try {
    callbackUrl = await chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true })
  } catch {
    return { ok: false, error: 'Connection cancelled' }
  }
  if (!callbackUrl) return { ok: false, error: 'Connection cancelled' }

  const { token, state: returnedState } = parseAuthRedirect(callbackUrl)
  if (!token || returnedState !== state) {
    return { ok: false, error: 'Invalid response from JobVault' }
  }

  await setToken(token)
  try {
    await verifyKey(serverUrl, token)
  } catch {
    // The token is stored; a verify failure surfaces when the popup uses it.
  }
  return { ok: true }
}
