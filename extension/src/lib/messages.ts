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

export const SCAN_FIELDS = 'JOBVAULT_SCAN_FIELDS' as const
export const INSERT_ANSWER = 'JOBVAULT_INSERT_ANSWER' as const

export interface ScanFieldsMessage {
  type: typeof SCAN_FIELDS
}
export interface InsertAnswerMessage {
  type: typeof INSERT_ANSWER
  fieldId: string
  text: string
}
