import {
  ProfileContentSchema,
  ensureIds,
  type MonthYear,
  type ProfileContent,
} from './profile-content.schema.js'
import { ResumeContentSchema, type ResumeContent } from './resume-content.schema.js'

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

// Split on – / — anywhere, but require surrounding spaces for "-" and "to" so
// hyphenated words ("Co-op") and month names ("October") never split. An
// unspaced "-" also splits when the preceding character is a digit ("2020-2021",
// "May 2020-May 2021") — a year/month side always ends in a digit, while
// hyphenated words ("Co-op", "mid-2020") never have one before the hyphen.
const RANGE_SEPARATOR = /\s*[–—]\s*|\s+-\s+|\s+to\s+|(?<=\d)\s*-\s*/i

const CURRENT_MARKER = /^(present|current|now|ongoing)$/i

// Parse a single side of a date range: "Jan 2022", "January 2022", "01/2022", "2022".
// Returns null when unparseable.
function parseMonthYear(raw: string): MonthYear | null {
  const s = raw.trim()

  const bareYear = /^(\d{4})$/.exec(s)
  if (bareYear) {
    const year = Number(bareYear[1])
    return year >= 1900 && year <= 2100 ? { month: null, year } : null
  }

  const numeric = /^(\d{1,2})\s*\/\s*(\d{4})$/.exec(s)
  if (numeric) {
    const month = Number(numeric[1])
    const year = Number(numeric[2])
    return month >= 1 && month <= 12 && year >= 1900 && year <= 2100 ? { month, year } : null
  }

  const named = /^([A-Za-z]+)\.?,?\s+(\d{4})$/.exec(s)
  if (named) {
    const month = MONTHS.indexOf((named[1] ?? '').slice(0, 3).toLowerCase()) + 1
    const year = Number(named[2])
    return month >= 1 && year >= 1900 && year <= 2100 ? { month, year } : null
  }

  return null
}

// Split a range string into sides; a right side reading like "Present" means
// current. A single un-ranged value is a start only. Unparseable sides → null.
export function parseDateRange(raw: string): {
  startDate: MonthYear | null
  endDate: MonthYear | null
  current: boolean
} {
  const parts = raw.trim().split(RANGE_SEPARATOR)
  const left = (parts[0] ?? '').trim()
  const right = parts.length > 1 ? (parts[1] ?? '').trim() : ''

  const startDate = left ? parseMonthYear(left) : null
  if (!right) return { startDate, endDate: null, current: false }
  if (CURRENT_MARKER.test(right)) return { startDate, endDate: null, current: true }
  return { startDate, endDate: parseMonthYear(right), current: false }
}

// When ANY non-empty side of a legacy date string failed to parse, keep the
// original string as a leading bullet so the information is never lost
// (spec §8: lossless up-conversion) — half-parseable ranges like
// "Summer 2021 – Present" keep the parsed side AND stash the original.
function unparseableDate(raw: string, range: ReturnType<typeof parseDateRange>): boolean {
  const parts = raw.trim().split(RANGE_SEPARATOR)
  const left = (parts[0] ?? '').trim()
  const right = parts.length > 1 ? (parts[1] ?? '').trim() : ''
  const leftLost = left !== '' && range.startDate === null
  const rightLost = right !== '' && !CURRENT_MARKER.test(right) && range.endDate === null
  return leftLost || rightLost
}

export function resumeContentToProfileContent(legacy: ResumeContent): ProfileContent {
  const experience = legacy.experience.map((e) => {
    const range = parseDateRange(e.date)
    return {
      company: e.company,
      role: e.title,
      startDate: range.startDate,
      endDate: range.endDate,
      current: range.current,
      bullets: unparseableDate(e.date, range) ? [`Dates: ${e.date}`, ...e.bullets] : e.bullets,
    }
  })

  const projects = legacy.projects.map((p) => ({
    name: p.name,
    description: p.tagline,
    technologies: [],
    bullets: p.bullets,
    links: p.url ? [{ label: 'Link', url: p.url }] : [],
    startDate: null,
    endDate: null,
    inProgress: false,
  }))

  const education = legacy.education.map((ed) => {
    const period = ed.period ?? ''
    const range = parseDateRange(period)
    return {
      degree: ed.degree,
      institution: ed.institution,
      startDate: range.startDate,
      endDate: range.endDate,
      current: range.current,
      bullets: unparseableDate(period, range) ? [`Dates: ${period}`] : [],
    }
  })

  const content = ProfileContentSchema.parse({
    basics: {
      name: legacy.basics.name,
      email: legacy.basics.email,
      phone: legacy.basics.phone,
      location: legacy.basics.location,
      links: legacy.basics.links.map((l) => ({ label: l.label, url: l.url })),
    },
    summary: legacy.summary,
    experience,
    projects,
    skills: legacy.skills.map((s) => ({ category: s.category, items: s.items })),
    education,
  })
  return ensureIds(content)
}

// Structural legacy markers, checked BEFORE any Zod parse (Zod strips unknown
// keys, which would silently drop tagline/url/date/period). Empty/section-less
// objects are NOT legacy — the shapes coincide.
export function isLegacyResumeContent(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false
  const record = data as Record<string, unknown>
  const items = (key: string): Record<string, unknown>[] => {
    const value = record[key]
    if (!Array.isArray(value)) return []
    return value.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
  }
  if (items('experience').some((e) => 'title' in e || 'date' in e)) return true
  if (items('education').some((e) => 'period' in e)) return true
  if (items('projects').some((p) => 'tagline' in p || 'url' in p)) return true
  return false
}

// Normalize a persona `data` payload of unknown vintage into ProfileContent.
// On a failed primary parse, try the other branch before throwing (defensive;
// dev data).
export function normalizePersonaData(data: unknown): ProfileContent {
  if (isLegacyResumeContent(data)) {
    try {
      return resumeContentToProfileContent(ResumeContentSchema.parse(data))
    } catch {
      return ensureIds(ProfileContentSchema.parse(data))
    }
  }
  try {
    return ensureIds(ProfileContentSchema.parse(data))
  } catch {
    return resumeContentToProfileContent(ResumeContentSchema.parse(data))
  }
}
