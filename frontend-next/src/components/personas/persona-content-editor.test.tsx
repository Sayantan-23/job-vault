// frontend-next/src/components/personas/persona-content-editor.test.tsx
import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PersonaContentEditor } from './persona-content-editor'
import { emptyProfileContent } from '@/lib/profile'
import type { ProfileContent } from '@/types/profile'

const buildProfile = (): ProfileContent => ({
  basics: { name: 'Ada Lovelace', email: 'ada@example.com', phone: '', location: 'London', links: [] },
  summary: 'Engineer.',
  experience: [
    {
      id: 'exp1',
      company: 'Stripe',
      role: 'Senior Engineer',
      startDate: { month: 1, year: 2022 },
      endDate: null,
      current: true,
      bullets: ['Shipped payments'],
    },
  ],
  projects: [
    {
      id: 'proj1',
      name: 'JobVault',
      description: 'Job tracker',
      technologies: ['TypeScript'],
      bullets: [],
      links: [],
      startDate: null,
      endDate: null,
      inProgress: false,
    },
  ],
  skills: [{ id: 'skill1', category: 'Languages', items: ['TypeScript', 'Go'] }],
  education: [
    {
      id: 'edu1',
      degree: 'B.Tech',
      institution: 'IIT Delhi',
      startDate: { month: null, year: 2018 },
      endDate: { month: null, year: 2022 },
      current: false,
      bullets: [],
    },
  ],
})

// The editor is controlled; the harness gives the pick → edit flow real state.
function Harness({ profile, initial }: { profile: ProfileContent; initial?: ProfileContent }) {
  const [value, setValue] = useState(initial ?? emptyProfileContent())
  return <PersonaContentEditor value={value} onChange={setValue} profile={profile} />
}

describe('PersonaContentEditor', () => {
  it('renders all six section headings and a picker per pickable section', () => {
    render(
      <PersonaContentEditor value={emptyProfileContent()} onChange={vi.fn()} profile={buildProfile()} />,
    )
    for (const h of ['Basics', 'Summary', 'Experience', 'Projects', 'Skills', 'Education']) {
      expect(screen.getByRole('heading', { name: h })).toBeInTheDocument()
    }
    expect(screen.getByRole('group', { name: 'Profile experience picker' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Profile projects picker' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Profile skills picker' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Profile education picker' })).toBeInTheDocument()
    // Picker row titles per the plan: role @ company / project name / category + count.
    expect(screen.getByText('Senior Engineer @ Stripe')).toBeInTheDocument()
    expect(screen.getByText('JobVault')).toBeInTheDocument()
    expect(screen.getByText('Languages')).toBeInTheDocument()
    expect(screen.getByText('2 skills')).toBeInTheDocument()
  })

  it('picking a profile experience makes it an editable copy in the section editor', async () => {
    render(<Harness profile={buildProfile()} />)
    expect(screen.queryByLabelText('Experience 1 company')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: /Senior Engineer @ Stripe/ }))
    expect(screen.getByLabelText('Experience 1 company')).toHaveValue('Stripe')
    expect(screen.getByRole('checkbox', { name: /Senior Engineer @ Stripe/ })).toBeChecked()
  })

  it('editing a picked copy calls onChange without mutating the profile item', async () => {
    const profile = buildProfile()
    const onChange = vi.fn()
    const draft: ProfileContent = {
      ...emptyProfileContent(),
      experience: structuredClone(profile.experience),
    }
    render(<PersonaContentEditor value={draft} onChange={onChange} profile={profile} />)
    await userEvent.type(screen.getByLabelText('Experience 1 company'), 'X')
    const next = onChange.mock.calls.at(-1)?.[0] as ProfileContent
    expect(next.experience[0]?.company).toBe('StripeX')
    expect(profile.experience[0]?.company).toBe('Stripe')
  })

  it('unchecking a picked item removes it from the draft by id', async () => {
    const profile = buildProfile()
    const onChange = vi.fn()
    const draft: ProfileContent = {
      ...emptyProfileContent(),
      experience: structuredClone(profile.experience),
    }
    render(<PersonaContentEditor value={draft} onChange={onChange} profile={profile} />)
    await userEvent.click(screen.getByRole('checkbox', { name: /Senior Engineer @ Stripe/ }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect((onChange.mock.calls[0]?.[0] as ProfileContent).experience).toEqual([])
  })

  it('Add custom appends an empty entry in experience, projects, and skills', async () => {
    const onChange = vi.fn()
    render(
      <PersonaContentEditor value={emptyProfileContent()} onChange={onChange} profile={buildProfile()} />,
    )

    await userEvent.click(screen.getByRole('button', { name: /add custom experience/i }))
    let next = onChange.mock.calls.at(-1)?.[0] as ProfileContent
    expect(next.experience).toHaveLength(1)
    expect(next.experience[0]?.company).toBe('')
    expect(next.experience[0]?.id).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: /add custom project/i }))
    next = onChange.mock.calls.at(-1)?.[0] as ProfileContent
    expect(next.projects).toHaveLength(1)
    expect(next.projects[0]?.name).toBe('')
    expect(next.projects[0]?.id).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: /add custom skill group/i }))
    next = onChange.mock.calls.at(-1)?.[0] as ProfileContent
    expect(next.skills).toHaveLength(1)
    expect(next.skills[0]?.id).toBeTruthy()
  })

  it('education is pick-only: no add-custom affordance, with a manage-in-profile link', () => {
    render(
      <PersonaContentEditor value={emptyProfileContent()} onChange={vi.fn()} profile={buildProfile()} />,
    )
    expect(screen.queryByRole('button', { name: /add custom education/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add education/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /manage education in your profile/i })).toHaveAttribute(
      'href',
      '/app/profile',
    )
  })

  it('edits the summary', async () => {
    const onChange = vi.fn()
    render(
      <PersonaContentEditor value={emptyProfileContent()} onChange={onChange} profile={buildProfile()} />,
    )
    await userEvent.type(screen.getByLabelText('Professional summary'), 'X')
    expect((onChange.mock.calls.at(-1)?.[0] as ProfileContent).summary).toBe('X')
  })
})
