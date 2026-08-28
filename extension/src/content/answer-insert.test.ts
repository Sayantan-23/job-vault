import { describe, it, expect, vi } from 'vitest'
import { insertIntoField } from './answer-insert'
import { FIELD_ATTR } from './answer-fields'

function docWith(html: string): Document {
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
}

describe('insertIntoField', () => {
  it('writes the text into a tagged textarea', () => {
    const doc = docWith(`<textarea ${FIELD_ATTR}="jv-1"></textarea>`)
    expect(insertIntoField(doc, 'jv-1', 'my answer')).toBe(true)
    expect(doc.querySelector('textarea')!.value).toBe('my answer')
  })

  it('fires a bubbling input event so React-controlled forms register it', () => {
    const doc = docWith(`<textarea ${FIELD_ATTR}="jv-1"></textarea>`)
    const onInput = vi.fn()
    doc.body.addEventListener('input', onInput)

    insertIntoField(doc, 'jv-1', 'my answer')

    expect(onInput).toHaveBeenCalledTimes(1)
  })

  it('writes into a contenteditable field', () => {
    const doc = docWith(`<div contenteditable="true" ${FIELD_ATTR}="jv-1"></div>`)
    expect(insertIntoField(doc, 'jv-1', 'my answer')).toBe(true)
    expect(doc.querySelector('div')!.textContent).toBe('my answer')
  })

  it('returns false when the field is gone', () => {
    const doc = docWith(`<textarea ${FIELD_ATTR}="jv-1"></textarea>`)
    expect(insertIntoField(doc, 'jv-missing', 'my answer')).toBe(false)
  })
})
