import { extractFromDocument } from './extract'
import { EXTRACT } from '@/lib/messages'

// Auto-injected on LinkedIn/Indeed (see manifest content_scripts). Replies to the
// popup's EXTRACT request with the focused job read from the live DOM. The guard
// prevents duplicate listeners if the script is ever injected more than once.
declare global {
  interface Window {
    __jobvaultListenerAttached?: boolean
  }
}

if (!window.__jobvaultListenerAttached) {
  window.__jobvaultListenerAttached = true
  chrome.runtime.onMessage.addListener((message: { type?: string }, _sender, sendResponse) => {
    if (message.type === EXTRACT) {
      sendResponse(extractFromDocument(document, location.href))
    }
  })
}
