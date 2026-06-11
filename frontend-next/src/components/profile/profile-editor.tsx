// frontend-next/src/components/profile/profile-editor.tsx
'use client'

import { Textarea } from '@/components/ui/textarea'
import { ProfileSection as Section } from './profile-section'
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
