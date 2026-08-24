import type { Metadata } from 'next'
import { Plus } from 'lucide-react'

import { SubpageHeader } from '@/components/web/subpage-header'

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Common questions about JobVault: pricing, the AI, your documents, the Chrome extension, and your account.',
}

// Server component, zero client JS: native <details>/<summary> accordions styled
// by landing.css (.faq / .faq-item / .faq-q / .faq-a / rotating .faq-icon). The
// landing page keeps its own short FAQ; this is the full, grouped version.
const FAQ_GROUPS: Array<{ label: string; items: Array<{ q: string; a: string }> }> = [
  {
    label: 'Product & pricing',
    items: [
      {
        q: 'Is JobVault free?',
        a: 'Yes. Tracking, personas, and the browser extension are all free. AI generation runs on an hourly rate limit, and no card is ever required.',
      },
      {
        q: 'What does JobVault actually do?',
        a: 'It captures job postings, tracks them through your search on a kanban board or list, and keeps a per-job timeline of events with reminders. It also drafts tailored résumés and cover letters from personas you write.',
      },
      {
        q: 'How do I add a job?',
        a: 'Paste a posting URL, or save it in one click with the Chrome extension from any board — LinkedIn, Indeed, Naukri, Greenhouse, or anywhere else. The posting is extracted on demand when you save it.',
      },
      {
        q: 'What is ghost detection?',
        a: 'Every application carries a days-since-activity meter. When one goes cold with no movement, JobVault flags it automatically so stalled applications surface instead of quietly slipping away.',
      },
      {
        q: 'Can I track jobs as a board or a list?',
        a: 'Both. Move applications across statuses on a kanban board, or work the same jobs as a list — whichever fits the moment.',
      },
    ],
  },
  {
    label: 'AI & your data',
    items: [
      {
        q: 'Where does the AI get my information?',
        a: 'From the personas and profile you write or import — nothing else. Drafts use your persona plus the specific job posting, and Google’s Gemini does the generation.',
      },
      {
        q: 'Can I build a persona from an existing résumé?',
        a: 'Yes. Import a résumé PDF and JobVault structures it into a persona you can then edit and reuse.',
      },
      {
        q: 'Does the AI send anything without me?',
        a: 'No. You review and edit every line, and nothing is auto-sent anywhere. Refine actions — humanize, shorten, lengthen, fix grammar — propose a candidate you accept or discard.',
      },
      {
        q: 'Who processes the generation requests?',
        a: 'Generation requests are processed by Google’s Gemini API using your persona and the job posting.',
      },
    ],
  },
  {
    label: 'Documents & export',
    items: [
      {
        q: 'How do I export a résumé?',
        a: 'Résumés export as PDF rendered in your browser, copy as LaTeX, or open directly in Overleaf.',
      },
      {
        q: 'Can I export cover letters?',
        a: 'Yes, cover letters export as PDF.',
      },
      {
        q: 'Are my documents stored as files?',
        a: 'No. There is no server-side file storage — documents are kept as structured content and rendered on demand when you view or export them.',
      },
    ],
  },
  {
    label: 'Extension',
    items: [
      {
        q: 'Which sites does the extension work on?',
        a: 'Any posting page. Extraction happens on demand, so there is no per-site setup — it reads the page you are on when you click save.',
      },
      {
        q: 'How does the extension connect to my account?',
        a: 'Through a revocable API key you create under Settings → Connected apps. Revoke it any time and the extension loses access.',
      },
      {
        q: 'What happens when I save a job twice?',
        a: 'One click saves the posting with its source link, and JobVault de-dupes it against jobs you already saved so you do not get repeats.',
      },
    ],
  },
  {
    label: 'Account',
    items: [
      {
        q: 'How do I sign up?',
        a: 'With an email and password. Sessions run on secure HTTP-only cookies.',
      },
      {
        q: 'Is there a mobile app?',
        a: 'A mobile app for iOS and Android is in development.',
      },
    ],
  },
]

export default function FaqPage() {
  return (
    <main className="subpage">
      <div className="wrap">
        <SubpageHeader
          eyebrow="FAQ"
          title="Frequently asked questions."
          lede="No hype and no fine print — here is how JobVault works, edges included."
        />

        {FAQ_GROUPS.map((group) => (
          <div key={group.label}>
            <span className="eyebrow faq-group-label">{group.label}</span>
            <div className="faq">
              {group.items.map((f) => (
                <details key={f.q} className="faq-item">
                  <summary>
                    <Plus className="faq-icon" aria-hidden="true" />
                    <span className="faq-q">{f.q}</span>
                  </summary>
                  <p className="faq-a">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
