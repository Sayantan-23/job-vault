import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppPage } from './app-page'

describe('AppPage', () => {
  it('renders its children', () => {
    render(<AppPage>hello-content</AppPage>)
    expect(screen.getByText('hello-content')).toBeInTheDocument()
  })

  it('defaults to the readable (max-w-3xl) column', () => {
    render(<AppPage>x</AppPage>)
    expect(screen.getByText('x')).toHaveClass('max-w-3xl')
  })

  it('widens to max-w-5xl for the wide variant and removes the cap for full', () => {
    const { rerender } = render(<AppPage width="wide">x</AppPage>)
    expect(screen.getByText('x')).toHaveClass('max-w-5xl')
    rerender(<AppPage width="full">x</AppPage>)
    expect(screen.getByText('x')).toHaveClass('max-w-none')
  })
})
