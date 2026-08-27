// Finds the open-ended fields on an application form and reads the question
// each one is asking. Every field is tagged with FIELD_ATTR so a later insert
// can find its target without holding a element reference across the message
// boundary.

export const FIELD_ATTR = 'data-jv-field'

export interface AnswerField {
  fieldId: string
  question: string
  maxLength: number | null
}

// Plain <input type="text"> is deliberately excluded: that is name, email and
// phone, which browser autofill already owns natively.
const FIELD_SELECTOR = 'textarea, [contenteditable="true"], [contenteditable=""]'

function textOf(node: Element | null | undefined): string {
  return (node?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function precedingText(el: Element): string {
  let node: Element | null = el
  for (let depth = 0; node && depth < 4; depth += 1) {
    let sibling = node.previousElementSibling
    while (sibling) {
      const text = textOf(sibling)
      if (text.length >= 8 && text.length <= 300) return text
      sibling = sibling.previousElementSibling
    }
    node = node.parentElement
  }
  return ''
}

function questionFor(el: Element, doc: Document): string {
  const aria = el.getAttribute('aria-label')?.trim()
  if (aria) return aria

  const labelledBy = el.getAttribute('aria-labelledby')
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => textOf(doc.getElementById(id)))
      .filter(Boolean)
      .join(' ')
    if (text) return text
  }

  const id = el.getAttribute('id')
  if (id) {
    const labelled = textOf(doc.querySelector(`label[for="${CSS.escape(id)}"]`))
    if (labelled) return labelled
  }

  const wrapping = textOf(el.closest('label'))
  if (wrapping) return wrapping

  const placeholder = el.getAttribute('placeholder')?.trim()
  if (placeholder) return placeholder

  return precedingText(el)
}

function isHidden(el: Element): boolean {
  if (el.hasAttribute('hidden')) return true
  const style = el.getAttribute('style') ?? ''
  return /display\s*:\s*none|visibility\s*:\s*hidden/i.test(style)
}

function maxLengthOf(el: Element): number | null {
  const raw = el.getAttribute('maxlength')
  if (!raw) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function findAnswerFields(doc: Document): AnswerField[] {
  const fields: AnswerField[] = []
  let index = 0

  for (const el of Array.from(doc.querySelectorAll(FIELD_SELECTOR))) {
    if (isHidden(el)) continue
    const question = questionFor(el, doc)
    // A field whose question cannot be read is useless — there is nothing to
    // match against, and inserting into an unlabelled box is a guess.
    if (!question) continue

    index += 1
    const fieldId = `jv-${index}`
    el.setAttribute(FIELD_ATTR, fieldId)
    fields.push({ fieldId, question, maxLength: maxLengthOf(el) })
  }

  return fields
}
