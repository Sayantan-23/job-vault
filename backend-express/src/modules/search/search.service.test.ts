import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./search.repository.js', () => ({ searchRepository: { search: vi.fn() } }))

import { searchRepository } from './search.repository.js'
import { searchService } from './search.service.js'

const repo = vi.mocked(searchRepository)

beforeEach(() => vi.clearAllMocks())

describe('searchService', () => {
  it('short-circuits a term under two characters without touching the repository', async () => {
    expect(await searchService.search('u1', 'a')).toEqual([])
    expect(await searchService.search('u1', '  b  ')).toEqual([])
    expect(repo.search).not.toHaveBeenCalled()
  })

  it('delegates the trimmed term', async () => {
    repo.search.mockResolvedValue([])
    await searchService.search('u1', '  react  ')
    expect(repo.search).toHaveBeenCalledWith('u1', 'react')
  })
})
