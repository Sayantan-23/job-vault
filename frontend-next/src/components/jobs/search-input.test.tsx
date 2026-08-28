import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { SearchInput } from './search-input'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('SearchInput', () => {
  it('debounces input and calls onChange once with the final value', () => {
    const onChange = vi.fn()
    render(<SearchInput value="" onChange={onChange} />)
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'ru' } })
    fireEvent.change(input, { target: { value: 'rust' } })
    expect(onChange).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(300))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('rust')
  })

  it('shows a clear button when non-empty and clears on click', () => {
    const onChange = vi.fn()
    render(<SearchInput value="rust" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /clear search/i }))
    expect(onChange).toHaveBeenCalledWith('')
  })

  // The global search palette owns ⌘K now; this field used to bind it on window,
  // which fired on every page that mounts it.
  it('no longer claims Cmd/Ctrl+K', () => {
    render(<SearchInput value="" onChange={vi.fn()} />)
    const input = screen.getByRole('searchbox')
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(input).not.toHaveFocus()
  })

  it('does not re-emit the stale term after clearing within the debounce window', () => {
    const onChange = vi.fn()
    const { rerender } = render(<SearchInput value="rust" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /clear search/i }))
    expect(onChange).toHaveBeenCalledWith('')
    // The URL/prop catches up to the cleared value while the 300ms debounce of the
    // old term is still pending — the component must NOT restore the old search.
    rerender(<SearchInput value="" onChange={onChange} />)
    act(() => vi.advanceTimersByTime(300))
    expect(onChange).not.toHaveBeenCalledWith('rust')
  })

  it('clears the field and does not re-emit when the value is reset externally (Clear all)', () => {
    const onChange = vi.fn()
    const { rerender } = render(<SearchInput value="rust" onChange={onChange} />)
    // "Clear all" wipes the URL externally — value goes to '' without touching the field.
    rerender(<SearchInput value="" onChange={onChange} />)
    act(() => vi.advanceTimersByTime(300))
    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(onChange).not.toHaveBeenCalledWith('rust')
  })
})
