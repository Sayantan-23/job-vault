// frontend-next/src/components/profile/profile-editor.tsx
'use client'

import type { ReactNode } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { ProfileBasicsEditor } from './profile-basics-editor'
import { ProfileExperienceEditor } from './profile-experience-editor'
import { ProfileProjectsEditor } from './profile-projects-editor'
import { ProfileSkillsEditor } from './profile-skills-editor'
import { ProfileEducationEditor } from './profile-education-editor'
import type { ProfileContent } from '@/types/profile'

interface Props {
  value: ProfileContent
  onChange: (next: ProfileContent) => void
}

// Two-column "settings" section: meta on the left, fields on the right, with a
// hairline divider between sections. Stacks to one column on narrow screens.
function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="grid gap-x-10 gap-y-4 border-t border-border py-8 first:border-t-0 first:pt-0 sm:grid-cols-[15rem_1fr]">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

export function ProfileEditor({ value, onChange }: Props) {
  const patch = (partial: Partial<ProfileContent>) => onChange({ ...value, ...partial })

  return (
    <div>
      <Section title="Basics" description="Your name, contact details, and links.">
        <ProfileBasicsEditor value={value.basics} onChange={(basics) => patch({ basics })} />
      </Section>

      <Section title="Summary" description="A short professional pitch shown at the top of a résumé.">
        <Textarea
          aria-label="Professional summary"
          placeholder="A short summary of your focus, strengths, and what you're looking for."
          rows={4}
          value={value.summary}
          onChange={(e) => patch({ summary: e.target.value })}
        />
      </Section>

      <Section title="Experience" description="Roles you've held, most recent first.">
        <ProfileExperienceEditor value={value.experience} onChange={(experience) => patch({ experience })} />
      </Section>

      <Section title="Projects" description="Notable projects, with the technologies you used.">
        <ProfileProjectsEditor value={value.projects} onChange={(projects) => patch({ projects })} />
      </Section>

      <Section title="Skills" description="Group them by category, or keep one flat list.">
        <ProfileSkillsEditor value={value.skills} onChange={(skills) => patch({ skills })} />
      </Section>

      <Section title="Education" description="Degrees, schools, and grades.">
        <ProfileEducationEditor value={value.education} onChange={(education) => patch({ education })} />
      </Section>
    </div>
  )
}
