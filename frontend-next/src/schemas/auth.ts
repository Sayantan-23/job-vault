import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export const RegisterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters').max(72),
})

export type LoginValues = z.infer<typeof LoginSchema>
export type RegisterValues = z.infer<typeof RegisterSchema>
