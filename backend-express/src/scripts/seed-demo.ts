import 'dotenv/config'
import { pathToFileURL } from 'node:url'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import {
  users,
  jobs,
  timelineEvents,
  reminders,
  notifications,
  jobContacts,
  personas,
  userProfiles,
  generatedResumes,
  coverLetters,
} from '@/db/schema/index.js'
import type { JobRow, JobStatus } from '@/db/schema/jobs.js'
import type { ContactChannel, ContactStatus } from '@/db/schema/job-contacts.js'
import type { ProfileContent } from '@/shared/profile-content.schema.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'
import { hashSecret } from '@/modules/auth/auth.tokens.js'
import { logger } from '@/shared/logger.js'

// Demo data for manual feature testing. Idempotent: wipes and re-seeds
// everything owned by the target user, never touches other accounts.
// ponytail: plain literals, no faker — the point is realistic *coverage*
// (every status, every ghost band, every entity), not volume.

const EMAIL = process.env['SEED_EMAIL'] ?? 'demo@jobvault.app'
const PASSWORD = process.env['SEED_PASSWORD'] ?? 'demo1234'

const now = Date.now()
const days = (n: number): Date => new Date(now - n * 86_400_000)
const inDays = (n: number): Date => new Date(now + n * 86_400_000)
const hours = (n: number): Date => new Date(now + n * 3_600_000)

interface JobSeed {
  key: string
  title: string
  company: string
  location: string
  salaryRange?: string
  status: JobStatus
  /** drives the live-derived ghost meter: <=7 fresh, 8-14 stale, >14 ghosted */
  activityDaysAgo: number
  createdDaysAgo: number
  notes?: string
  timeline: { type: 'AUTO' | 'MANUAL'; title: string; description?: string; daysAgo: number }[]
  contacts?: { contact: string; channel: ContactChannel; status: ContactStatus; daysAgo: number; notes?: string }[]
}

const DESC = (title: string, company: string): string =>
  `## ${title} — ${company}\n\nWe are hiring a **${title}** to join the team.\n\n### Responsibilities\n\n- Build and ship product features end to end\n- Partner with design and product on scope\n- Own quality: tests, reviews, on-call\n\n### Requirements\n\n- 3+ years of professional experience\n- Strong TypeScript / React / Node.js\n- Comfortable with Postgres and CI/CD\n`

