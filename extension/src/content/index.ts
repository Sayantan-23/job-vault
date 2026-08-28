import { extractFromDocument } from './extract'
import { findAnswerFields } from './answer-fields'
import { insertIntoField } from './answer-insert'
import { EXTRACT, SCAN_FIELDS, INSERT_ANSWER } from '@/lib/messages'

// Injected on demand via activeTab + scripting when the user opens the popup —
// the manifest declares no content_scripts and no job-site host permission.
// Replies to the popup with the job read from the live DOM, the open-ended
// fields on the page, and performs a user-initiated insert. The guard prevents
// duplicate listeners if the script is injected more than once.
declare global {
  interface Window {
    __jobvaultListenerAttached?: boolean
  }
}

if (!window.__jobvaultListenerAttached) {
  window.__jobvaultListenerAttached = true
  chrome.runtime.onMessage.addListener(
    (message: { type?: string; fieldId?: string; text?: string }, _sender, sendResponse) => {
      if (message.type === EXTRACT) {
        sendResponse(extractFromDocument(document, location.href))
        return
      }
      if (message.type === SCAN_FIELDS) {
        sendResponse(findAnswerFields(document))
        return
      }
      if (message.type === INSERT_ANSWER && message.fieldId && typeof message.text === 'string') {
        sendResponse(insertIntoField(document, message.fieldId, message.text))
      }
    },
  )
}
