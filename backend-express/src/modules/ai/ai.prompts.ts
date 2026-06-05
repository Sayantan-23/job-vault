import type { PersonaInputs } from '@/modules/personas/personas.schema.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

const SCHEMA_GUIDE = `Return ONLY a JSON object with this exact shape (omit unknown optional fields, never invent facts):
{
  "basics": { "name": string, "phone"?: string, "email"?: string, "location"?: string, "links": [{ "label": string, "url": string }] },
  "summary": string,
  "experience": [{ "company": string, "title": string, "date": string, "bullets": string[] }],
  "projects": [{ "name": string, "tagline"?: string, "url"?: string, "bullets": string[] }],
  "skills": [{ "category": string, "items": string[] }],
  "education": [{ "degree": string, "institution": string, "period"?: string }]
}
In bullet and summary text, wrap the most impactful 1-3 phrases in **double asterisks** for emphasis (always use ** in balanced pairs). Keep bullets achievement-oriented and concise. Do not include markdown fences.`

export function buildStructurePrompt(inputs: PersonaInputs): string {
  const parts: string[] = [
    'You are a résumé parser. Convert the candidate background below into structured JSON.',
    SCHEMA_GUIDE,
  ]
  if (inputs.pastedResume) parts.push(`PASTED RESUME:\n${inputs.pastedResume}`)
  if (inputs.freeText) parts.push(`ADDITIONAL NOTES:\n${inputs.freeText}`)
  if (inputs.fields) parts.push(`KNOWN FIELDS (authoritative, prefer these):\n${JSON.stringify(inputs.fields)}`)
  return parts.join('\n\n')
}

export function buildResumePrompt(
  background: ResumeContent,
  job: { title: string; company: string; snapshot?: string | null } | null,
  instructions?: string,
): string {
  const parts: string[] = [
    'You are an expert résumé writer. Produce a polished, ATS-clean résumé as structured JSON from the candidate background below.',
    SCHEMA_GUIDE,
    `CANDIDATE BACKGROUND (authoritative facts):\n${JSON.stringify(background)}`,
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
