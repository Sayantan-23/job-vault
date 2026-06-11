// frontend-next/src/components/personas/persona-education-section.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PersonaEducationSection } from './persona-education-section'
import type { ProfileEducation } from '@/types/profile'

const EDU_BTECH: ProfileEducation = {
  id: 'edu1',
  degree: 'B.Tech',
  institution: 'IIT Delhi',
  fieldOfStudy: 'Computer Science',
  startDate: { month: null, year: 2018 },
  endDate: { month: null, year: 2022 },
  current: false,
  bullets: [],
}
const EDU_MS: ProfileEducation = {
  id: 'edu2',
  degree: 'MS',
  institution: 'Stanford',
  startDate: { month: 9, year: 2022 },
  endDate: null,
  current: true,
  bullets: [],
}
const PROFILE_EDUCATION: ProfileEducation[] = [EDU_BTECH, EDU_MS]

function renderSection({
  value = [],
  profileEducation = PROFILE_EDUCATION,
}: {
  value?: ProfileEducation[]
  profileEducation?: ProfileEducation[]
} = {}) {
  const onChange = vi.fn()
  render(
    <PersonaEducationSection value={value} onChange={onChange} profileEducation={profileEducation} />,
  )
  return { onChange }
}

describe('PersonaEducationSection', () => {
  it('renders picked entries as read-only rows with degree, institution and formatted dates', () => {
    renderSection({ value: [EDU_BTECH] })
    const rows = within(screen.getByRole('list', { name: /included education/i }))
    expect(rows.getByText('B.Tech — IIT Delhi')).toBeInTheDocument()
    expect(rows.getByText('Computer Science · 2018 – 2022')).toBeInTheDocument()
    // Read-only: no inputs for the entry fields.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('formats a current entry as "Mon YYYY – Present" without a field-of-study prefix', () => {
    renderSection({ value: [EDU_MS] })
    const rows = within(screen.getByRole('list', { name: /included education/i }))
    expect(rows.getByText('MS — Stanford')).toBeInTheDocument()
    expect(rows.getByText('Sep 2022 – Present')).toBeInTheDocument()
  })

  it('removes an entry via its Remove button', async () => {
    const { onChange } = renderSection({ value: [EDU_BTECH, EDU_MS] })
    await userEvent.click(screen.getByRole('button', { name: /remove b\.tech — iit delhi/i }))
    expect(onChange).toHaveBeenCalledWith([EDU_MS])
  })

  it('checking a profile entry in the picker adds a deep copy that keeps the id', async () => {
    const { onChange } = renderSection({ value: [] })
    await userEvent.click(screen.getByRole('checkbox', { name: /B\.Tech — IIT Delhi/ }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]?.[0] as ProfileEducation[]
    expect(next).toHaveLength(1)
    expect(next[0]).not.toBe(EDU_BTECH)
    expect(next[0]).toEqual(EDU_BTECH)
    expect(next[0]?.id).toBe('edu1')
  })

  it('reflects draft membership as checked picker rows and unchecking removes by id', async () => {
    const { onChange } = renderSection({ value: [EDU_BTECH] })
    const picked = screen.getByRole('checkbox', { name: /B\.Tech — IIT Delhi/ }) as HTMLInputElement
    const unpicked = screen.getByRole('checkbox', { name: /MS — Stanford/ }) as HTMLInputElement
    expect(picked.checked).toBe(true)
    expect(unpicked.checked).toBe(false)
    await userEvent.click(picked)
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('offers no add-custom affordance (pick-only)', () => {
    renderSection({ value: [] })
    expect(screen.queryByRole('button', { name: /add custom/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add education/i })).not.toBeInTheDocument()
  })

  it('links to the profile page to manage education', () => {
    renderSection()
    const link = screen.getByRole('link', { name: /manage education in your profile/i })
    expect(link).toHaveAttribute('href', '/app/profile')
  })

  it('shows the picker empty hint when the profile has no education', () => {
    renderSection({ profileEducation: [] })
    expect(screen.getByText(/no education in your profile yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})
