import { describe, it, expect } from 'vitest'
import { detectPlatform, canonicalUrl } from './detector'

describe('detectPlatform', () => {
  it('classifies linkedin, indeed, and generic', () => {
    expect(detectPlatform('https://www.linkedin.com/jobs/view/123')).toBe('linkedin')
    expect(detectPlatform('https://uk.indeed.com/viewjob?jk=abc')).toBe('indeed')
    expect(detectPlatform('https://boards.greenhouse.io/acme/jobs/1')).toBe('generic')
    expect(detectPlatform('not a url')).toBe('generic')
  })
})

describe('canonicalUrl', () => {
  it('canonicalizes LinkedIn split-pane and slugged view URLs', () => {
    expect(canonicalUrl('https://www.linkedin.com/jobs/search?currentJobId=4012345678&foo=1')).toBe(
      'https://www.linkedin.com/jobs/view/4012345678',
    )
    expect(canonicalUrl('https://www.linkedin.com/jobs/view/senior-engineer-4012345678?trk=x')).toBe(
      'https://www.linkedin.com/jobs/view/4012345678',
    )
  })
  it('passes non-LinkedIn URLs through unchanged', () => {
    expect(canonicalUrl('https://indeed.com/viewjob?jk=abc')).toBe('https://indeed.com/viewjob?jk=abc')
  })
})