const JOB_SEEDS: JobSeed[] = [
  // ---- WISHLIST (fresh, nothing done yet) ----
  {
    key: 'stripe',
    title: 'Senior Frontend Engineer',
    company: 'Stripe',
    location: 'Remote (US)',
    salaryRange: '$180,000 - $220,000',
    status: 'WISHLIST',
    activityDaysAgo: 1,
    createdDaysAgo: 1,
    notes: 'Referral from Priya might be possible — ask before applying.',
    timeline: [{ type: 'AUTO', title: 'Job added', description: 'Added to WISHLIST', daysAgo: 1 }],
  },
  {
    key: 'linear',
    title: 'Product Engineer',
    company: 'Linear',
    location: 'Remote (Europe)',
    salaryRange: '€110,000 - €140,000',
    status: 'WISHLIST',
    activityDaysAgo: 3,
    createdDaysAgo: 3,
    timeline: [{ type: 'AUTO', title: 'Job added', description: 'Added to WISHLIST', daysAgo: 3 }],
  },
  {
    key: 'vercel',
    title: 'Full Stack Engineer, Platform',
    company: 'Vercel',
    location: 'San Francisco, CA',
    salaryRange: '$170,000 - $210,000',
    status: 'WISHLIST',
    activityDaysAgo: 6,
    createdDaysAgo: 6,
    notes: 'Tailor the résumé toward edge/runtime work.',
    timeline: [{ type: 'AUTO', title: 'Job added', description: 'Added to WISHLIST', daysAgo: 6 }],
  },

  // ---- APPLIED (spread across all three ghost bands) ----
  {
    key: 'notion',
    title: 'Software Engineer, Growth',
    company: 'Notion',
    location: 'New York, NY',
    salaryRange: '$160,000 - $195,000',
    status: 'APPLIED',
    activityDaysAgo: 2,
    createdDaysAgo: 5,
    timeline: [
      { type: 'AUTO', title: 'Job added', description: 'Added to WISHLIST', daysAgo: 5 },
      { type: 'AUTO', title: 'Status changed to APPLIED', description: 'WISHLIST → APPLIED', daysAgo: 2 },
      { type: 'MANUAL', title: 'Submitted application', description: 'Applied with the tailored résumé + cover letter.', daysAgo: 2 },
    ],
    contacts: [
      { contact: 'Priya Raman — priya@notion.so', channel: 'EMAIL', status: 'HEARD_BACK', daysAgo: 2, notes: 'Said she would flag my application to the hiring manager.' },
    ],
  },
  {
    key: 'figma',
    title: 'Frontend Engineer, Design Systems',
    company: 'Figma',
    location: 'Remote (US)',
    salaryRange: '$165,000 - $200,000',
    status: 'APPLIED',
    activityDaysAgo: 10,
    createdDaysAgo: 16,
    notes: 'Recruiter said 2 weeks to first response.',
    timeline: [
      { type: 'AUTO', title: 'Job added', description: 'Added to WISHLIST', daysAgo: 16 },
      { type: 'AUTO', title: 'Status changed to APPLIED', description: 'WISHLIST → APPLIED', daysAgo: 10 },
    ],
    contacts: [
      { contact: 'https://linkedin.com/in/marco-devries', channel: 'LINKEDIN', status: 'NO_RESPONSE', daysAgo: 9, notes: 'Cold DM, no reply yet.' },
    ],
  },
  {
    key: 'datadog',
    title: 'Backend Engineer, Ingestion',
    company: 'Datadog',
    location: 'Boston, MA',
    salaryRange: '$155,000 - $185,000',
    status: 'APPLIED',
    activityDaysAgo: 23,
    createdDaysAgo: 30,
    notes: 'Radio silence. Follow up once more, then archive.',
    timeline: [
      { type: 'AUTO', title: 'Job added', description: 'Added to WISHLIST', daysAgo: 30 },
      { type: 'AUTO', title: 'Status changed to APPLIED', description: 'WISHLIST → APPLIED', daysAgo: 23 },
      { type: 'MANUAL', title: 'Follow-up email sent', description: 'Nudged the recruiter, no reply.', daysAgo: 16 },
    ],
    contacts: [
      { contact: 'Alex Chen (recruiter)', channel: 'EMAIL', status: 'NO_RESPONSE', daysAgo: 22 },
      { contact: 'Dana Whitfield — eng manager', channel: 'LINKEDIN', status: 'DECLINED', daysAgo: 15, notes: 'Not taking referrals for external candidates.' },
    ],
  },
  {
    key: 'shopify',
    title: 'Senior Software Engineer',
    company: 'Shopify',
    location: 'Remote (Canada)',
    salaryRange: 'CAD $170,000 - $200,000',
    status: 'APPLIED',
    activityDaysAgo: 34,
    createdDaysAgo: 40,
    timeline: [
      { type: 'AUTO', title: 'Job added', description: 'Added to WISHLIST', daysAgo: 40 },
      { type: 'AUTO', title: 'Status changed to APPLIED', description: 'WISHLIST → APPLIED', daysAgo: 34 },
    ],
  },
  {
    key: 'ramp',
    title: 'Product Engineer',
    company: 'Ramp',
    location: 'New York, NY',
    salaryRange: '$175,000 - $215,000',
    status: 'APPLIED',
    activityDaysAgo: 4,
    createdDaysAgo: 8,
    timeline: [
      { type: 'AUTO', title: 'Job added', description: 'Added to WISHLIST', daysAgo: 8 },
      { type: 'AUTO', title: 'Status changed to APPLIED', description: 'WISHLIST → APPLIED', daysAgo: 4 },
    ],
    contacts: [
      { contact: 'Sam Okafor — sam.okafor@ramp.com', channel: 'EMAIL', status: 'REFERRED', daysAgo: 5, notes: 'Submitted the internal referral on my behalf.' },
    ],
  },

  // ---- INTERVIEWING ----
  {
    key: 'anthropic',
    title: 'Full Stack Engineer, Product',
    company: 'Anthropic',
    location: 'San Francisco, CA',
    salaryRange: '$200,000 - $260,000',
    status: 'INTERVIEWING',
    activityDaysAgo: 1,
    createdDaysAgo: 21,
    notes: 'Onsite loop scheduled. Review system design + the take-home repo.',
    timeline: [
      { type: 'AUTO', title: 'Job added', description: 'Added to WISHLIST', daysAgo: 21 },
      { type: 'AUTO', title: 'Status changed to APPLIED', description: 'WISHLIST → APPLIED', daysAgo: 18 },
      { type: 'AUTO', title: 'Status changed to INTERVIEWING', description: 'APPLIED → INTERVIEWING', daysAgo: 9 },
      { type: 'MANUAL', title: 'Recruiter screen', description: '30 min with Jamie. Comp range confirmed, next is a technical screen.', daysAgo: 9 },
      { type: 'MANUAL', title: 'Technical screen passed', description: 'Pair-programming on a React/Node task. Moving to the onsite loop.', daysAgo: 1 },
    ],
    contacts: [
      { contact: 'Jamie Liu (recruiter)', channel: 'EMAIL', status: 'HEARD_BACK', daysAgo: 10 },
    ],
  },
  {
    key: 'supabase',
    title: 'Developer Experience Engineer',
    company: 'Supabase',
    location: 'Remote (Worldwide)',
    salaryRange: '$140,000 - $170,000',
    status: 'INTERVIEWING',
    activityDaysAgo: 12,
    createdDaysAgo: 28,
    notes: 'Waiting on the hiring manager after round 2 — chase this week.',
    timeline: [
      { type: 'AUTO', title: 'Job added', description: 'Added to WISHLIST', daysAgo: 28 },
      { type: 'AUTO', title: 'Status changed to APPLIED', description: 'WISHLIST → APPLIED', daysAgo: 25 },
      { type: 'AUTO', title: 'Status changed to INTERVIEWING', description: 'APPLIED → INTERVIEWING', daysAgo: 14 },
      { type: 'MANUAL', title: 'Round 2: architecture chat', description: 'Went well. Told to expect an answer within a week.', daysAgo: 12 },
    ],
  },
  {
    key: 'railway',
    title: 'Platform Engineer',
    company: 'Railway',
    location: 'Remote (US)',
    status: 'INTERVIEWING',
    activityDaysAgo: 5,
    createdDaysAgo: 19,
    timeline: [
      { type: 'AUTO', title: 'Job added', description: 'Added to WISHLIST', daysAgo: 19 },
      { type: 'AUTO', title: 'Status changed to APPLIED', description: 'WISHLIST → APPLIED', daysAgo: 15 },
      { type: 'AUTO', title: 'Status changed to INTERVIEWING', description: 'APPLIED → INTERVIEWING', daysAgo: 5 },
    ],
    contacts: [
      { contact: 'Nina Patel', channel: 'OTHER', status: 'REFERRED', daysAgo: 17, notes: 'Referred via a mutual friend at the Discord meetup.' },
    ],
  },

  // ---- OFFER ----
  {
    key: 'cloudflare',
    title: 'Senior Software Engineer, Workers',
    company: 'Cloudflare',
    location: 'Austin, TX',
    salaryRange: '$190,000 - $230,000',
    status: 'OFFER',
    activityDaysAgo: 2,
    createdDaysAgo: 45,
    notes: 'Offer expires in 7 days. Negotiating equity.',
    timeline: [
      { type: 'AUTO', title: 'Job added', description: 'Added to WISHLIST', daysAgo: 45 },
      { type: 'AUTO', title: 'Status changed to APPLIED', description: 'WISHLIST → APPLIED', daysAgo: 41 },
      { type: 'AUTO', title: 'Status changed to INTERVIEWING', description: 'APPLIED → INTERVIEWING', daysAgo: 30 },
      { type: 'AUTO', title: 'Status changed to OFFER', description: 'INTERVIEWING → OFFER', daysAgo: 2 },
      { type: 'MANUAL', title: 'Verbal offer', description: '$205k base + equity. Written offer arriving tomorrow.', daysAgo: 2 },
    ],
  },
  {
    key: 'sentry',
    title: 'Software Engineer, Frontend',
    company: 'Sentry',
    location: 'Remote (US)',
    salaryRange: '$165,000 - $195,000',
    status: 'OFFER',
    activityDaysAgo: 8,
    createdDaysAgo: 52,
    notes: 'Lower comp than Cloudflare but better team fit.',
    timeline: [
      { type: 'AUTO', title: 'Job added', description: 'Added to WISHLIST', daysAgo: 52 },
      { type: 'AUTO', title: 'Status changed to INTERVIEWING', description: 'APPLIED → INTERVIEWING', daysAgo: 33 },
      { type: 'AUTO', title: 'Status changed to OFFER', description: 'INTERVIEWING → OFFER', daysAgo: 8 },
    ],
  },

  // ---- REJECTED / ARCHIVED ----
  {
    key: 'airbnb',
    title: 'Staff Frontend Engineer',
    company: 'Airbnb',
    location: 'Remote (US)',
    salaryRange: '$210,000 - $250,000',
    status: 'REJECTED',
    activityDaysAgo: 11,
    createdDaysAgo: 38,
    notes: 'Rejected after the system design round — brush up on caching strategies.',
    timeline: [
      { type: 'AUTO', title: 'Job added', description: 'Added to WISHLIST', daysAgo: 38 },
      { type: 'AUTO', title: 'Status changed to INTERVIEWING', description: 'APPLIED → INTERVIEWING', daysAgo: 24 },
      { type: 'AUTO', title: 'Status changed to REJECTED', description: 'INTERVIEWING → REJECTED', daysAgo: 11 },
    ],
  },
  {
    key: 'coinbase',
    title: 'Backend Engineer',
    company: 'Coinbase',
    location: 'Remote (US)',
    status: 'REJECTED',
    activityDaysAgo: 26,
    createdDaysAgo: 44,
    timeline: [
      { type: 'AUTO', title: 'Job added', description: 'Added to WISHLIST', daysAgo: 44 },
      { type: 'AUTO', title: 'Status changed to REJECTED', description: 'APPLIED → REJECTED', daysAgo: 26 },
    ],
  },
  {
    key: 'oldstartup',
    title: 'Founding Engineer',
    company: 'Halcyon Labs',
    location: 'Hybrid — Berlin',
    salaryRange: '€90,000 + 1.5% equity',
    status: 'ARCHIVED',
    activityDaysAgo: 60,
    createdDaysAgo: 70,
    notes: 'Company paused hiring. Archived.',
    timeline: [
      { type: 'AUTO', title: 'Job added', description: 'Added to WISHLIST', daysAgo: 70 },
      { type: 'AUTO', title: 'Status changed to ARCHIVED', description: 'APPLIED → ARCHIVED', daysAgo: 60 },
    ],
  },
]

