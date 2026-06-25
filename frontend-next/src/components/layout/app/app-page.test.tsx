import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppPage } from './app-page'

describe('AppPage', () => {
  it('renders its children', () => {
    render(<AppPage>hello-content</AppPage>)
    expect(screen.getByText('hello-content')).toBeInTheDocument()
  })

  it('passes className through', () => {
    render(<AppPage className="custom-class">x</AppPage>)
    expect(screen.getByText('x')).toHaveClass('custom-class')
  })
})
