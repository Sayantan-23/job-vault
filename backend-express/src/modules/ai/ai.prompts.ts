import type { ProfileContent } from '@/shared/profile-content.schema.js'

// Output shape of résumé GENERATION — stays the legacy ResumeContent (the .tex
// deriver and react-pdf renderer consume it; only the background input changed).
const RESUME_SCHEMA_GUIDE = `Return ONLY a JSON object with this exact shape (omit unknown optional fields, never invent facts):
{
  "basics": { "name": string, "phone"?: string, "email"?: string, "location"?: string, "links": [{ "label": string, "url": string }] },
  "summary": string,
  "experience": [{ "company": string, "title": string, "date": string, "bullets": string[] }],
  "projects": [{ "name": string, "tagline"?: string, "url"?: string, "bullets": string[] }],
  "skills": [{ "category": string, "items": string[] }],
  "education": [{ "degree": string, "institution": string, "period"?: string }]
}
In bullet and summary text, wrap the most impactful 1-3 phrases in **double asterisks** for emphasis (always use ** in balanced pairs). Keep bullets achievement-oriented and concise. Do not include markdown fences.`

// Output shape of résumé STRUCTURING (parse-resume) — the master-profile schema.
const PROFILE_SCHEMA_GUIDE = `Return ONLY a JSON object with this exact shape (omit unknown optional fields, omit all "id" fields, never invent facts):
{
  "basics": { "name": string, "phone"?: string, "email"?: string, "location"?: string, "links": [{ "label": string, "url": string }] },
  "summary": string,
  "experience": [{ "company": string, "role": string, "employmentType"?: "full-time" | "part-time" | "contract" | "freelance" | "internship" | "self-employed", "location"?: string, "startDate": MonthYear | null, "endDate": MonthYear | null, "current": boolean, "bullets": string[] }],
  "projects": [{ "name": string, "role"?: string, "description"?: string, "technologies": string[], "bullets": string[], "links": [{ "label": string, "url": string }], "startDate": MonthYear | null, "endDate": MonthYear | null, "inProgress": boolean }],
  "skills": [{ "category": string, "items": string[] }],
  "education": [{ "degree": string, "institution": string, "fieldOfStudy"?: string, "location"?: string, "startDate": MonthYear | null, "endDate": MonthYear | null, "current": boolean, "grade"?: string, "bullets": string[] }]
}
MonthYear is { "month": 1-12 | null, "year": number } — a null month means year-only. When a date is unknown, use null for the whole date. An ongoing role or degree has "current": true (or "inProgress": true for projects) and "endDate": null.
In bullet and summary text, wrap the most impactful 1-3 phrases in **double asterisks** for emphasis (always use ** in balanced pairs). Keep bullets achievement-oriented and concise. Do not include markdown fences.`

const BACKGROUND_DATES_NOTE =
  'Background dates appear as {month, year} objects (month may be null); render them as human-readable strings like "Jan 2022 – Present".'

export function buildStructurePrompt(resumeText: string): string {
  return [
    'You are a résumé parser. Convert the candidate résumé text below into structured JSON.',
    PROFILE_SCHEMA_GUIDE,
    `RESUME TEXT:\n${resumeText}`,
  ].join('\n\n')
}

export function buildResumePrompt(
  background: ProfileContent,
  job: { title: string; company: string; snapshot?: string | null } | null,
  instructions?: string,
): string {
  const parts: string[] = [
    'You are an expert résumé writer. Produce a polished, ATS-clean résumé as structured JSON from the candidate background below.',
    RESUME_SCHEMA_GUIDE,
    `CANDIDATE BACKGROUND (authoritative facts):\n${JSON.stringify(background)}`,
    BACKGROUND_DATES_NOTE,
  ]
  if (job) {
    parts.push(
      `TAILOR FOR THIS JOB — reorder and emphasize the most relevant experience, projects, skills, and keywords:\nTitle: ${job.title}\nCompany: ${job.company}${job.snapshot ? `\nDescription:\n${job.snapshot}` : ''}`,
    )
  }
  if (instructions) parts.push(`EXTRA INSTRUCTIONS:\n${instructions}`)
  parts.push('Stay truthful to the background — do not invent employers, titles, dates, or degrees. Reword and prioritize for impact only.')
  return parts.join('\n\n')
}

export function buildCoverLetterPrompt(
  background: ProfileContent,
  job: { title: string; company: string; snapshot?: string | null },
  instructions?: string,
): string {
  const parts: string[] = [
    'Write a concise, professional cover letter in Markdown for the job below, drawing on the candidate background. 3-4 short first-person paragraphs, specific and truthful — do not invent facts. Output ONLY the letter body in Markdown (no preamble, no code fences).',
    `JOB:\nTitle: ${job.title}\nCompany: ${job.company}${job.snapshot ? `\nDescription:\n${job.snapshot}` : ''}`,
    `CANDIDATE BACKGROUND (authoritative facts):\n${JSON.stringify(background)}`,
    BACKGROUND_DATES_NOTE,
  ]
  if (instructions) parts.push(`EXTRA INSTRUCTIONS:\n${instructions}`)
  return parts.join('\n\n')
}

type RefineAction = 'humanize' | 'shorten' | 'lengthen' | 'fix-grammar' | 'custom'

const REFINE_ACTION_GUIDE: Record<RefineAction, string> = {
  humanize:
    'Rewrite it to sound natural and human — strip robotic, generic, or clichéd AI phrasing (e.g. "I am writing to express my keen interest"), vary sentence rhythm and length, keep a genuine first-person voice.',
  shorten:
    'Make it more concise — cut filler and redundancy, tighten sentences, keep every substantive point. The result should be noticeably shorter.',
  lengthen:
    'Expand it with more relevant, specific detail drawn from the existing content — add substance, not padding or repetition. Keep it focused.',
  'fix-grammar':
    'Fix grammar, spelling, and punctuation and smooth awkward phrasing. Preserve meaning, length, and voice — change as little as possible beyond corrections.',
  custom: 'Apply the user instructions below.',
}

export function buildRefineCoverLetterPrompt(currentBody: string, action: RefineAction, instructions?: string): string {
  return [
    "You are editing an existing cover letter. Revise it per the instruction below, preserving its Markdown structure and the candidate's real facts — do not invent employers, titles, dates, or achievements. Output ONLY the revised letter body in Markdown (no preamble, no code fences).",
    `INSTRUCTION: ${REFINE_ACTION_GUIDE[action]}`,
    instructions ? `ADDITIONAL INSTRUCTIONS:\n${instructions}` : null,
    `CURRENT COVER LETTER:\n${currentBody}`,
  ]
    .filter((part): part is string => part !== null)
    .join('\n\n')
}