const PROFILE: ProfileContent = {
  basics: {
    name: 'Jordan Avery',
    email: EMAIL,
    phone: '+1 (415) 555-0142',
    location: 'Austin, TX',
    links: [
      { label: 'GitHub', url: 'https://github.com/jordanavery' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/jordanavery' },
      { label: 'Portfolio', url: 'https://jordanavery.dev' },
    ],
  },
  summary:
    'Full-stack engineer with 6 years building product-facing web applications. Comfortable owning a feature from schema to pixel, and partial to small teams that ship weekly.',
  experience: [
    {
      company: 'Northwind Software',
      role: 'Senior Software Engineer',
      employmentType: 'full-time',
      location: 'Remote',
      startDate: { month: 3, year: 2022 },
      endDate: null,
      current: true,
      bullets: [
        'Led the migration of a 200k-LOC Rails monolith frontend to React + TypeScript, cutting median page load from 3.1s to 900ms.',
        'Designed the multi-tenant billing service (Node, Postgres) handling $4M ARR with zero reconciliation incidents in 18 months.',
        'Mentored 4 engineers; introduced the RFC process the team still uses for cross-cutting changes.',
      ],
    },
    {
      company: 'Bright Harbor',
      role: 'Software Engineer',
      employmentType: 'full-time',
      location: 'Austin, TX',
      startDate: { month: 7, year: 2020 },
      endDate: { month: 2, year: 2022 },
      current: false,
      bullets: [
        'Built the customer-facing analytics dashboard (React, D3) used daily by 12k accounts.',
        'Cut CI wall time 60% by parallelizing the test suite and caching Docker layers.',
      ],
    },
    {
      company: 'Cobalt Interactive',
      role: 'Junior Developer',
      employmentType: 'full-time',
      location: 'Austin, TX',
      startDate: { month: 6, year: 2019 },
      endDate: { month: 6, year: 2020 },
      current: false,
      bullets: ['Shipped marketing sites and internal tools in Vue and Laravel for a dozen agency clients.'],
    },
  ],
  projects: [
    {
      name: 'JobVault',
      role: 'Creator',
      description: 'Ghost-proof job application tracker with an AI résumé assistant.',
      technologies: ['Next.js', 'Express', 'Drizzle', 'Postgres', 'Gemini'],
      bullets: [
        'Kanban pipeline with a live-derived "ghost meter" that surfaces stalled applications.',
        'Chrome extension that captures a posting from LinkedIn or Indeed in one click.',
      ],
      links: [{ label: 'Repo', url: 'https://github.com/jordanavery/job-vault' }],
      startDate: { month: 1, year: 2026 },
      endDate: null,
      inProgress: true,
    },
    {
      name: 'Tidepool',
      role: 'Maintainer',
      description: 'Tiny reactive state library for vanilla TS apps.',
      technologies: ['TypeScript', 'Vitest'],
      bullets: ['1.2k GitHub stars, zero dependencies, 3kb gzipped.'],
      links: [{ label: 'Repo', url: 'https://github.com/jordanavery/tidepool' }],
      startDate: { month: 5, year: 2023 },
      endDate: { month: 11, year: 2023 },
      inProgress: false,
    },
  ],
  skills: [
    { category: 'Languages', items: ['TypeScript', 'JavaScript', 'Python', 'SQL', 'Go'] },
    { category: 'Frontend', items: ['React', 'Next.js', 'Tailwind CSS', 'TanStack Query', 'Vue'] },
    { category: 'Backend', items: ['Node.js', 'Express', 'PostgreSQL', 'Drizzle', 'Redis'] },
    { category: 'Infrastructure', items: ['Docker', 'GitHub Actions', 'AWS', 'Terraform'] },
  ],
  education: [
    {
      degree: 'B.S. Computer Science',
      institution: 'University of Texas at Austin',
      fieldOfStudy: 'Computer Science',
      location: 'Austin, TX',
      startDate: { month: 8, year: 2015 },
      endDate: { month: 5, year: 2019 },
      current: false,
      grade: '3.7 GPA',
      bullets: ['Teaching assistant for Data Structures (2 semesters).'],
    },
  ],
}

/** Persona = a narrowed slice of the master profile. */
function personaFrom(overrides: Partial<ProfileContent>): ProfileContent {
  return { ...PROFILE, ...overrides }
}

const RESUME_CONTENT: ResumeContent = {
  basics: {
    name: 'Jordan Avery',
    email: EMAIL,
    phone: '+1 (415) 555-0142',
    location: 'Austin, TX',
    links: [
      { label: 'GitHub', url: 'https://github.com/jordanavery' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/jordanavery' },
    ],
  },
  summary:
    'Full-stack engineer with 6 years shipping product-facing web applications in TypeScript, React, and Node. Strongest where product, performance, and data modeling meet.',
  experience: [
    {
      company: 'Northwind Software',
      title: 'Senior Software Engineer',
      date: 'Mar 2022 – Present',
      bullets: [
        'Led a 200k-LOC frontend migration to **React + TypeScript**, cutting median page load 3.1s → 900ms.',
        'Designed a multi-tenant billing service (Node, Postgres) supporting $4M ARR with zero reconciliation incidents.',
        'Mentored 4 engineers and introduced the team RFC process.',
      ],
    },
    {
      company: 'Bright Harbor',
      title: 'Software Engineer',
      date: 'Jul 2020 – Feb 2022',
      bullets: [
        'Built a customer-facing analytics dashboard (React, D3) used daily by 12k accounts.',
        'Reduced CI wall time 60% via test parallelism and Docker layer caching.',
      ],
    },
  ],
  projects: [
    {
      name: 'JobVault',
      tagline: 'Ghost-proof job tracker with an AI résumé assistant',
      url: 'https://github.com/jordanavery/job-vault',
      bullets: ['Kanban pipeline with a live-derived ghost meter.', 'One-click capture Chrome extension (MV3).'],
    },
  ],
  skills: [
    { category: 'Languages', items: ['TypeScript', 'JavaScript', 'Python', 'SQL', 'Go'] },
    { category: 'Frontend', items: ['React', 'Next.js', 'Tailwind CSS', 'TanStack Query'] },
    { category: 'Backend', items: ['Node.js', 'Express', 'PostgreSQL', 'Drizzle', 'Redis'] },
  ],
  education: [
    { degree: 'B.S. Computer Science', institution: 'University of Texas at Austin', period: '2015 – 2019' },
  ],
}

const LETTER = (company: string, role: string, hook: string): string =>
  `Dear ${company} Hiring Team,\n\nI'm applying for the **${role}** role. ${hook}\n\nAt Northwind Software I led the migration of a 200k-line frontend to React and TypeScript, which cut median page load from 3.1 seconds to 900 milliseconds — the kind of work that only lands if you're willing to do the unglamorous measurement first. Before that I built an analytics dashboard at Bright Harbor that 12,000 accounts opened every morning, so I've learned what "the data has to be right" actually costs.\n\nWhat draws me to ${company} is that the product is opinionated. I do my best work on small teams that ship weekly and argue about the details in public.\n\nI'd welcome the chance to talk.\n\nSincerely,\nJordan Avery`

export async function seedDemo(): Promise<{ userId: string; email: string; jobs: number }> {
  const db = getDb()

  // 1. User (create or reset password so the login is always known)
  const passwordHash = await hashSecret(PASSWORD)
  const existing = await db.select().from(users).where(eq(users.email, EMAIL)).limit(1)
  let userId: string
  if (existing[0]) {
    userId = existing[0].id
    await db.update(users).set({ passwordHash, name: 'Jordan Avery' }).where(eq(users.id, userId))
  } else {
    const [row] = await db
      .insert(users)
      .values({ email: EMAIL, name: 'Jordan Avery', passwordHash, isEmailVerified: true })
      .returning()
    if (!row) throw new Error('seed: user insert returned no row')
    userId = row.id
  }

  // 2. Wipe this user's data. timeline/reminders/contacts cascade from jobs;
  // generated résumés cascade from personas — but job-less rows (adhoc cover
  // letters, persona-only résumés) do not, so delete those explicitly first.
  await db.delete(coverLetters).where(eq(coverLetters.userId, userId))
  await db.delete(generatedResumes).where(eq(generatedResumes.userId, userId))
  await db.delete(notifications).where(eq(notifications.userId, userId))
  await db.delete(jobs).where(eq(jobs.userId, userId))
  await db.delete(personas).where(eq(personas.userId, userId))
  await db.delete(userProfiles).where(eq(userProfiles.userId, userId))

  // 3. Master profile
  await db.insert(userProfiles).values({ userId, content: PROFILE })

  // 4. Personas
  const personaRows = await db
    .insert(personas)
    .values([
      {
        userId,
        name: 'Frontend Specialist',
        data: personaFrom({
          summary:
            'Frontend-leaning full-stack engineer who has spent six years on design systems, performance, and the unglamorous parts of accessibility.',
          skills: [
            { category: 'Frontend', items: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'TanStack Query'] },
            { category: 'Tooling', items: ['Vite', 'Vitest', 'Playwright', 'Storybook'] },
          ],
        }),
      },
      {
        userId,
        name: 'Backend / Platform',
        data: personaFrom({
          summary:
            'Backend engineer focused on data modeling, billing correctness, and keeping deploys boring.',
          skills: [
            { category: 'Backend', items: ['Node.js', 'Express', 'PostgreSQL', 'Drizzle', 'Redis', 'Go'] },
            { category: 'Infrastructure', items: ['Docker', 'Terraform', 'AWS', 'GitHub Actions'] },
          ],
          projects: [],
        }),
      },
    ])
    .returning()
  const [frontendPersona, backendPersona] = personaRows
  if (!frontendPersona || !backendPersona) throw new Error('seed: persona insert returned too few rows')

  // 5. Jobs (+ timeline, contacts) — kanbanOrder ascending within each column
  const orderByStatus: Record<string, number> = {}
  const jobRows = await db
    .insert(jobs)
    .values(
      JOB_SEEDS.map((s) => {
        const order = (orderByStatus[s.status] = (orderByStatus[s.status] ?? 0) + 1000)
        return {
          userId,
          title: s.title,
          company: s.company,
          location: s.location,
          salaryRange: s.salaryRange ?? null,
          sourceUrl: `https://jobs.example.com/${s.company.toLowerCase().replace(/[^a-z]+/g, '-')}/${s.key}`,
          snapshotMarkdown: DESC(s.title, s.company),
          status: s.status,
          kanbanOrder: order,
          createdAt: days(s.createdDaysAgo),
          updatedAt: days(s.activityDaysAgo),
          lastActivityAt: days(s.activityDaysAgo),
          notes: s.notes ?? null,
        }
      }),
    )
    .returning()

  const byKey = new Map<string, JobRow>()
  JOB_SEEDS.forEach((s, i) => {
    const row = jobRows[i]
    if (!row) throw new Error('seed: job insert row count mismatch')
    byKey.set(s.key, row)
  })
  const jobId = (key: string): string => {
    const row = byKey.get(key)
    if (!row) throw new Error(`seed: unknown job key ${key}`)
    return row.id
  }

  await db.insert(timelineEvents).values(
    JOB_SEEDS.flatMap((s) =>
      s.timeline.map((e) => ({
        userId,
        jobId: jobId(s.key),
        type: e.type,
        title: e.title,
        description: e.description ?? null,
        createdAt: days(e.daysAgo),
        updatedAt: days(e.daysAgo),
      })),
    ),
  )

  const contactValues = JOB_SEEDS.flatMap((s) =>
    (s.contacts ?? []).map((c) => ({
      userId,
      jobId: jobId(s.key),
      contact: c.contact,
      channel: c.channel,
      status: c.status,
      reachedOutAt: days(c.daysAgo),
      notes: c.notes ?? null,
      createdAt: days(c.daysAgo),
      updatedAt: days(c.daysAgo),
    })),
  )
  if (contactValues.length > 0) await db.insert(jobContacts).values(contactValues)

  // 6. Reminders: overdue, due today, upcoming, already completed
  await db.insert(reminders).values([
    { userId, jobId: jobId('datadog'), message: 'Send a final follow-up before archiving', remindAt: days(2), isCompleted: false },
    { userId, jobId: jobId('supabase'), message: 'Chase the hiring manager about round 2', remindAt: hours(3), isCompleted: false },
    { userId, jobId: jobId('anthropic'), message: 'Prep system design for the onsite loop', remindAt: inDays(2), isCompleted: false },
    { userId, jobId: jobId('cloudflare'), message: 'Respond to the offer (expires soon)', remindAt: inDays(5), isCompleted: false },
    { userId, jobId: jobId('notion'), message: 'Thank Priya for the referral', remindAt: days(1), isCompleted: true },
  ])

  // 7. Notifications: mix of types, read + unread
  await db.insert(notifications).values([
    { userId, type: 'GHOST_ALERT', message: 'Datadog — Backend Engineer, Ingestion has had no activity for 23 days.', isRead: false, relatedJobId: jobId('datadog'), createdAt: days(1), updatedAt: days(1) },
    { userId, type: 'GHOST_ALERT', message: 'Shopify — Senior Software Engineer has had no activity for 34 days.', isRead: false, relatedJobId: jobId('shopify'), createdAt: days(1), updatedAt: days(1) },
    { userId, type: 'REMINDER', message: 'Reminder: Chase the hiring manager about round 2 (Supabase)', isRead: false, relatedJobId: jobId('supabase'), createdAt: days(0.2), updatedAt: days(0.2) },
    { userId, type: 'STATUS_CHANGE', message: 'Cloudflare moved to OFFER 🎉', isRead: true, relatedJobId: jobId('cloudflare'), createdAt: days(2), updatedAt: days(2) },
    { userId, type: 'STATUS_CHANGE', message: 'Airbnb moved to REJECTED', isRead: true, relatedJobId: jobId('airbnb'), createdAt: days(11), updatedAt: days(11) },
    { userId, type: 'GENERAL', message: 'Welcome to JobVault — your demo workspace is ready.', isRead: true, relatedJobId: null, createdAt: days(70), updatedAt: days(70) },
  ])

  // 8. Generated résumés: one job-tailored, one persona-only
  await db.insert(generatedResumes).values([
    { userId, personaId: frontendPersona.id, jobId: jobId('anthropic'), title: 'Anthropic — Full Stack Engineer', instructions: 'Emphasize product sense and TypeScript depth.', content: RESUME_CONTENT, createdAt: days(18), updatedAt: days(18) },
    { userId, personaId: frontendPersona.id, jobId: jobId('figma'), title: 'Figma — Design Systems', instructions: 'Lead with design-system and accessibility work.', content: RESUME_CONTENT, createdAt: days(10), updatedAt: days(10) },
    { userId, personaId: backendPersona.id, jobId: null, title: 'General backend résumé', instructions: null, content: RESUME_CONTENT, createdAt: days(30), updatedAt: days(30) },
  ])

  // 9. Cover letters: two tracked, one ad-hoc (pasted JD, never on the board)
  await db.insert(coverLetters).values([
    { userId, jobId: jobId('anthropic'), adhocJob: null, personaId: frontendPersona.id, title: 'Anthropic — Full Stack Engineer', instructions: 'Warm but direct. No superlatives.', bodyMarkdown: LETTER('Anthropic', 'Full Stack Engineer, Product', "I've been building on top of your API for a year, so this is less a career move than a shortening of the feedback loop."), createdAt: days(18), updatedAt: days(18) },
    { userId, jobId: jobId('notion'), adhocJob: null, personaId: frontendPersona.id, title: 'Notion — Growth', instructions: null, bodyMarkdown: LETTER('Notion', 'Software Engineer, Growth', 'Growth engineering is the rare spot where shipping fast and measuring honestly are the same job.'), createdAt: days(2), updatedAt: days(2) },
    { userId, jobId: null, adhocJob: { title: 'Senior Engineer, Payments', company: 'Wise', description: 'Own the payments ledger and reconciliation pipeline. TypeScript, Postgres, event sourcing.' }, personaId: backendPersona.id, title: 'Wise — Payments (pasted JD)', instructions: 'Lead with the billing-service work.', bodyMarkdown: LETTER('Wise', 'Senior Engineer, Payments', 'Money code is the one place where "mostly correct" is just a slower kind of wrong.'), createdAt: days(6), updatedAt: days(6) },
  ])

  logger.info(`seeded ${jobRows.length} jobs for ${EMAIL}`)
  return { userId, email: EMAIL, jobs: jobRows.length }
}

const isDirectRun = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href

if (isDirectRun) {
  try {
    const result = await seedDemo()
    // eslint-disable-next-line no-console
    console.log(`\n✅ Seeded ${result.jobs} jobs.\n   Login: ${result.email} / ${PASSWORD}\n`)
  } catch (err) {
    logger.error({ err }, 'seed failed')
    process.exitCode = 1
  } finally {
    await closeDb()
  }
}
