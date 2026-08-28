import { describe, it, expect } from 'vitest'
import { searchResultHref } from './search'

describe('searchResultHref', () => {
  it('sends a job to the jobs drawer', () => {
    expect(searchResultHref({ type: 'job', id: 'j1' })).toBe('/app/jobs?job=j1')
  })

  it('sends a cover letter to its own route', () => {
    expect(searchResultHref({ type: 'coverLetter', id: 'c1' })).toBe('/app/cover-letters/c1')
  })

  it('sends an answer to the answers slideover', () => {
    expect(searchResultHref({ type: 'answer', id: 'a1' })).toBe('/app/answers?answer=a1')
  })

  it('sends a resume to the resumes slideover', () => {
    expect(searchResultHref({ type: 'resume', id: 'r1' })).toBe('/app/resumes?resume=r1')
  })

  it('sends a persona to the personas slideover', () => {
    expect(searchResultHref({ type: 'persona', id: 'p1' })).toBe('/app/personas?persona=p1')
  })
})
