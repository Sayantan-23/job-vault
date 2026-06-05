import { describe, it, expect } from 'vitest'
import { buildStructurePrompt } from './ai.prompts.js'

describe('buildStructurePrompt', () => {
  it('embeds all provided inputs and asks for the ResumeContent JSON shape', () => {
    const p = buildStructurePrompt({ freeText: 'I led teams', pastedResume: 'RESUME TEXT', fields: { basics: { name: 'Kartick', links: [] } } })
    expect(p).toContain('RESUME TEXT')
    expect(p).toContain('I led teams')
    expect(p).toContain('Kartick')
    // schema guidance
    expect(p).toMatch(/basics/)
    expect(p).toMatch(/experience/)
    expect(p).toMatch(/\*\*bold\*\*|bold/i)
    expect(p).toMatch(/JSON/i)
  })

  it('omits absent sections gracefully', () => {
    const p = buildStructurePrompt({ freeText: 'only free text' })
    expect(p).toContain('only free text')
    expect(p).not.toContain('PASTED RESUME')
  })
})
