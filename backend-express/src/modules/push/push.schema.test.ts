import { describe, it, expect } from 'vitest'
import { RegisterDeviceSchema } from './push.schema.js'

describe('RegisterDeviceSchema', () => {
  it('accepts both Expo token spellings', () => {
    expect(RegisterDeviceSchema.parse({ token: 'ExponentPushToken[abc123]', platform: 'android' }).platform).toBe('android')
    expect(RegisterDeviceSchema.parse({ token: 'ExpoPushToken[abc123]', platform: 'ios' }).token).toBe('ExpoPushToken[abc123]')
  })

  it('trims surrounding whitespace', () => {
    expect(RegisterDeviceSchema.parse({ token: '  ExponentPushToken[x]  ', platform: 'ios' }).token).toBe('ExponentPushToken[x]')
  })

  it('rejects anything that is not an Expo token', () => {
    expect(RegisterDeviceSchema.safeParse({ token: 'fcm-raw-token', platform: 'android' }).success).toBe(false)
    expect(RegisterDeviceSchema.safeParse({ token: 'ExponentPushToken[]', platform: 'android' }).success).toBe(false)
  })

  it('rejects an unknown platform', () => {
    expect(RegisterDeviceSchema.safeParse({ token: 'ExponentPushToken[x]', platform: 'web' }).success).toBe(false)
  })
})
