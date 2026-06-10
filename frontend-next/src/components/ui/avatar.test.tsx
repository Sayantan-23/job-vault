import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MonogramAvatar } from './avatar'

describe('MonogramAvatar', () => {
  it('shows the uppercased first letter of the name', () => {
    render(<MonogramAvatar name="ada lovelace" />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })
  it('falls back to “?” for an empty name', () => {
    render(<MonogramAvatar name="   " />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })
  it('is deterministic: the same name yields the same swatch class', () => {
    const { container: a } = render(<MonogramAvatar name="Grace Hopper" />)
    const { container: b } = render(<MonogramAvatar name="Grace Hopper" />)
    expect(a.firstElementChild?.className).toBe(b.firstElementChild?.className)
  })
})
