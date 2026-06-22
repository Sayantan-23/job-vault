// Message contracts between popup ⇄ content script ⇄ background.

export const EXTRACT = 'JOBVAULT_EXTRACT' as const
export const CONNECT = 'JOBVAULT_CONNECT' as const

export interface ExtractMessage {
  type: typeof EXTRACT
}
export interface ConnectMessage {
  type: typeof CONNECT
}

export type ConnectResponse = { ok: true } | { ok: false; error: string }
