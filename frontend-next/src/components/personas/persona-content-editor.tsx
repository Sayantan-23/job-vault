// frontend-next/src/components/personas/persona-content-editor.tsx
'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ProfileSection } from '@/components/profile/profile-section'
import { ProfileBasicsEditor } from '@/components/profile/profile-basics-editor'
import { ProfileExperienceEditor } from '@/components/profile/profile-experience-editor'
import { ProfileProjectsEditor } from '@/components/profile/profile-projects-editor'
import { ProfileSkillsEditor } from '@/components/profile/profile-skills-editor'
import { PersonaItemPicker } from './persona-item-picker'
import { PersonaEducationSection } from './persona-education-section'
import { formatMonthYearRange, newExperience, newProject, newSkillGroup } from '@/lib/profile'
import type {
  ProfileContent,
  ProfileExperience,
  ProfileProject,
  ProfileSkillGroup,
} from '@/types/profile'

// Rich persona editor: the same ProfileSection layout as the master ProfileEditor,
// with a profile-item picker above each pickable section. Picked items are deep
// copies (ids kept, so picker checkboxes reflect draft membership) edited with the
// 7a section editors; education is pick-only (managed on /app/profile).
interface Props {
  value: ProfileContent
  onChange: (next: ProfileContent) => void
  profile: ProfileContent
}

const idSet = (items: { id?: string }[]): Set<string> =>
  new Set(items.map((item) => item.id).filter((id): id is string => id !== undefined))

const removeByIds = <T extends { id?: string }>(items: T[], ids: string[]): T[] =>
  items.filter((item) => item.id === undefined || !ids.includes(item.id))

export function PersonaContentEditor({ value, onChange, profile }: Props) {
  const patch = (partial: Partial<ProfileContent>) => onChange({ ...value, ...partial })

  return (
    <div>
      <ProfileSection title="Basics" description="Name, contact details, and links for this persona.">
        <ProfileBasicsEditor value={value.basics} onChange={(basics) => patch({ basics })} />
      </ProfileSection>

      <ProfileSection title="Summary" description="A short professional pitch shown at the top of a résumé.">
        <Textarea
          aria-label="Professional summary"
          placeholder="A short summary of your focus, strengths, and what you're looking for."
          rows={4}
          value={value.summary}
          onChange={(e) => patch({ summary: e.target.value })}
        />
      </ProfileSection>

      <ProfileSection title="Experience" description="Pick roles from your profile, or add custom ones.">
        <div className="space-y-4">
          <PersonaItemPicker<ProfileExperience>
            label="Profile experience picker"
            profileItems={profile.experience}
            selectedIds={idSet(value.experience)}
            getTitle={(e) => `${e.role} @ ${e.company}`}
            getSubtitle={(e) => formatMonthYearRange(e.startDate, e.endDate, e.current)}
            onAdd={(items) => patch({ experience: [...value.experience, ...items] })}
            onRemove={(ids) => patch({ experience: removeByIds(value.experience, ids) })}
            emptyHint="No experience in your profile yet — add it on your Profile page."
          />
          <AddCustomButton
            section="experience"
            onClick={() => patch({ experience: [...value.experience, newExperience()] })}
          />
          <ProfileExperienceEditor
            value={value.experience}
            onChange={(experience) => patch({ experience })}
          />
        </div>
      </ProfileSection>

      <ProfileSection title="Projects" description="Pick projects from your profile, or add custom ones.">
        <div className="space-y-4">
          <PersonaItemPicker<ProfileProject>
            label="Profile projects picker"
            profileItems={profile.projects}
            selectedIds={idSet(value.projects)}
            getTitle={(p) => p.name}
            getSubtitle={(p) => p.description ?? ''}
            onAdd={(items) => patch({ projects: [...value.projects, ...items] })}
            onRemove={(ids) => patch({ projects: removeByIds(value.projects, ids) })}
            emptyHint="No projects in your profile yet — add them on your Profile page."
          />
          <AddCustomButton
            section="project"
            onClick={() => patch({ projects: [...value.projects, newProject()] })}
          />
          <ProfileProjectsEditor value={value.projects} onChange={(projects) => patch({ projects })} />
        </div>
      </ProfileSection>

      <ProfileSection title="Skills" description="Pick skill groups from your profile, or add custom ones.">
        <div className="space-y-4">
          <PersonaItemPicker<ProfileSkillGroup>
            label="Profile skills picker"
            profileItems={profile.skills}
            selectedIds={idSet(value.skills)}
            getTitle={(g) => g.category}
            getSubtitle={(g) => `${g.items.length} ${g.items.length === 1 ? 'skill' : 'skills'}`}
            onAdd={(items) => patch({ skills: [...value.skills, ...items] })}
            onRemove={(ids) => patch({ skills: removeByIds(value.skills, ids) })}
            emptyHint="No skills in your profile yet — add them on your Profile page."
          />
          <AddCustomButton
            section="skill group"
            onClick={() => patch({ skills: [...value.skills, newSkillGroup()] })}
          />
          <ProfileSkillsEditor value={value.skills} onChange={(skills) => patch({ skills })} />
        </div>
      </ProfileSection>

      <ProfileSection title="Education" description="Picked from your profile — manage entries there.">
        <PersonaEducationSection
          value={value.education}
          onChange={(education) => patch({ education })}
          profileEducation={profile.education}
        />
      </ProfileSection>
    </div>
  )
}

function AddCustomButton({ section, onClick }: { section: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={`Add custom ${section}`}
      onClick={onClick}
    >
      <Plus className="size-4" aria-hidden="true" />
      Add custom
    </Button>
  )
}
