// frontend-next/src/components/personas/persona-item-picker.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PersonaItemPicker } from './persona-item-picker'
import type { ProfileExperience } from '@/types/profile'

const EXPERIENCE: ProfileExperience[] = [
  {
    id: 'e1',
    company: 'Acme',
    role: 'Engineer',
    startDate: { month: 1, year: 2022 },
    endDate: null,
    current: true,
    bullets: ['Did things'],
  },
  {
    id: 'e2',
    company: 'Globex',
    role: 'Intern',
    startDate: { month: 6, year: 2021 },
    endDate: { month: 8, year: 2021 },
    current: false,
    bullets: [],
  },
]

function renderPicker(overrides: Partial<Parameters<typeof PersonaItemPicker<ProfileExperience>>[0]> = {}) {
  const onAdd = vi.fn()
  const onRemove = vi.fn()
  render(
    <PersonaItemPicker<ProfileExperience>
      label="Experience picker"
      profileItems={EXPERIENCE}
      selectedIds={new Set<string>()}
      getTitle={(item) => `${item.role} @ ${item.company}`}
      getSubtitle={(item) => item.company}
      onAdd={onAdd}
      onRemove={onRemove}
      emptyHint="Nothing in your profile yet — add items on your Profile page"
      {...overrides}
    />,
  )
  return { onAdd, onRemove }
}

describe('PersonaItemPicker', () => {
  it('renders one checkbox row per profile item with checked state from selectedIds', () => {
    renderPicker({ selectedIds: new Set(['e1']) })
    expect(screen.getByText('From your profile')).toBeInTheDocument()
    const first = screen.getByRole('checkbox', { name: /Engineer @ Acme/ }) as HTMLInputElement
    const second = screen.getByRole('checkbox', { name: /Intern @ Globex/ }) as HTMLInputElement
    expect(first.checked).toBe(true)
    expect(second.checked).toBe(false)
  })

  it('checking an unselected row calls onAdd with a deep copy that keeps the profile id', async () => {
    const { onAdd, onRemove } = renderPicker()
    await userEvent.click(screen.getByRole('checkbox', { name: /Engineer @ Acme/ }))
    expect(onAdd).toHaveBeenCalledTimes(1)
    const added = onAdd.mock.calls[0]?.[0] as ProfileExperience[]
    expect(added).toHaveLength(1)
    expect(added[0]).not.toBe(EXPERIENCE[0])
    expect(added[0]?.bullets).not.toBe(EXPERIENCE[0]?.bullets)
    expect(added[0]).toEqual(EXPERIENCE[0])
    expect(added[0]?.id).toBe('e1')
    expect(onRemove).not.toHaveBeenCalled()
  })

  it('unchecking a selected row calls onRemove with its id', async () => {
    const { onAdd, onRemove } = renderPicker({ selectedIds: new Set(['e1']) })
    await userEvent.click(screen.getByRole('checkbox', { name: /Engineer @ Acme/ }))
    expect(onRemove).toHaveBeenCalledWith(['e1'])
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('Add all adds deep copies of only the unselected items', async () => {
    const { onAdd } = renderPicker({ selectedIds: new Set(['e1']) })
    await userEvent.click(screen.getByRole('button', { name: /add all/i }))
    expect(onAdd).toHaveBeenCalledTimes(1)
    const added = onAdd.mock.calls[0]?.[0] as ProfileExperience[]
    expect(added).toHaveLength(1)
    expect(added[0]?.id).toBe('e2')
    expect(added[0]).not.toBe(EXPERIENCE[1])
    expect(added[0]).toEqual(EXPERIENCE[1])
  })

  it('renders only the empty hint when the profile section is empty', () => {
    renderPicker({ profileItems: [] })
    expect(
      screen.getByText('Nothing in your profile yet — add items on your Profile page'),
    ).toBeInTheDocument()
    expect(screen.queryByText('From your profile')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add all/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})
