import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchPalette } from './search-palette'
import type { SearchResult } from '@/types/search'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

// Ranked, deliberately interleaved by type: the listbox regroups them (jobs
// first — the rank-1 hit is a job — then personas) and traverses that same order.
const RANKED: SearchResult[] = [
  { type: 'job', id: 'j1', title: 'Senior Backend Engineer', subtitle: 'Monzo', snippet: null },
  { type: 'persona', id: 'p1', title: 'Backend generalist', subtitle: null, snippet: null },
  { type: 'job', id: 'j2', title: 'Platform Engineer', subtitle: 'Wise', snippet: null },
]
let results: SearchResult[] = RANKED
let isFetching = false
let settled = true
vi.mock('@/hooks/use-search', () => ({ useSearch: () => ({ data: results, isFetching, settled }) }))

// jsdom gives every element a zero rect; the palette reads the trigger's rect to
// place the morph's origin and skips the chord when the trigger measures zero
// (the mount that is display:none at this breakpoint).
const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect')

beforeEach(() => {
  vi.clearAllMocks()
  results = RANKED
  isFetching = false
  settled = true
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

  // Both mounts (desktop cluster + mobile header) are always in the tree; only
  // one is displayed per width, and a display:none trigger measures zero.
  it('opens exactly one card on the chord when it is mounted twice', async () => {
    const user = userEvent.setup()
    render(
      <>
        <SearchPalette />
        <SearchPalette />
      </>,
    )
    // Second mount = the one that is display:none at this width.
    screen.getAllByRole('button', { name: /^search$/i }).forEach((trigger, index) => {
      if (index === 0) return
      trigger.getBoundingClientRect = () => ({
        x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0,
        toJSON: () => ({}),
      })
    })

    await user.keyboard('{Meta>}k{/Meta}')

    // Radix marks the rest of the tree aria-hidden once a modal opens, so count
    // the raw DOM rather than the accessibility tree.
    const cards = document.querySelectorAll<HTMLElement>('[role="dialog"]')
    expect(cards).toHaveLength(1)
    expect(cards[0]?.style.getPropertyValue('--jv-search-x')).toBe('1218px')
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

  it('orders the groups by their best-ranked member, rows inside a group by rank', async () => {
    await openAndType('back')

    // Every child of the listbox, in document order — nothing carries a CSS
    // `order`, so document order IS the visible top-to-bottom order.
    const rows = [...screen.getByRole('listbox').children] as HTMLElement[]
    expect(rows.map((row) => row.textContent)).toEqual([
      'Jobs',
      expect.stringContaining('Senior Backend Engineer'),
      expect.stringContaining('Platform Engineer'),
      'Personas',
      expect.stringContaining('Backend generalist'),
    ])
    for (const row of rows) expect(row.style.order).toBe('')
  })

  it('walks the options in the order they are rendered, not in flat rank order', async () => {
    const { user, input } = await openAndType('back')
    const titles = screen.getAllByRole('option').map((option) => option.textContent)

    // Rank order is job/persona/job; the rendered order is job/job/persona, and
    // the highlight must follow the rendered one rather than hopping groups.
    for (const [index, title] of titles.entries()) {
      if (index > 0) await user.keyboard('{ArrowDown}')
      const activeId = input.getAttribute('aria-activedescendant')
      expect(document.getElementById(activeId ?? '')).toHaveTextContent(title ?? '')
    }
  })

  it('navigates to the active option on Enter', async () => {
    const { user } = await openAndType('back')

    // Third option top-to-bottom: the persona under its own group heading.
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

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

  // The debounced query trails the typed term by 300ms, so `data` is the previous
  // term's answer. Claiming "no matches" for a term that was never sent is a lie
  // the user reads for a third of a second before the request even fires.
  it('withholds the empty state while the typed term is still unsearched', async () => {
    results = []
    settled = false
    await openAndType('react')

    expect(screen.queryByText(/no matches/i)).not.toBeInTheDocument()
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('keeps the combobox pointed at a real listbox while the popup is empty', async () => {
    results = []
    await openAndType('zzzz')

    const listbox = screen.getByRole('listbox')
    const input = screen.getByRole('combobox')
    // aria-controls must resolve: an IDREF to a listbox that only exists once
    // there are hits is a dangling reference for the whole loading/empty state.
    expect(document.getElementById(listbox.id)).toBe(listbox)
    expect(input).toHaveAttribute('aria-controls', listbox.id)
    // The popup is on screen, so aria-expanded may not say otherwise.
    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(input).not.toHaveAttribute('aria-activedescendant')
  })

  // The 240px rail offsets the content column from the viewport, so a card
  // centred with `left: 50%` sits ~120px left of the column at 1440 and overlaps
  // the nav at 1024. The column is measured, never assumed.
  it('centres the card on the content column the trigger sits in', async () => {
    const user = userEvent.setup()
    render(
      <div data-testid="col" className="jv-content-col">
        <SearchPalette />
      </div>,
    )
    screen.getByTestId('col').getBoundingClientRect = () => ({
      x: 240, y: 0, top: 0, left: 240, right: 1440, bottom: 900, width: 1200, height: 900,
      toJSON: () => ({}),
    })
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    const card = await screen.findByRole('dialog')
    expect(card.style.getPropertyValue('--jv-search-cx')).toBe('840px')
  })

  it('leaves the centre to the viewport when there is no content column', async () => {
    const user = userEvent.setup()
    render(<SearchPalette />)
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    // Unset, so the stylesheet's own `50%` fallback applies — correct for the
    // mobile header, which is not inside a content column.
    const card = await screen.findByRole('dialog')
    expect(card.style.getPropertyValue('--jv-search-cx')).toBe('')
  })
})
