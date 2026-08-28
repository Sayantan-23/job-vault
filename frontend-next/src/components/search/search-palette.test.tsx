import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchPalette } from './search-palette'
import type { SearchResult } from '@/types/search'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

// Ranked, deliberately interleaved by type: the listbox groups visually but the
// DOM stays in rank order, so arrow traversal follows the ranking.
const RANKED: SearchResult[] = [
  { type: 'job', id: 'j1', title: 'Senior Backend Engineer', subtitle: 'Monzo', snippet: null },
  { type: 'persona', id: 'p1', title: 'Backend generalist', subtitle: null, snippet: null },
  { type: 'job', id: 'j2', title: 'Platform Engineer', subtitle: 'Wise', snippet: null },
]
let results: SearchResult[] = RANKED
let isFetching = false
vi.mock('@/hooks/use-search', () => ({ useSearch: () => ({ data: results, isFetching }) }))

// jsdom gives every element a zero rect; the palette reads the trigger's rect to
// place the morph's origin and skips the chord when the trigger measures zero
// (the mount that is display:none at this breakpoint).
const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect')

beforeEach(() => {
  vi.clearAllMocks()
  results = RANKED
  isFetching = false
  rect.mockReturnValue({
    x: 1200, y: 16, top: 16, left: 1200, right: 1236, bottom: 52, width: 36, height: 36,
    toJSON: () => ({}),
  })
})

afterEach(() => {
  rect.mockReset()
})

async function openAndType(text: string) {
  const user = userEvent.setup()
  render(<SearchPalette />)
  await user.click(screen.getByRole('button', { name: /^search$/i }))
  const input = await screen.findByRole('combobox')
  await user.type(input, text)
  return { user, input }
}

describe('SearchPalette', () => {
  it('opens on Cmd/Ctrl+K', async () => {
    const user = userEvent.setup()
    render(<SearchPalette />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.keyboard('{Meta>}k{/Meta}')

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('ignores the chord when its trigger is not displayed', async () => {
    rect.mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}),
    })
    const user = userEvent.setup()
    render(<SearchPalette />)

    await user.keyboard('{Control>}k{/Control}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('anchors the morph on the clicked trigger', async () => {
    const user = userEvent.setup()
    render(<SearchPalette />)
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    const card = await screen.findByRole('dialog')
    expect(card.style.getPropertyValue('--jv-search-x')).toBe('1218px')
    expect(card.style.getPropertyValue('--jv-search-y')).toBe('16px')
    expect(card.style.getPropertyValue('--jv-search-size')).toBe('36px')
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    render(<SearchPalette />)
    await user.click(screen.getByRole('button', { name: /^search$/i }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('wires the input as a combobox onto the results listbox', async () => {
    const { input } = await openAndType('back')

    expect(input).toHaveAttribute('role', 'combobox')
    const listbox = screen.getByRole('listbox')
    expect(input).toHaveAttribute('aria-controls', listbox.id)
    expect(input).toHaveAttribute('aria-expanded', 'true')
  })

  it('reports the listbox as collapsed until the term is long enough', async () => {
    const user = userEvent.setup()
    render(<SearchPalette />)
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    const input = await screen.findByRole('combobox')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('walks aria-activedescendant through the options with the arrow keys', async () => {
    const { user, input } = await openAndType('back')
    const options = screen.getAllByRole('option')
    const ids = options.map((option) => option.id)
    expect(ids).toHaveLength(3)
    expect(input).toHaveAttribute('aria-activedescendant', ids[0])

    await user.keyboard('{ArrowDown}')
    expect(input).toHaveAttribute('aria-activedescendant', ids[1])
    expect(options[1]).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowUp}')
    expect(input).toHaveAttribute('aria-activedescendant', ids[0])
  })

  it('keeps the options in ranked DOM order even though they are grouped visually', async () => {
    await openAndType('back')

    const titles = screen.getAllByRole('option').map((o) => o.textContent)
    expect(titles[0]).toContain('Senior Backend Engineer')
    expect(titles[1]).toContain('Backend generalist')
    expect(titles[2]).toContain('Platform Engineer')
  })

  it('navigates to the active option on Enter', async () => {
    const { user } = await openAndType('back')

    await user.keyboard('{ArrowDown}{Enter}')

    expect(push).toHaveBeenCalledWith('/app/personas?persona=p1')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('navigates on click', async () => {
    const { user } = await openAndType('back')

    await user.click(screen.getByRole('option', { name: /platform engineer/i }))

    expect(push).toHaveBeenCalledWith('/app/jobs?job=j2')
  })

  it('reports no matches once the search settles empty', async () => {
    results = []
    await openAndType('zzzz')

    expect(await screen.findByText(/no matches/i)).toBeInTheDocument()
  })
})
