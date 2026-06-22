import { DEFAULT_SERVER_URL, type ExtensionSettings } from './types'

const TOKEN_KEY = 'apiKey'
const SETTINGS_KEY = 'settings'

export async function getToken(): Promise<string | null> {
  const out = await chrome.storage.local.get(TOKEN_KEY)
  const value = out[TOKEN_KEY]
  return typeof value === 'string' ? value : null
}

export async function setToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [TOKEN_KEY]: token })
}

export async function clearToken(): Promise<void> {
  await chrome.storage.local.remove(TOKEN_KEY)
}

export async function getSettings(): Promise<ExtensionSettings> {
  const out = await chrome.storage.local.get(SETTINGS_KEY)
  const value = out[SETTINGS_KEY]
  if (value && typeof value === 'object' && typeof (value as ExtensionSettings).serverUrl === 'string') {
    return value as ExtensionSettings
  }
  return { serverUrl: DEFAULT_SERVER_URL }
}

export async function setSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings })
}
