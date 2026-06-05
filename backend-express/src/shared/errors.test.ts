import { describe, it, expect } from 'vitest'
import { AppError, httpStatusForCode, type AppErrorCode } from './errors.js'

describe('AppError', () => {
  it('captures code and message', () => {
    const err = new AppError('NOT_FOUND', 'job missing')
    expect(err.code).toBe('NOT_FOUND')
    expect(err.message).toBe('job missing')
    expect(err.name).toBe('AppError')
    expect(err).toBeInstanceOf(Error)
  })

  it('preserves the cause', () => {
    const cause = new Error('underlying')
    const err = new AppError('INTERNAL_ERROR', 'wrap', cause)
    expect(err.cause).toBe(cause)
  })
})

describe('httpStatusForCode', () => {
  const cases: Array<[AppErrorCode, number]> = [
    ['NOT_FOUND', 404],
    ['UNAUTHORIZED', 401],
    ['FORBIDDEN', 403],
    ['VALIDATION_ERROR', 400],
    ['CONFLICT', 409],
    ['RATE_LIMITED', 429],
    ['INTERNAL_ERROR', 500],
  ]
  it.each(cases)('maps %s -> %i', (code, status) => {
    expect(httpStatusForCode(code)).toBe(status)
  })
})

describe('AppError SERVICE_UNAVAILABLE', () => {
  it('maps to 503', () => {
    expect(httpStatusForCode('SERVICE_UNAVAILABLE')).toBe(503)
  })
  it('constructs with the code', () => {
    expect(new AppError('SERVICE_UNAVAILABLE', 'off').code).toBe('SERVICE_UNAVAILABLE')
  })
})
