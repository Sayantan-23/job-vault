import { describe, it, expect } from 'vitest'
import {
  ProfileContentSchema,
  ensureIds,
  type ProfileContent,
} from './profile-content.schema.js'
import type { ResumeContent } from './resume-content.schema.js'
import {
  parseDateRange,
  resumeContentToProfileContent,
  isLegacyResumeContent,
  normalizePersonaData,
} from './resume-to-profile.js'

describe('parseDateRange', () => {
  it('parses "Jan 2022 – Present" as current with a full start', () => {
    expect(parseDateRange('Jan 2022 – Present')).toEqual({
      startDate: { month: 1, year: 2022 },
      endDate: null,
      current: true,
    })
  })

  it('parses "January 2020 - March 2023" with both sides full', () => {
    expect(parseDateRange('January 2020 - March 2023')).toEqual({
      startDate: { month: 1, year: 2020 },
      endDate: { month: 3, year: 2023 },
      current: false,
    })
  })

  it('parses "2019–2021" (en dash, no spaces) as year-only sides', () => {
    expect(parseDateRange('2019–2021')).toEqual({
      startDate: { month: null, year: 2019 },
      endDate: { month: null, year: 2021 },
      current: false,
    })
  })

  it('parses "2019 - 2021" (spaced hyphen) as year-only sides', () => {
    expect(parseDateRange('2019 - 2021')).toEqual({
      startDate: { month: null, year: 2019 },
      endDate: { month: null, year: 2021 },
      current: false,
    })
  })

  it('parses "06/2021 – 08/2021" numeric months', () => {
    expect(parseDateRange('06/2021 – 08/2021')).toEqual({
      startDate: { month: 6, year: 2021 },
      endDate: { month: 8, year: 2021 },
      current: false,
    })
  })

  it('parses "2021 – now" as current', () => {
    expect(parseDateRange('2021 – now')).toEqual({
      startDate: { month: null, year: 2021 },
      endDate: null,
      current: true,
    })
  })

  it('parses "2020 to Present" as current', () => {
    expect(parseDateRange('2020 to Present')).toEqual({
      startDate: { month: null, year: 2020 },
      endDate: null,
      current: true,
    })
  })

  it('returns all-null, not current, for unparseable "Summer 2021"', () => {
    expect(parseDateRange('Summer 2021')).toEqual({
      startDate: null,
      endDate: null,
      current: false,
    })
  })

  it('parses an un-ranged "Mar 2022" as a start only', () => {
    expect(parseDateRange('Mar 2022')).toEqual({
      startDate: { month: 3, year: 2022 },
      endDate: null,
      current: false,
    })
  })

  it('does not split hyphenated words like "Co-op"', () => {
    expect(parseDateRange('Co-op')).toEqual({ startDate: null, endDate: null, current: false })
  })

  it('parses "2020-2021" (unspaced hyphen) as year-only sides', () => {
    expect(parseDateRange('2020-2021')).toEqual({
      startDate: { month: null, year: 2020 },
      endDate: { month: null, year: 2021 },
      current: false,
    })
  })

  it('parses "May 2020-May 2021" (unspaced hyphen) with both sides full', () => {
    expect(parseDateRange('May 2020-May 2021')).toEqual({
      startDate: { month: 5, year: 2020 },
      endDate: { month: 5, year: 2021 },
      current: false,
    })
  })

  it('parses "06/2021-08/2021" (unspaced hyphen) numeric months', () => {
    expect(parseDateRange('06/2021-08/2021')).toEqual({
      startDate: { month: 6, year: 2021 },
      endDate: { month: 8, year: 2021 },
      current: false,
    })
  })

  it('parses "2020-Present" (unspaced hyphen) as current', () => {
    expect(parseDateRange('2020-Present')).toEqual({
      startDate: { month: null, year: 2020 },
      endDate: null,
      current: true,
    })
  })

  it('does not split hyphenated words like "mid-2020" (no digit before the hyphen)', () => {
    expect(parseDateRange('mid-2020')).toEqual({ startDate: null, endDate: null, current: false })
  })
})

