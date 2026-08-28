import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { verifyKey, checkUrl, quickCreate, listAnswers, markAnswerUsed, ApiError } from './api'

let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

function jsonRes(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(body),
  }
}

const SERVER = 'http://localhost:3100'

describe('extension api', () => {
  it('verifyKey POSTs with the X-API-Key header and unwraps data', async () => {
    fetchMock.mockResolvedValue(jsonRes(200, { data: { ok: true, user: { email: 'a@b.co' } } }))
    expect(await verifyKey(SERVER, 'jv_x')).toEqual({ ok: true, user: { email: 'a@b.co' } })
    expect(fetchMock).toHaveBeenCalledWith(
      `${SERVER}/api/extension/verify-key`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-API-Key': 'jv_x' }),
      }),
    )
  })

  it('checkUrl encodes the url query', async () => {
    fetchMock.mockResolvedValue(jsonRes(200, { data: { isDuplicate: false } }))
    await checkUrl(SERVER, 'jv_x', 'https://x.com/a?b=1')
    expect(fetchMock).toHaveBeenCalledWith(
      `${SERVER}/api/extension/check-url?url=${encodeURIComponent('https://x.com/a?b=1')}`,
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('quickCreate POSTs the job fields', async () => {
    fetchMock.mockResolvedValue(
      jsonRes(201, { data: { id: 'j1', title: 'T', company: 'C', status: 'WISHLIST', isDuplicate: false } }),
    )
    const out = await quickCreate(SERVER, 'jv_x', {
      title: 'T',
      company: 'C',
      sourceUrl: 'https://x.com/j',
      description: 'd',
    })
    expect(out.id).toBe('j1')
    expect(fetchMock).toHaveBeenCalledWith(
      `${SERVER}/api/extension/jobs`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'T', company: 'C', sourceUrl: 'https://x.com/j', description: 'd' }),
      }),
    )
  })

  it('listAnswers GETs the answers list and unwraps data', async () => {
    fetchMock.mockResolvedValue(
      jsonRes(200, {
        data: [{ id: '1', question: 'Why us?', answerShort: 'a', answerLong: null, lastUsedAt: null }],
      }),
    )
    const answers = await listAnswers(SERVER, 'jv_x')
    expect(answers).toHaveLength(1)
    expect(answers[0]?.question).toBe('Why us?')
    expect(fetchMock).toHaveBeenCalledWith(
      `${SERVER}/api/extension/answers`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ 'X-API-Key': 'jv_x' }),
      }),
    )
  })

  it('markAnswerUsed POSTs to the used endpoint', async () => {
    fetchMock.mockResolvedValue(jsonRes(200, { data: { id: '1', lastUsedAt: '2026-08-27T00:00:00Z' } }))
    await markAnswerUsed(SERVER, 'jv_x', '1')
    expect(fetchMock).toHaveBeenCalledWith(
      `${SERVER}/api/extension/answers/1/used`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('throws ApiError with the server message on a non-ok response', async () => {
    fetchMock.mockResolvedValue(jsonRes(401, { message: 'Invalid API key' }))
    await expect(verifyKey(SERVER, 'bad')).rejects.toBeInstanceOf(ApiError)
    fetchMock.mockResolvedValue(jsonRes(401, { message: 'Invalid API key' }))
    await expect(verifyKey(SERVER, 'bad')).rejects.toMatchObject({ status: 401, message: 'Invalid API key' })
  })
})
