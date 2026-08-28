import { describe, it, expect } from 'vitest'
import { findAnswerFields, FIELD_ATTR } from './answer-fields'

function docFrom(html: string): Document {
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
}

describe('findAnswerFields', () => {
  it('reads aria-label first', () => {
    const doc = docFrom(`<textarea aria-label="Why do you want to work here?"></textarea>`)
    expect(findAnswerFields(doc)[0]!.question).toBe('Why do you want to work here?')
  })

  // The referenced element sits AFTER the field, so the preceding-text fallback
  // cannot reach it — only aria-labelledby can produce this question.
  it('resolves aria-labelledby', () => {
    const doc = docFrom(`<textarea aria-labelledby="lbl"></textarea><span id="lbl">Why should we hire you?</span>`)
    expect(findAnswerFields(doc)[0]!.question).toBe('Why should we hire you?')
  })

  it('falls back to a label[for]', () => {
    const doc = docFrom(`<label for="q1">Describe a challenge you faced.</label><textarea id="q1"></textarea>`)
    expect(findAnswerFields(doc)[0]!.question).toBe('Describe a challenge you faced.')
  })

  it('falls back to a wrapping label', () => {
    const doc = docFrom(`<label>What motivates you?<textarea></textarea></label>`)
    expect(findAnswerFields(doc)[0]!.question).toBe('What motivates you?')
  })

  it('falls back to a placeholder', () => {
    const doc = docFrom(`<textarea placeholder="Tell us about yourself"></textarea>`)
    expect(findAnswerFields(doc)[0]!.question).toBe('Tell us about yourself')
  })

  it('falls back to the nearest preceding text', () => {
    const doc = docFrom(`<div><p>Why are you a good fit for this role?</p><textarea></textarea></div>`)
    expect(findAnswerFields(doc)[0]!.question).toBe('Why are you a good fit for this role?')
  })

  it('captures maxLength when the field declares one', () => {
    const doc = docFrom(`<textarea aria-label="Why us?" maxlength="500"></textarea>`)
    expect(findAnswerFields(doc)[0]!.maxLength).toBe(500)
  })

  it('reports maxLength as null when unset', () => {
    const doc = docFrom(`<textarea aria-label="Why us?"></textarea>`)
    expect(findAnswerFields(doc)[0]!.maxLength).toBeNull()
  })

  it('tags each field so an insert can find it later', () => {
    const doc = docFrom(`<textarea aria-label="One"></textarea><textarea aria-label="Two"></textarea>`)
    const fields = findAnswerFields(doc)
    expect(fields).toHaveLength(2)
    expect(doc.querySelector(`[${FIELD_ATTR}="${fields[0]!.fieldId}"]`)).not.toBeNull()
    expect(fields[0]!.fieldId).not.toBe(fields[1]!.fieldId)
  })

  it('finds contenteditable fields', () => {
    const doc = docFrom(`<div contenteditable="true" aria-label="Cover letter"></div>`)
    expect(findAnswerFields(doc)[0]!.question).toBe('Cover letter')
  })

  it('ignores plain text inputs — browser autofill already owns those', () => {
    const doc = docFrom(`<label for="n">Full name</label><input id="n" type="text">`)
    expect(findAnswerFields(doc)).toHaveLength(0)
  })

  it('ignores hidden fields', () => {
    const doc = docFrom(`<textarea aria-label="Hidden" hidden></textarea>`)
    expect(findAnswerFields(doc)).toHaveLength(0)
  })

  it('skips a field whose question cannot be read', () => {
    const doc = docFrom(`<textarea></textarea>`)
    expect(findAnswerFields(doc)).toHaveLength(0)
  })
})