const legacyFixture: ResumeContent = {
  basics: {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+1 555 0100',
    location: 'London, UK',
    links: [
      { label: 'GitHub', url: 'https://github.com/ada' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/ada' },
    ],
  },
  summary: 'Engineer with **analytical** focus.',
  experience: [
    {
      company: 'Analytical Engines',
      title: 'Senior Engineer',
      date: 'Jan 2022 – Present',
      bullets: ['Led the engine team', 'Shipped **v2**'],
    },
    {
      company: 'Babbage & Co',
      title: 'Engineer',
      date: 'Summer 2019',
      bullets: ['Built prototypes'],
    },
  ],
  projects: [
    {
      name: 'Difference Engine',
      tagline: 'A mechanical calculator',
      url: 'https://example.com/de',
      bullets: ['Designed gears'],
    },
  ],
  skills: [{ category: 'Languages', items: ['Ada', 'TypeScript'] }],
  education: [
    { degree: 'BSc Mathematics', institution: 'University of London', period: '2016 – 2020' },
    { degree: 'Cert', institution: 'Night School', period: 'Autumn term' },
  ],
}

// Strip generated ids so the golden comparison is exact on everything else.
function stripIds(content: ProfileContent) {
  return {
    ...content,
    basics: { ...content.basics, links: content.basics.links.map(({ id: _id, ...l }) => l) },
    experience: content.experience.map(({ id: _id, ...e }) => e),
    projects: content.projects.map(({ id: _id, ...p }) => ({
      ...p,
      links: p.links.map(({ id: _lid, ...l }) => l),
    })),
    skills: content.skills.map(({ id: _id, ...s }) => s),
    education: content.education.map(({ id: _id, ...e }) => e),
  }
}

describe('resumeContentToProfileContent', () => {
  it('converts a full legacy ResumeContent to the exact expected ProfileContent', () => {
    const out = resumeContentToProfileContent(legacyFixture)
    expect(stripIds(out)).toEqual({
      basics: {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '+1 555 0100',
        location: 'London, UK',
        links: [
          { label: 'GitHub', url: 'https://github.com/ada' },
          { label: 'LinkedIn', url: 'https://linkedin.com/in/ada' },
        ],
      },
      summary: 'Engineer with **analytical** focus.',
      experience: [
        {
          company: 'Analytical Engines',
          role: 'Senior Engineer',
          startDate: { month: 1, year: 2022 },
          endDate: null,
          current: true,
          bullets: ['Led the engine team', 'Shipped **v2**'],
        },
        {
          company: 'Babbage & Co',
          role: 'Engineer',
          startDate: null,
          endDate: null,
          current: false,
          // Unparseable date is preserved as a leading bullet.
          bullets: ['Dates: Summer 2019', 'Built prototypes'],
        },
      ],
      projects: [
        {
          name: 'Difference Engine',
          description: 'A mechanical calculator',
          technologies: [],
          bullets: ['Designed gears'],
          links: [{ label: 'Link', url: 'https://example.com/de' }],
          startDate: null,
          endDate: null,
          inProgress: false,
        },
      ],
      skills: [{ category: 'Languages', items: ['Ada', 'TypeScript'] }],
      education: [
        {
          degree: 'BSc Mathematics',
          institution: 'University of London',
          startDate: { month: null, year: 2016 },
          endDate: { month: null, year: 2020 },
          current: false,
          bullets: [],
        },
        {
          degree: 'Cert',
          institution: 'Night School',
          startDate: null,
          endDate: null,
          current: false,
          bullets: ['Dates: Autumn term'],
        },
      ],
    })
  })

  it('assigns ids to every entry and link (truthy and unique)', () => {
    const out = resumeContentToProfileContent(legacyFixture)
    const ids = [
      ...out.basics.links.map((l) => l.id),
      ...out.experience.map((e) => e.id),
      ...out.projects.map((p) => p.id),
      ...out.projects.flatMap((p) => p.links.map((l) => l.id)),
      ...out.skills.map((s) => s.id),
      ...out.education.map((e) => e.id),
    ]
    for (const id of ids) expect(id).toBeTruthy()
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('produces output that passes ProfileContentSchema.parse unchanged', () => {
    const out = resumeContentToProfileContent(legacyFixture)
    expect(ProfileContentSchema.parse(out)).toEqual(out)
  })

  it('omits the project link when the legacy url is absent', () => {
    const out = resumeContentToProfileContent({
      ...legacyFixture,
      projects: [{ name: 'Bare', bullets: [] }],
    })
    expect(out.projects[0]?.links).toEqual([])
    expect(out.projects[0]?.description).toBeUndefined()
  })

  // Half-parseable ranges: keep the side that parsed AND stash the original
  // string as a leading bullet, so nothing is lost (spec §8).
  describe('half-parseable date ranges', () => {
    function convertExperienceDate(date: string) {
      const out = resumeContentToProfileContent({
        ...legacyFixture,
        experience: [{ company: 'X', title: 'SWE', date, bullets: ['kept bullet'] }],
        education: [],
      })
      const entry = out.experience[0]
      if (!entry) throw new Error('expected one experience entry')
      return entry
    }

    it('"Summer 2021 – Present": current is kept AND the Dates bullet is stashed', () => {
      const e = convertExperienceDate('Summer 2021 – Present')
      expect(e.startDate).toBeNull()
      expect(e.endDate).toBeNull()
      expect(e.current).toBe(true)
      expect(e.bullets).toEqual(['Dates: Summer 2021 – Present', 'kept bullet'])
    })

    it('"Summer 2019 – Dec 2019": parsed end is kept AND the Dates bullet is stashed', () => {
      const e = convertExperienceDate('Summer 2019 – Dec 2019')
      expect(e.startDate).toBeNull()
      expect(e.endDate).toEqual({ month: 12, year: 2019 })
      expect(e.current).toBe(false)
      expect(e.bullets).toEqual(['Dates: Summer 2019 – Dec 2019', 'kept bullet'])
    })

    it('"Jan 2020 – Summer 2020": parsed start is kept AND the Dates bullet is stashed', () => {
      const e = convertExperienceDate('Jan 2020 – Summer 2020')
      expect(e.startDate).toEqual({ month: 1, year: 2020 })
      expect(e.endDate).toBeNull()
      expect(e.current).toBe(false)
      expect(e.bullets).toEqual(['Dates: Jan 2020 – Summer 2020', 'kept bullet'])
    })

    it('education "Fall 2018 – 2022": parsed end is kept AND the Dates bullet is stashed', () => {
      const out = resumeContentToProfileContent({
        ...legacyFixture,
        experience: [],
        education: [{ degree: 'BS', institution: 'MIT', period: 'Fall 2018 – 2022' }],
      })
      const ed = out.education[0]
      expect(ed?.startDate).toBeNull()
      expect(ed?.endDate).toEqual({ month: null, year: 2022 })
      expect(ed?.current).toBe(false)
      expect(ed?.bullets).toEqual(['Dates: Fall 2018 – 2022'])
    })

    it('fully-parseable ranges still get NO Dates bullet', () => {
      const e = convertExperienceDate('Jan 2022 – Present')
      expect(e.bullets).toEqual(['kept bullet'])
    })
  })
})

describe('isLegacyResumeContent', () => {
  it('flags experience items carrying a title or date key', () => {
    expect(isLegacyResumeContent(legacyFixture)).toBe(true)
    expect(isLegacyResumeContent({ experience: [{ company: 'X', title: 'SWE' }] })).toBe(true)
    expect(isLegacyResumeContent({ experience: [{ company: 'X', date: '2020' }] })).toBe(true)
  })

  it('flags education items carrying a period key', () => {
    expect(
      isLegacyResumeContent({ education: [{ degree: 'BS', institution: 'MIT', period: '2019' }] }),
    ).toBe(true)
  })

  it('flags projects carrying a tagline or url key', () => {
    expect(isLegacyResumeContent({ projects: [{ name: 'P', tagline: 'x' }] })).toBe(true)
    expect(isLegacyResumeContent({ projects: [{ name: 'P', url: 'https://p.dev' }] })).toBe(true)
  })

  it('does NOT flag an empty-sections object (shapes coincide)', () => {
    expect(
      isLegacyResumeContent({
        basics: { name: 'X', links: [] },
        summary: '',
        experience: [],
        projects: [],
        skills: [],
        education: [],
      }),
    ).toBe(false)
  })

  it('does NOT flag a modern ProfileContent', () => {
    const modern = ensureIds(
      ProfileContentSchema.parse({
        basics: { name: 'Ada' },
        experience: [{ company: 'X', role: 'SWE', startDate: { month: 1, year: 2022 } }],
        projects: [{ name: 'P', description: 'd', links: [{ label: 'Link', url: 'u' }] }],
        education: [{ degree: 'BS', institution: 'MIT' }],
      }),
    )
    expect(isLegacyResumeContent(modern)).toBe(false)
  })

  it('does NOT flag non-objects', () => {
    expect(isLegacyResumeContent(null)).toBe(false)
    expect(isLegacyResumeContent(undefined)).toBe(false)
    expect(isLegacyResumeContent('resume')).toBe(false)
    expect(isLegacyResumeContent(42)).toBe(false)
  })
})

describe('normalizePersonaData', () => {
  it('up-converts a legacy row', () => {
    const out = normalizePersonaData(legacyFixture)
    expect(out.experience[0]?.role).toBe('Senior Engineer')
    expect(out.experience[0]?.startDate).toEqual({ month: 1, year: 2022 })
    expect(out.experience[0]?.current).toBe(true)
    expect(out.projects[0]?.links[0]?.url).toBe('https://example.com/de')
    expect(out.experience[0]?.id).toBeTruthy()
    expect(out.education[0]?.id).toBeTruthy()
  })

  it('passes a modern row through unchanged (ids preserved)', () => {
    const modern = ensureIds(
      ProfileContentSchema.parse({
        basics: { name: 'Ada', links: [{ label: 'GH', url: 'gh' }] },
        summary: 'S',
        experience: [{ company: 'X', role: 'SWE', startDate: { month: 2, year: 2021 }, current: true }],
        projects: [{ name: 'P', technologies: ['ts'] }],
        skills: [{ category: 'Languages', items: ['Ada'] }],
        education: [{ degree: 'BS', institution: 'MIT', endDate: { month: null, year: 2020 } }],
      }),
    )
    expect(normalizePersonaData(modern)).toEqual(modern)
  })

  it('fills missing ids on a modern row', () => {
    const out = normalizePersonaData({
      basics: { name: 'Ada' },
      experience: [{ company: 'X', role: 'SWE' }],
    })
    expect(out.experience[0]?.id).toBeTruthy()
    expect(out.experience[0]?.role).toBe('SWE')
  })

  it('falls back to the ProfileContent branch when legacy markers mislead', () => {
    // Has a 'date' key (legacy marker) but no 'title' — fails ResumeContentSchema,
    // parses fine as ProfileContent once Zod strips the stray key.
    const out = normalizePersonaData({
      basics: { name: 'Ada' },
      experience: [{ company: 'X', role: 'SWE', date: 'Jan 2022' }],
    })
    expect(out.experience[0]?.role).toBe('SWE')
    expect(out.experience[0]?.id).toBeTruthy()
  })

  it('throws when the data fits neither shape', () => {
    expect(() => normalizePersonaData({ basics: {} })).toThrow()
  })
})
