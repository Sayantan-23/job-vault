import { FIELD_ATTR } from './answer-fields'

// Assigning el.value directly does NOT fire React's onChange: React installs its
// own value setter on the element instance and tracks the last value it wrote.
// Going through the prototype's native setter and then dispatching a bubbling
// input event is what makes a controlled ATS form actually register the text —
// otherwise it looks filled and submits empty.
function setNativeValue(el: HTMLTextAreaElement | HTMLInputElement, text: string): void {
  const prototype = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  if (setter) setter.call(el, text)
  else el.value = text
}

export function insertIntoField(doc: Document, fieldId: string, text: string): boolean {
  const el = doc.querySelector(`[${FIELD_ATTR}="${CSS.escape(fieldId)}"]`)
  if (!el) return false

  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    setNativeValue(el, text)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }

  // ponytail: plain contenteditable only. A rich-text editor (Draft.js,
  // ProseMirror, Slate) owns its own document model and reverts a raw
  // textContent write on the next render — the same looks-filled-submits-empty
  // failure the textarea path above avoids. Unverified: no surveyed ATS
  // (Greenhouse, Ashby, Lever) used one. The working path there is
  // document.execCommand('insertText', false, text) on a focused editor. See
  // t-0cb5xk.
  if (el.getAttribute('contenteditable') !== null) {
    el.textContent = text
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  }

  return false
}
