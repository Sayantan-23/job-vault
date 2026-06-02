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

// The form collects a confirmation field that the API does not need; the form
// strips it before calling the register mutation.
export const RegisterFormSchema = RegisterSchema.extend({
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((values) => values.password === values.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export type LoginValues = z.infer<typeof LoginSchema>
export type RegisterValues = z.infer<typeof RegisterSchema>
export type RegisterFormValues = z.infer<typeof RegisterFormSchema>
