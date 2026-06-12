import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRevealBelowLg } from './use-reveal-below-lg'

// Object literal type assertions are linted away, so build the stub via a
// typed factory instead.
function mediaQueryList(matches: boolean): MediaQueryList {
  return {
    matches,
    media: '(max-width: 1023px)',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useRevealBelowLg', () => {
  it('scrolls the target into view when the viewport is below lg', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue(mediaQueryList(true))
    const { result } = renderHook(() => useRevealBelowLg<HTMLDivElement>())
    const el = document.createElement('div')
    const scrollIntoView = vi.fn()
    el.scrollIntoView = scrollIntoView
    result.current.ref.current = el

    result.current.reveal()

    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 1023px)')
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('does nothing on lg and up', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue(mediaQueryList(false))
    const { result } = renderHook(() => useRevealBelowLg<HTMLDivElement>())
    const el = document.createElement('div')
    const scrollIntoView = vi.fn()
    el.scrollIntoView = scrollIntoView
    result.current.ref.current = el

    result.current.reveal()

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('tolerates a missing target', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue(mediaQueryList(true))
    const { result } = renderHook(() => useRevealBelowLg<HTMLDivElement>())
    expect(() => result.current.reveal()).not.toThrow()
  })
})
