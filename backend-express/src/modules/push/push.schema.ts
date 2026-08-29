import { z } from 'zod'
import { DEVICE_PLATFORMS } from '@/db/schema/device-tokens.js'

// Same shape expo-server-sdk's isExpoPushToken() accepts, minus the dependency.
const EXPO_PUSH_TOKEN = /^Expo(nent)?PushToken\[[^\]\s]+\]$/

export const RegisterDeviceSchema = z.object({
  token: z.string().trim().max(255).regex(EXPO_PUSH_TOKEN, 'Not an Expo push token'),
  platform: z.enum(DEVICE_PLATFORMS),
})

export type RegisterDeviceInput = z.infer<typeof RegisterDeviceSchema>
