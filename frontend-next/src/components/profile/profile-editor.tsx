// frontend-next/src/components/profile/profile-editor.tsx
'use client'

import { Label } from '@/components/ui/label'
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  )
}

export function ProfileEditor({ value, onChange }: Props) {
  const patch = (partial: Partial<ProfileContent>) => onChange({ ...value, ...partial })

  return (
    <div className="space-y-10">
      <Section title="Basics">
        <ProfileBasicsEditor value={value.basics} onChange={(basics) => patch({ basics })} />
      </Section>
      <Section title="Summary">
        <div className="space-y-1.5">
          <Label htmlFor="pe-summary">Professional summary</Label>
          <Textarea
            id="pe-summary"
            aria-label="Professional summary"
            placeholder="A short summary of your focus, strengths, and what you're looking for."
            rows={4}
            value={value.summary}
            onChange={(e) => patch({ summary: e.target.value })}
          />
        </div>
      </Section>
      <Section title="Experience">
        <ProfileExperienceEditor value={value.experience} onChange={(experience) => patch({ experience })} />
      </Section>
      <Section title="Projects">
        <ProfileProjectsEditor value={value.projects} onChange={(projects) => patch({ projects })} />
      </Section>
      <Section title="Skills">
        <ProfileSkillsEditor value={value.skills} onChange={(skills) => patch({ skills })} />
      </Section>
      <Section title="Education">
        <ProfileEducationEditor value={value.education} onChange={(education) => patch({ education })} />
      </Section>
    </div>
  )
}
