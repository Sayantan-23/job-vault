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

  it('focuses the input on Cmd/Ctrl+K', () => {
    render(<SearchInput value="" onChange={vi.fn()} />)
    const input = screen.getByRole('searchbox')
    expect(input).not.toHaveFocus()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(input).toHaveFocus()
  })
})
